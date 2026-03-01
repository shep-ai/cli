/**
 * Deployment Service
 *
 * Infrastructure service that manages local dev server deployments.
 * Holds an in-memory Map of active deployments keyed by targetId.
 * Handles process spawning, stdout-based port detection, and graceful
 * shutdown (SIGTERM → poll → SIGKILL).
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { DeploymentState } from '@/domain/generated/output.js';
import type {
  IDeploymentService,
  DeploymentStatus,
  LogEntry,
} from '@/application/ports/output/services/deployment-service.interface.js';
import { detectDevScript } from './detect-dev-script.js';
import { createDeploymentLogger } from './deployment-logger.js';
import { parsePort } from './parse-port.js';
import { LogRingBuffer } from './log-ring-buffer.js';

const log = createDeploymentLogger('[DeploymentService]');
const POLL_INTERVAL_MS = 200;
const MAX_WAIT_MS = 5000;

interface DeploymentEntry {
  pid: number;
  child: ChildProcess;
  state: DeploymentState;
  url: string | null;
  targetId: string;
  stdoutBuffer: string;
  stderrBuffer: string;
  logs: LogRingBuffer;
}

export interface DeploymentServiceDeps {
  spawn: typeof spawn;
  detectDevScript: typeof detectDevScript;
  kill: (pid: number, signal: NodeJS.Signals | string) => void;
  isAlive: (pid: number) => boolean;
}

const defaultDeps: DeploymentServiceDeps = {
  spawn,
  detectDevScript,
  kill: (pid, signal) => process.kill(pid, signal as NodeJS.Signals),
  isAlive: (pid: number) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  },
};

export class DeploymentService implements IDeploymentService {
  private readonly deployments = new Map<string, DeploymentEntry>();
  private readonly deps: DeploymentServiceDeps;
  private readonly emitter = new EventEmitter();

  constructor(deps: Partial<DeploymentServiceDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps };
  }

  /**
   * Start a deployment for the given target.
   * If a deployment already exists for this target, it is stopped first.
   */
  start(targetId: string, targetPath: string): void {
    log.info(`start() called — targetId="${targetId}", targetPath="${targetPath}"`);

    // Stop any existing deployment for this target
    const existing = this.deployments.get(targetId);
    if (existing) {
      log.info(`Stopping existing deployment for "${targetId}" (pid=${existing.pid})`);
      this.killProcess(existing);
      this.deployments.delete(targetId);
    }

    // Detect the dev script
    const detection = this.deps.detectDevScript(targetPath);
    if (!detection.success) {
      log.error(`Dev script detection failed: ${detection.error}`);
      throw new Error(detection.error);
    }

    // Build spawn args based on package manager
    const { packageManager, scriptName, command } = detection;
    const args = packageManager === 'npm' ? ['run', scriptName] : [scriptName];

    log.info(
      `Spawning dev server: command="${command}", packageManager="${packageManager}", scriptName="${scriptName}", cwd="${targetPath}"`
    );

    const child = this.deps.spawn(packageManager, args, {
      shell: true,
      cwd: targetPath,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'] as const,
    });

    if (!child.pid) {
      log.error('spawn() returned no PID — process failed to start');
      throw new Error('Failed to spawn dev server: no PID returned');
    }

    log.info(`Process spawned — pid=${child.pid}`);

    const entry: DeploymentEntry = {
      pid: child.pid,
      child: child as ChildProcess,
      state: DeploymentState.Booting,
      url: null,
      targetId,
      stdoutBuffer: '',
      stderrBuffer: '',
      logs: new LogRingBuffer(),
    };

    this.deployments.set(targetId, entry);

    // Attach stdout/stderr listeners for port detection
    this.attachOutputListener(entry, 'stdout');
    this.attachOutputListener(entry, 'stderr');

    // Handle spawn errors (command not found, permission denied, etc.)
    (child as ChildProcess).on('error', (err) => {
      log.error(`Child process error for "${targetId}" (pid=${entry.pid}): ${err.message}`);
      entry.state = DeploymentState.Stopped;
      this.deployments.delete(targetId);
    });

    // Clean up on process exit
    (child as ChildProcess).on('exit', (code, signal) => {
      const wasBooting = entry.state === DeploymentState.Booting;
      log.info(
        `Process exited for "${targetId}" (pid=${entry.pid}) — code=${code}, signal=${signal}, wasBooting=${wasBooting}`
      );
      if (wasBooting) {
        log.warn(
          'Process exited while still in Booting state — dev server likely crashed on startup. Check stderr output above.'
        );
      }
      this.deployments.delete(targetId);
    });
  }

  /**
   * Get the current deployment status for a target.
   * Returns null if no deployment exists for this target.
   */
  getStatus(targetId: string): DeploymentStatus | null {
    const entry = this.deployments.get(targetId);
    if (!entry) {
      log.debug(`getStatus("${targetId}") — no deployment found`);
      return null;
    }
    log.debug(
      `getStatus("${targetId}") — state=${entry.state}, url=${entry.url}, pid=${entry.pid}`
    );
    return { state: entry.state, url: entry.url };
  }

  /**
   * Stop a deployment gracefully: SIGTERM → poll → SIGKILL.
   */
  async stop(targetId: string): Promise<void> {
    const entry = this.deployments.get(targetId);
    if (!entry) {
      log.info(`stop("${targetId}") — no deployment found, nothing to stop`);
      return;
    }

    log.info(`stop("${targetId}") — sending SIGTERM to process group (pid=${entry.pid})`);

    entry.logs.clear();

    // Send SIGTERM to process group
    try {
      this.deps.kill(-entry.pid, 'SIGTERM');
    } catch {
      log.info(`stop("${targetId}") — process already dead on SIGTERM`);
      this.deployments.delete(targetId);
      return;
    }

    // Wait for the process to exit
    const died = await this.pollUntilDead(entry.pid, MAX_WAIT_MS, POLL_INTERVAL_MS);

    if (!died) {
      log.warn(
        `stop("${targetId}") — process did not exit after ${MAX_WAIT_MS}ms, escalating to SIGKILL`
      );
      // Escalate to SIGKILL
      try {
        this.deps.kill(-entry.pid, 'SIGKILL');
      } catch {
        // Process may have exited between check and kill
      }
    } else {
      log.info(`stop("${targetId}") — process exited gracefully`);
    }

    // Wait for the exit event to clean up the map
    await this.waitForExit(entry.child);
  }

  /**
   * Force-stop all tracked deployments immediately (for daemon shutdown).
   */
  stopAll(): void {
    for (const entry of this.deployments.values()) {
      entry.logs.clear();
      this.killProcess(entry);
    }
  }

  /**
   * Get the accumulated log buffer for a deployment.
   */
  getLogs(targetId: string): LogEntry[] | null {
    const entry = this.deployments.get(targetId);
    if (!entry) return null;
    return entry.logs.getAll();
  }

  /**
   * Subscribe to real-time log events.
   */
  on(event: 'log', handler: (entry: LogEntry) => void): void {
    this.emitter.on(event, handler);
  }

  /**
   * Unsubscribe from real-time log events.
   */
  off(event: 'log', handler: (entry: LogEntry) => void): void {
    this.emitter.off(event, handler);
  }

  /**
   * Send SIGKILL to a process group.
   */
  private killProcess(entry: DeploymentEntry): void {
    try {
      this.deps.kill(-entry.pid, 'SIGKILL');
    } catch {
      // Process may already be dead
    }
  }

  /**
   * Attach a line-buffered listener on stdout or stderr that calls parsePort
   * and accumulates log entries.
   */
  private attachOutputListener(entry: DeploymentEntry, stream: 'stdout' | 'stderr'): void {
    const bufferKey = stream === 'stdout' ? 'stdoutBuffer' : 'stderrBuffer';
    const childStream = entry.child[stream];
    if (!childStream) {
      log.warn(`[${entry.targetId}] No ${stream} stream available — cannot attach listener`);
      return;
    }

    childStream.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      // Append chunk to buffer
      entry[bufferKey] += text;

      // Process complete lines
      const lines = entry[bufferKey].split('\n');
      // Keep the last element (incomplete line) in the buffer
      entry[bufferKey] = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        log.debug(`[${entry.targetId}] ${stream}: ${line}`);

        // Accumulate in log buffer and emit event
        const logEntry: LogEntry = {
          targetId: entry.targetId,
          stream,
          line,
          timestamp: Date.now(),
        };
        entry.logs.push(logEntry);
        this.emitter.emit('log', logEntry);

        // Port detection (only while Booting)
        if (entry.state === DeploymentState.Booting) {
          const url = parsePort(line);
          if (url) {
            log.info(`[${entry.targetId}] Port detected — url="${url}" (from ${stream})`);
            entry.state = DeploymentState.Ready;
            entry.url = url;
          }
        }
      }
    });

    childStream.on('end', () => {
      // Flush remaining buffer content
      const remaining = entry[bufferKey].trim();
      if (remaining) {
        log.debug(`[${entry.targetId}] ${stream} (flush): ${remaining}`);
        if (entry.state === DeploymentState.Booting) {
          const url = parsePort(remaining);
          if (url) {
            log.info(`[${entry.targetId}] Port detected in flushed buffer — url="${url}"`);
            entry.state = DeploymentState.Ready;
            entry.url = url;
          }
        }
        entry[bufferKey] = '';
      }
      log.debug(`[${entry.targetId}] ${stream} stream ended`);
    });
  }

  /**
   * Poll until a process is dead or timeout expires.
   */
  private async pollUntilDead(pid: number, maxMs: number, intervalMs: number): Promise<boolean> {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      if (!this.deps.isAlive(pid)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Wait for a child process to emit 'exit', with a short timeout.
   */
  private waitForExit(child: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(), 1000);
      child.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
}
