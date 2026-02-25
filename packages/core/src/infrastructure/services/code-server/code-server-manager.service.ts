/**
 * Code Server Manager Service
 *
 * Infrastructure service for managing code-server (VS Code in the browser) instance lifecycle.
 * Implements ICodeServerManagerService output port.
 *
 * Handles: process spawning (detached), port allocation, SQLite state persistence,
 * graceful shutdown (SIGTERM → SIGKILL), PID liveness checks, and startup reconciliation.
 */

import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

import type {
  ICodeServerManagerService,
  CodeServerStartResult,
} from '../../../application/ports/output/services/code-server-manager-service.interface.js';
import type { CodeServerInstance } from '../../../domain/generated/output.js';
import { CodeServerInstanceStatus } from '../../../domain/generated/output.js';
import {
  toDatabase,
  fromDatabase,
  type CodeServerInstanceRow,
} from '../../persistence/sqlite/mappers/code-server-instance.mapper.js';
import { findAvailablePort } from '../port.service.js';
import { getShepHomeDir } from '../filesystem/shep-directory.service.js';

/** Default port range start for code-server instances */
const CODE_SERVER_PORT_START = 13370;

/** Default idle timeout in seconds (30 minutes) */
const DEFAULT_IDLE_TIMEOUT_SECONDS = 1800;

/** Maximum time in ms to wait for graceful shutdown before SIGKILL */
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 5000;

/** Maximum concurrent instances before logging a warning */
const MAX_INSTANCES_BEFORE_WARNING = 5;

export class CodeServerManagerService implements ICodeServerManagerService {
  constructor(private readonly db: Database.Database) {}

  async start(featureId: string, worktreePath: string): Promise<CodeServerStartResult> {
    // Idempotent: check for existing running instance
    const existing = await this.getStatus(featureId);
    if (existing?.status === CodeServerInstanceStatus.Running) {
      return {
        url: `http://127.0.0.1:${existing.port}`,
        port: existing.port,
        pid: existing.pid,
        featureId: existing.featureId,
      };
    }

    // Remove any stale/stopped instance record for this feature before inserting
    this.db.prepare('DELETE FROM code_server_instances WHERE feature_id = ?').run(featureId);

    // Allocate an available port
    const port = await findAvailablePort(CODE_SERVER_PORT_START);

    // Read idle timeout from settings
    const idleTimeoutSeconds = this.readIdleTimeout();

    // Build code-server arguments
    const shepHome = getShepHomeDir();
    const userDataDir = join(shepHome, 'code-server', 'user-data', featureId);
    const extensionsDir = join(shepHome, 'code-server', 'extensions');
    const logDir = join(shepHome, 'logs');

    // Ensure directories exist
    await mkdir(userDataDir, { recursive: true });
    await mkdir(extensionsDir, { recursive: true });
    await mkdir(logDir, { recursive: true });

    const args = [
      '--bind-addr',
      `127.0.0.1:${port}`,
      '--auth',
      'none',
      '--user-data-dir',
      userDataDir,
      '--extensions-dir',
      extensionsDir,
      '--idle-timeout',
      String(idleTimeoutSeconds),
      worktreePath,
    ];

    // Open log file for stdout/stderr
    const logPath = join(logDir, `code-server-${featureId}.log`);
    const logStream = createWriteStream(logPath, { flags: 'a' });

    // Spawn code-server as a detached process
    const child = spawn('code-server', args, {
      detached: true,
      stdio: ['ignore', logStream, logStream],
    });
    child.unref();

    const pid = child.pid;
    if (!pid) {
      throw new Error('Failed to spawn code-server process: no PID returned');
    }

    // Persist instance state to SQLite
    const id = randomUUID();
    const now = new Date();
    const instance: CodeServerInstance = {
      id,
      featureId,
      pid,
      port,
      worktreePath,
      status: CodeServerInstanceStatus.Running,
      startedAt: now,
    };

    const row = toDatabase(instance);
    this.db
      .prepare(
        `
      INSERT INTO code_server_instances (
        id, feature_id, pid, port, worktree_path, status,
        started_at, stopped_at, created_at, updated_at
      ) VALUES (
        @id, @feature_id, @pid, @port, @worktree_path, @status,
        @started_at, @stopped_at, @created_at, @updated_at
      )
    `
      )
      .run(row);

    // Log warning if too many instances are running
    const running = await this.listRunning();
    if (running.length > MAX_INSTANCES_BEFORE_WARNING) {
      // eslint-disable-next-line no-console
      console.warn(
        `[code-server] ${running.length} instances are running simultaneously. ` +
          `Each instance uses 300-500MB RAM. Consider stopping unused instances.`
      );
    }

    return {
      url: `http://127.0.0.1:${port}`,
      port,
      pid,
      featureId,
    };
  }

