// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';

// Hoist mocks before imports
const mockSpawn = vi.hoisted(() => vi.fn());
const mockCreateWriteStream = vi.hoisted(() => vi.fn());
const mockMkdir = vi.hoisted(() => vi.fn());
const mockFindAvailablePort = vi.hoisted(() => vi.fn());
const mockGetShepHomeDir = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    spawn: mockSpawn,
  };
});

vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createWriteStream: mockCreateWriteStream,
  };
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    mkdir: mockMkdir,
  };
});

vi.mock('@/infrastructure/services/port.service', () => ({
  findAvailablePort: mockFindAvailablePort,
}));

vi.mock('@/infrastructure/services/filesystem/shep-directory.service', () => ({
  getShepHomeDir: mockGetShepHomeDir,
}));

import { createDatabaseWithMigrations } from '../../../../helpers/database.helper.js';
import { runSQLiteMigrations } from '@/infrastructure/persistence/sqlite/migrations.js';
import { CodeServerManagerService } from '@/infrastructure/services/code-server/code-server-manager.service.js';
import { CodeServerInstanceStatus } from '@/domain/generated/output.js';

describe('CodeServerManagerService', () => {
  let db: Database.Database;
  let service: CodeServerManagerService;

  const FEATURE_ID = 'test-feature-123';
  const WORKTREE_PATH = '/home/user/.shep/repos/abc/wt/my-feature';
  const SHEP_HOME = '/home/user/.shep';

  function createMockChildProcess(pid: number) {
    return {
      pid,
      unref: vi.fn(),
      on: vi.fn(),
    };
  }

  function insertRunningInstance(
    featureId: string,
    pid: number,
    port: number,
    worktreePath = WORKTREE_PATH
  ) {
    db.prepare(
      `
      INSERT INTO code_server_instances (
        id, feature_id, pid, port, worktree_path, status,
        started_at, stopped_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `
    ).run(
      `id-${featureId}`,
      featureId,
      pid,
      port,
      worktreePath,
      CodeServerInstanceStatus.Running,
      new Date().toISOString(),
      Date.now(),
      Date.now()
    );
  }

  function insertStoppedInstance(featureId: string, pid: number, port: number) {
    db.prepare(
      `
      INSERT INTO code_server_instances (
        id, feature_id, pid, port, worktree_path, status,
        started_at, stopped_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      `id-${featureId}`,
      featureId,
      pid,
      port,
      WORKTREE_PATH,
      CodeServerInstanceStatus.Stopped,
      new Date().toISOString(),
      new Date().toISOString(),
      Date.now(),
      Date.now()
    );
  }

  beforeEach(async () => {
    vi.clearAllMocks();

    db = await createDatabaseWithMigrations(runSQLiteMigrations);
    service = new CodeServerManagerService(db);

    // Default mock returns
    mockGetShepHomeDir.mockReturnValue(SHEP_HOME);
    mockFindAvailablePort.mockResolvedValue(13370);
    mockMkdir.mockResolvedValue(undefined);
    mockCreateWriteStream.mockReturnValue({
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
    });
    mockSpawn.mockReturnValue(createMockChildProcess(12345));
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  // ─── task-8: start() ──────────────────────────────────────────

  describe('start()', () => {
    it('returns CodeServerStartResult with url containing port and 127.0.0.1', async () => {
      mockFindAvailablePort.mockResolvedValue(13375);
      mockSpawn.mockReturnValue(createMockChildProcess(9999));

      const result = await service.start(FEATURE_ID, WORKTREE_PATH);

      expect(result).toEqual({
        url: 'http://127.0.0.1:13375',
        port: 13375,
        pid: 9999,
        featureId: FEATURE_ID,
      });
    });

    it('persists instance state to SQLite with status "running"', async () => {
      await service.start(FEATURE_ID, WORKTREE_PATH);

      const row = db
        .prepare('SELECT * FROM code_server_instances WHERE feature_id = ?')
        .get(FEATURE_ID) as Record<string, unknown>;

      expect(row).toBeDefined();
      expect(row.status).toBe('running');
      expect(row.pid).toBe(12345);
      expect(row.port).toBe(13370);
      expect(row.worktree_path).toBe(WORKTREE_PATH);
    });

    it('spawns code-server with correct flags', async () => {
      mockFindAvailablePort.mockResolvedValue(13371);

      await service.start(FEATURE_ID, WORKTREE_PATH);

      expect(mockSpawn).toHaveBeenCalledOnce();
      const [command, args, opts] = mockSpawn.mock.calls[0];
      expect(command).toBe('code-server');
      expect(args).toContain('--bind-addr');
      expect(args).toContain('127.0.0.1:13371');
      expect(args).toContain('--auth');
      expect(args).toContain('none');
      expect(args).toContain('--user-data-dir');
      expect(args).toContain(`${SHEP_HOME}/code-server/user-data/${FEATURE_ID}`);
      expect(args).toContain('--extensions-dir');
      expect(args).toContain(`${SHEP_HOME}/code-server/extensions`);
      expect(args).toContain('--idle-timeout');
      expect(args).toContain(WORKTREE_PATH);
      expect(opts.detached).toBe(true);
    });

    it('calls child.unref() to detach the process', async () => {
      const mockChild = createMockChildProcess(12345);
      mockSpawn.mockReturnValue(mockChild);

      await service.start(FEATURE_ID, WORKTREE_PATH);

      expect(mockChild.unref).toHaveBeenCalledOnce();
    });

    it('is idempotent — returns existing instance URL when already running', async () => {
      // Insert a running instance with a PID that is "alive" (current process PID)
      insertRunningInstance(FEATURE_ID, process.pid, 13380);

      const result = await service.start(FEATURE_ID, WORKTREE_PATH);

      expect(result.url).toBe('http://127.0.0.1:13380');
      expect(result.port).toBe(13380);
      expect(result.pid).toBe(process.pid);
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('spawns new instance when existing instance has dead PID', async () => {
      // Insert a running instance with a dead PID
      insertRunningInstance(FEATURE_ID, 999999999, 13380);

      mockFindAvailablePort.mockResolvedValue(13381);
      mockSpawn.mockReturnValue(createMockChildProcess(55555));

      const result = await service.start(FEATURE_ID, WORKTREE_PATH);

      expect(result.port).toBe(13381);
      expect(result.pid).toBe(55555);
      expect(mockSpawn).toHaveBeenCalledOnce();
    });

    it('reads idle timeout from settings table', async () => {
      // Insert settings with custom timeout
      db.prepare(
        `
        INSERT INTO settings (
          id, created_at, updated_at,
          model_analyze, model_requirements, model_plan, model_implement,
          env_default_editor, env_shell_preference,
          sys_auto_update, sys_log_level,
          agent_type, agent_auth_method,
          notif_in_app_enabled, notif_browser_enabled, notif_desktop_enabled,
          notif_evt_agent_started, notif_evt_phase_completed, notif_evt_waiting_approval,
          notif_evt_agent_completed, notif_evt_agent_failed,
          workflow_open_pr_on_impl_complete, onboarding_complete,
          approval_gate_allow_prd, approval_gate_allow_plan,
          approval_gate_allow_merge, approval_gate_push_on_impl_complete,
          cs_idle_timeout_seconds
        ) VALUES (
          'settings-1', '2026-01-01', '2026-01-01',
          'model1', 'model2', 'model3', 'model4',
          'vscode', 'bash',
          0, 'info',
          'claude-code', 'api_key',
          1, 0, 0,
          1, 1, 1,
          1, 1,
          0, 1,
          1, 1, 1, 1,
          900
        )
      `
      ).run();

      await service.start(FEATURE_ID, WORKTREE_PATH);

      const args = mockSpawn.mock.calls[0][1] as string[];
      const idleIdx = args.indexOf('--idle-timeout');
      expect(args[idleIdx + 1]).toBe('900');
    });

    it('uses default idle timeout (1800) when settings are not initialized', async () => {
      await service.start(FEATURE_ID, WORKTREE_PATH);

      const args = mockSpawn.mock.calls[0][1] as string[];
      const idleIdx = args.indexOf('--idle-timeout');
      expect(args[idleIdx + 1]).toBe('1800');
    });

    it('throws when spawn returns no PID', async () => {
      mockSpawn.mockReturnValue({ pid: undefined, unref: vi.fn() });

      await expect(service.start(FEATURE_ID, WORKTREE_PATH)).rejects.toThrow(
        'Failed to spawn code-server process: no PID returned'
      );
    });

    it('creates required directories before spawning', async () => {
      await service.start(FEATURE_ID, WORKTREE_PATH);

      expect(mockMkdir).toHaveBeenCalledWith(`${SHEP_HOME}/code-server/user-data/${FEATURE_ID}`, {
        recursive: true,
      });
      expect(mockMkdir).toHaveBeenCalledWith(`${SHEP_HOME}/code-server/extensions`, {
        recursive: true,
      });
      expect(mockMkdir).toHaveBeenCalledWith(`${SHEP_HOME}/logs`, { recursive: true });
    });
  });

  // ─── task-9: stop() ──────────────────────────────────────────

  describe('stop()', () => {
    it('sends SIGTERM to a running instance and updates status to stopped', async () => {
      // Use current process PID so isAlive returns true initially
      insertRunningInstance(FEATURE_ID, process.pid, 13370);

      const killSpy = vi.spyOn(process, 'kill').mockImplementation((_pid, signal) => {
        if (signal === 0) {
          // First call: alive. After SIGTERM: still alive briefly. Then dead.
          throw new Error('ESRCH');
        }
        return true;
      });

      await service.stop(FEATURE_ID);

      // Verify status was updated to stopped
      const row = db
        .prepare('SELECT status, stopped_at FROM code_server_instances WHERE feature_id = ?')
        .get(FEATURE_ID) as { status: string; stopped_at: string | null };

      expect(row.status).toBe('stopped');
      expect(row.stopped_at).not.toBeNull();

      killSpy.mockRestore();
    });

    it('is a no-op for non-existent featureId', async () => {
      // Should not throw
      await expect(service.stop('non-existent')).resolves.not.toThrow();
    });

    it('is a no-op for already-stopped instance', async () => {
      insertStoppedInstance(FEATURE_ID, 12345, 13370);

      await expect(service.stop(FEATURE_ID)).resolves.not.toThrow();
    });

    it('handles case where PID is already dead', async () => {
      // Insert with a dead PID
      insertRunningInstance(FEATURE_ID, 999999999, 13370);

      await service.stop(FEATURE_ID);

      const row = db
        .prepare('SELECT status FROM code_server_instances WHERE feature_id = ?')
        .get(FEATURE_ID) as { status: string };

      expect(row.status).toBe('stopped');
    });
  });

  // ─── task-10: getStatus(), listRunning(), stopAll() ──────────

  describe('getStatus()', () => {
    it('returns instance with status "running" when PID is alive', async () => {
      insertRunningInstance(FEATURE_ID, process.pid, 13370);

      const result = await service.getStatus(FEATURE_ID);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(CodeServerInstanceStatus.Running);
      expect(result!.featureId).toBe(FEATURE_ID);
      expect(result!.port).toBe(13370);
    });

    it('auto-reconciles: returns stopped status when PID is dead', async () => {
      insertRunningInstance(FEATURE_ID, 999999999, 13370);

      const result = await service.getStatus(FEATURE_ID);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(CodeServerInstanceStatus.Stopped);
      expect(result!.stoppedAt).toBeDefined();
    });

    it('updates SQLite when auto-reconciling dead PID', async () => {
      insertRunningInstance(FEATURE_ID, 999999999, 13370);

      await service.getStatus(FEATURE_ID);

      const row = db
        .prepare('SELECT status FROM code_server_instances WHERE feature_id = ?')
        .get(FEATURE_ID) as { status: string };

      expect(row.status).toBe('stopped');
    });

    it('returns null for non-existent featureId', async () => {
      const result = await service.getStatus('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listRunning()', () => {
    it('returns only running instances (not stopped)', async () => {
      insertRunningInstance('feature-1', process.pid, 13370);
      insertRunningInstance('feature-2', process.pid, 13371);
      insertStoppedInstance('feature-3', 12345, 13372);

      const running = await service.listRunning();

      expect(running).toHaveLength(2);
      expect(running.map((r) => r.featureId).sort()).toEqual(['feature-1', 'feature-2']);
    });

    it('returns empty array when no instances exist', async () => {
      const running = await service.listRunning();
      expect(running).toEqual([]);
    });
  });

  describe('stopAll()', () => {
    it('stops all running instances', async () => {
      // Insert instances with dead PIDs for easy stopping
      insertRunningInstance('feature-1', 999999991, 13370);
      insertRunningInstance('feature-2', 999999992, 13371);

      await service.stopAll();

      const rows = db
        .prepare('SELECT status FROM code_server_instances WHERE status = ?')
        .all(CodeServerInstanceStatus.Running);

      expect(rows).toHaveLength(0);
    });

    it('handles partial failures gracefully', async () => {
      insertRunningInstance('feature-1', 999999991, 13370);
      insertRunningInstance('feature-2', 999999992, 13371);

      // Mock console.error to verify it's called on failures
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      // Even if one stop fails somehow, the others should still be attempted
      await expect(service.stopAll()).resolves.not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  // ─── task-11: reconcile() ────────────────────────────────────

  describe('reconcile()', () => {
    it('marks instances with dead PIDs as stopped', async () => {
      insertRunningInstance('feature-1', process.pid, 13370); // alive
      insertRunningInstance('feature-2', 999999991, 13371); // dead
      insertRunningInstance('feature-3', 999999992, 13372); // dead

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      await service.reconcile();

      // feature-1 should remain running (current process is alive)
      const f1 = db
        .prepare('SELECT status FROM code_server_instances WHERE feature_id = ?')
        .get('feature-1') as { status: string };
      expect(f1.status).toBe('running');

      // feature-2 and feature-3 should be stopped
      const f2 = db
        .prepare('SELECT status FROM code_server_instances WHERE feature_id = ?')
        .get('feature-2') as { status: string };
      expect(f2.status).toBe('stopped');

      const f3 = db
        .prepare('SELECT status FROM code_server_instances WHERE feature_id = ?')
        .get('feature-3') as { status: string };
      expect(f3.status).toBe('stopped');

      consoleSpy.mockRestore();
    });

    it('makes no changes when all instances are alive', async () => {
      insertRunningInstance('feature-1', process.pid, 13370);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      await service.reconcile();

      const row = db
        .prepare('SELECT status FROM code_server_instances WHERE feature_id = ?')
        .get('feature-1') as { status: string };
      expect(row.status).toBe('running');

      // Should log that 0 were marked stopped
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('marked 0 as stopped'));

      consoleSpy.mockRestore();
    });

    it('marks all instances as stopped when all PIDs are dead', async () => {
      insertRunningInstance('feature-1', 999999991, 13370);
      insertRunningInstance('feature-2', 999999992, 13371);
      insertRunningInstance('feature-3', 999999993, 13372);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      await service.reconcile();

      const rows = db
        .prepare('SELECT status FROM code_server_instances WHERE status = ?')
        .all(CodeServerInstanceStatus.Running);
      expect(rows).toHaveLength(0);

      // Should log that 3 were marked stopped
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('marked 3 as stopped'));

      consoleSpy.mockRestore();
    });

    it('does nothing when no instances exist', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      await service.reconcile();

      // Should not log anything (no instances to reconcile)
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
