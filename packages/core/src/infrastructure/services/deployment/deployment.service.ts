/**
 * Deployment Service
 *
 * Infrastructure service that manages local dev server deployments.
 * Holds an in-memory Map of active deployments keyed by targetId.
 * Handles process spawning, stdout-based port detection, and graceful
 * shutdown (SIGTERM → poll → SIGKILL).
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { DeploymentState } from '@/domain/generated/output.js';
import type {
  IDeploymentService,
  DeploymentStatus,
} from '@/application/ports/output/services/deployment-service.interface.js';
import { detectDevScript } from './detect-dev-script.js';
import { parsePort } from './parse-port.js';

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

  constructor(deps: Partial<DeploymentServiceDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps };
  }

  /**
   * Start a deployment for the given target.
   * If a deployment already exists for this target, it is stopped first.
   */
  start(targetId: string, targetPath: string): void {
    // Stop any existing deployment for this target
    const existing = this.deployments.get(targetId);
    if (existing) {
      this.killProcess(existing);
      this.deployments.delete(targetId);
    }

    // Detect the dev script
    const detection = this.deps.detectDevScript(targetPath);
    if (!detection.success) {
      throw new Error(detection.error);
    }

    // Build spawn args based on package manager
    const { packageManager, scriptName } = detection;
    const args = packageManager === 'npm' ? ['run', scriptName] : [scriptName];

    const child = this.deps.spawn(packageManager, args, {
      shell: true,
      cwd: targetPath,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'] as const,
    });

    if (!child.pid) {
      throw new Error('Failed to spawn dev server: no PID returned');
    }

    const entry: DeploymentEntry = {
      pid: child.pid,
      child: child as ChildProcess,
      state: DeploymentState.Booting,
      url: null,
      targetId,
      stdoutBuffer: '',
      stderrBuffer: '',
    };

    this.deployments.set(targetId, entry);

    // Attach stdout/stderr listeners for port detection
    this.attachOutputListener(entry, 'stdout');
    this.attachOutputListener(entry, 'stderr');

    // Clean up on process exit
    (child as ChildProcess).on('exit', () => {
      this.deployments.delete(targetId);
    });
  }

  /**
   * Get the current deployment status for a target.
   * Returns null if no deployment exists for this target.
   */
  getStatus(targetId: string): DeploymentStatus | null {
    const entry = this.deployments.get(targetId);
    if (!entry) return null;
    return { state: entry.state, url: entry.url };
  }

  /**
   * Stop a deployment gracefully: SIGTERM → poll → SIGKILL.
   */
  async stop(targetId: string): Promise<void> {
    const entry = this.deployments.get(targetId);
    if (!entry) return;

    // Send SIGTERM to process group
    try {
      this.deps.kill(-entry.pid, 'SIGTERM');
    } catch {
      // Process may already be dead
      this.deployments.delete(targetId);
      return;
    }

    // Wait for the process to exit
    const died = await this.pollUntilDead(entry.pid, MAX_WAIT_MS, POLL_INTERVAL_MS);

    if (!died) {
      // Escalate to SIGKILL
      try {
        this.deps.kill(-entry.pid, 'SIGKILL');
      } catch {
        // Process may have exited between check and kill
      }
    }

    // Wait for the exit event to clean up the map
    await this.waitForExit(entry.child);
  }

  /**
   * Force-stop all tracked deployments immediately (for daemon shutdown).
   */
  stopAll(): void {
    for (const entry of this.deployments.values()) {
      this.killProcess(entry);
    }
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
   * Attach a line-buffered listener on stdout or stderr that calls parsePort.
   */
  private attachOutputListener(entry: DeploymentEntry, stream: 'stdout' | 'stderr'): void {
    const bufferKey = stream === 'stdout' ? 'stdoutBuffer' : 'stderrBuffer';
    const childStream = entry.child[stream];
    if (!childStream) return;

    childStream.on('data', (chunk: Buffer) => {
      // Append chunk to buffer
      entry[bufferKey] += chunk.toString();

      // Process complete lines
      const lines = entry[bufferKey].split('\n');
      // Keep the last element (incomplete line) in the buffer
      entry[bufferKey] = lines.pop() ?? '';

      for (const line of lines) {
        if (entry.state !== DeploymentState.Booting) break;
        const url = parsePort(line);
        if (url) {
          entry.state = DeploymentState.Ready;
          entry.url = url;
          break;
        }
      }
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