  async stop(featureId: string): Promise<void> {
    const instance = this.findRunningInstance(featureId);
    if (!instance) return;

    const { pid } = instance;

    // Try graceful shutdown with SIGTERM
    if (this.isAlive(pid)) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        // Process may have already exited
      }

      // Wait up to 5 seconds for graceful shutdown
      const dead = await this.waitForExit(pid, GRACEFUL_SHUTDOWN_TIMEOUT_MS);

      // Force kill if still alive
      if (!dead) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // Process may have exited between check and kill
        }
      }
    }

    // Update SQLite record
    this.markStopped(instance.id);
  }

  async getStatus(featureId: string): Promise<CodeServerInstance | null> {
    const row = this.db
      .prepare(
        'SELECT * FROM code_server_instances WHERE feature_id = ? ORDER BY created_at DESC LIMIT 1'
      )
      .get(featureId) as CodeServerInstanceRow | undefined;

    if (!row) return null;

    const instance = fromDatabase(row);

    // Auto-reconcile: if persisted as "running" but PID is dead, update to "stopped"
    if (instance.status === CodeServerInstanceStatus.Running && !this.isAlive(instance.pid)) {
      this.markStopped(instance.id);
      return {
        ...instance,
        status: CodeServerInstanceStatus.Stopped,
        stoppedAt: new Date(),
      };
    }

    return instance;
  }

  async listRunning(): Promise<CodeServerInstance[]> {
    const rows = this.db
      .prepare('SELECT * FROM code_server_instances WHERE status = ?')
      .all(CodeServerInstanceStatus.Running) as CodeServerInstanceRow[];

    return rows.map(fromDatabase);
  }

  async stopAll(): Promise<void> {
    const running = await this.listRunning();
    for (const instance of running) {
      try {
        await this.stop(instance.featureId);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          `[code-server] Failed to stop instance for feature ${instance.featureId}:`,
          error
        );
      }
    }
  }

  async reconcile(): Promise<void> {
    const running = await this.listRunning();
    let stoppedCount = 0;

    for (const instance of running) {
      if (!this.isAlive(instance.pid)) {
        this.markStopped(instance.id);
        stoppedCount++;
      }
    }

    if (running.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `[code-server] Reconciliation: checked ${running.length} instance(s), ` +
          `marked ${stoppedCount} as stopped`
      );
    }
  }

  /**
   * Check whether a process with the given PID is alive.
   */
  private isAlive(pid: number): boolean {
    if (!Number.isFinite(pid) || !Number.isInteger(pid) || pid <= 0) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find a running instance by feature ID from SQLite.
   */
  private findRunningInstance(featureId: string): CodeServerInstance | null {
    const row = this.db
      .prepare('SELECT * FROM code_server_instances WHERE feature_id = ? AND status = ? LIMIT 1')
      .get(featureId, CodeServerInstanceStatus.Running) as CodeServerInstanceRow | undefined;

    return row ? fromDatabase(row) : null;
  }

  /**
   * Mark an instance as stopped in SQLite.
   */
  private markStopped(id: string): void {
    this.db
      .prepare(
        'UPDATE code_server_instances SET status = ?, stopped_at = ?, updated_at = ? WHERE id = ?'
      )
      .run(CodeServerInstanceStatus.Stopped, new Date().toISOString(), Date.now(), id);
  }

  /**
   * Read the idle timeout setting from the settings table.
   * Falls back to the default if settings are not initialized.
   */
  private readIdleTimeout(): number {
    try {
      const row = this.db.prepare('SELECT cs_idle_timeout_seconds FROM settings LIMIT 1').get() as
        | { cs_idle_timeout_seconds: number }
        | undefined;
      return row?.cs_idle_timeout_seconds ?? DEFAULT_IDLE_TIMEOUT_SECONDS;
    } catch {
      return DEFAULT_IDLE_TIMEOUT_SECONDS;
    }
  }

  /**
   * Wait for a process to exit, checking periodically.
   * Returns true if the process exited within the timeout, false otherwise.
   */
  private waitForExit(pid: number, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const interval = 100;
      let elapsed = 0;

      const check = () => {
        if (!this.isAlive(pid)) {
          resolve(true);
          return;
        }
        elapsed += interval;
        if (elapsed >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(check, interval);
      };

      check();
    });
  }
}
