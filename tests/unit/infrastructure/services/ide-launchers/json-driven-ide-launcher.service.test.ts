// @vitest-environment node
import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks before imports
const mockSpawn = vi.hoisted(() => vi.fn());
const mockExecFile = vi.hoisted(() => vi.fn());
const mockPlatform = vi.hoisted(() => vi.fn<() => string>());

vi.mock('node:child_process', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    spawn: mockSpawn,
    execFile: mockExecFile,
  };
});

vi.mock('node:os', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    platform: mockPlatform,
  };
});

vi.mock('@/infrastructure/services/tool-installer/tool-metadata', () => ({
  TOOL_METADATA: {
    vscode: {
      name: 'Visual Studio Code',
      category: 'ide',
      binary: 'code',
      openDirectory: 'code {dir}',
    },
    cursor: {
      name: 'Cursor',
      category: 'ide',
      binary: 'cursor',
      openDirectory: 'cursor {dir}',
    },
    antigravity: {
      name: 'Google Antigravity',
      category: 'ide',
      binary: { linux: 'antigravity', darwin: 'agy' },
      openDirectory: { linux: 'antigravity {dir}', darwin: 'agy {dir}' },
    },
    'claude-code': {
      name: 'Claude Code',
      category: 'cli-agent',
      binary: 'claude',
      // No openDirectory — should be excluded
    },
    'broken-ide': {
      name: 'Broken IDE',
      category: 'ide',
      binary: 'broken',
      openDirectory: 'broken --open',
      // Missing {dir} placeholder
    },
  },
}));

import { JsonDrivenIdeLauncherService } from '@/infrastructure/services/ide-launchers/json-driven-ide-launcher.service';
import { resolvePlatformValue } from '@/infrastructure/services/ide-launchers/json-driven-ide-launcher.service';

describe('resolvePlatformValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatform.mockReturnValue('linux');
  });

  it('returns the string directly when value is a string', () => {
    expect(resolvePlatformValue('code')).toBe('code');
  });

  it('returns the platform-specific value when value is a record and platform matches', () => {
    mockPlatform.mockReturnValue('darwin');
    expect(resolvePlatformValue({ linux: 'antigravity', darwin: 'agy' })).toBe('agy');
  });

  it('returns the platform-specific value for linux', () => {
    mockPlatform.mockReturnValue('linux');
    expect(resolvePlatformValue({ linux: 'antigravity', darwin: 'agy' })).toBe('antigravity');
  });

  it('falls back to first value when platform key is missing', () => {
    mockPlatform.mockReturnValue('win32');
    expect(resolvePlatformValue({ linux: 'antigravity', darwin: 'agy' })).toBe('antigravity');
  });
});

describe('JsonDrivenIdeLauncherService', () => {
  let service: JsonDrivenIdeLauncherService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatform.mockReturnValue('linux');
    service = new JsonDrivenIdeLauncherService();
  });

  describe('editor filtering', () => {
    it('excludes non-IDE tools from editor map', () => {
      // claude-code has category "cli-agent", should not be launchable
      const result = service.launch('claude-code', '/some/path');
      return expect(result).resolves.toMatchObject({
        ok: false,
        code: 'unknown_editor',
      });
    });

    it('excludes IDE tools without openDirectory field', async () => {
      const mockChild = { unref: vi.fn() };
      mockSpawn.mockReturnValue(mockChild);

      // vscode has category "ide" + openDirectory → should be launchable
      const result = await service.launch('vscode', '/some/path');
      expect(result.ok).toBe(true);
    });
  });

  describe('launch', () => {
    it('returns LaunchIdeSuccess with correct editorName and worktreePath', async () => {
      const mockChild = { unref: vi.fn() };
      mockSpawn.mockReturnValue(mockChild);

      const result = await service.launch('vscode', '/home/user/project');

      expect(result).toEqual({
        ok: true,
        editorName: 'Visual Studio Code',
        worktreePath: '/home/user/project',
      });
    });

    it('substitutes {dir} placeholder with provided directory path', async () => {
      const mockChild = { unref: vi.fn() };
      mockSpawn.mockReturnValue(mockChild);

      await service.launch('vscode', '/home/user/project');

      expect(mockSpawn).toHaveBeenCalledWith('code', ['/home/user/project'], {
        detached: true,
        stdio: 'ignore',
      });
    });

    it('spawns with detached: true, stdio: "ignore" and calls unref()', async () => {
      const mockChild = { unref: vi.fn() };
      mockSpawn.mockReturnValue(mockChild);

      await service.launch('cursor', '/some/path');

      expect(mockSpawn).toHaveBeenCalledWith('cursor', ['/some/path'], {
        detached: true,
        stdio: 'ignore',
      });
      expect(mockChild.unref).toHaveBeenCalled();
    });

    it('returns LaunchIdeFailed with code "unknown_editor" for unrecognized editor ID', async () => {
      const result = await service.launch('notepad', '/some/path');

      expect(result).toEqual({
        ok: false,
        code: 'unknown_editor',
        message: expect.stringContaining('notepad'),
      });
    });

    it('lists available editors in unknown_editor error message', async () => {
      const result = await service.launch('notepad', '/some/path');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('vscode');
        expect(result.message).toContain('cursor');
        expect(result.message).toContain('antigravity');
      }
    });

    it('returns error when openDirectory is missing {dir} placeholder', async () => {
      const result = await service.launch('broken-ide', '/some/path');

      expect(result).toMatchObject({
        ok: false,
        code: 'launch_failed',
      });
      if (!result.ok) {
        expect(result.message).toContain('{dir}');
      }
    });

    it('returns LaunchIdeFailed with code "launch_failed" when spawn throws', async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error('spawn ENOENT');
      });

      const result = await service.launch('vscode', '/some/path');

      expect(result).toEqual({
        ok: false,
        code: 'launch_failed',
        message: 'spawn ENOENT',
      });
    });

    it('resolves per-platform openDirectory for antigravity on darwin', async () => {
      mockPlatform.mockReturnValue('darwin');
      const svc = new JsonDrivenIdeLauncherService();

      const mockChild = { unref: vi.fn() };
      mockSpawn.mockReturnValue(mockChild);

      const result = await svc.launch('antigravity', '/some/path');

      expect(result).toEqual({
        ok: true,
        editorName: 'Google Antigravity',
        worktreePath: '/some/path',
      });
      expect(mockSpawn).toHaveBeenCalledWith('agy', ['/some/path'], {
        detached: true,
        stdio: 'ignore',
      });
    });

    it('resolves per-platform openDirectory for antigravity on linux', async () => {
      mockPlatform.mockReturnValue('linux');
      const svc = new JsonDrivenIdeLauncherService();

      const mockChild = { unref: vi.fn() };
      mockSpawn.mockReturnValue(mockChild);

      await svc.launch('antigravity', '/some/path');

      expect(mockSpawn).toHaveBeenCalledWith('antigravity', ['/some/path'], {
        detached: true,
        stdio: 'ignore',
      });
    });
  });

  describe('checkAvailability', () => {
    it('returns true when "which" succeeds', async () => {
      mockExecFile.mockImplementation(
        (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
          cb(null);
        }
      );

      const result = await service.checkAvailability('vscode');

      expect(result).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith('which', ['code'], expect.any(Function));
    });

    it('returns false when "which" fails', async () => {
      mockExecFile.mockImplementation(
        (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
          cb(new Error('not found'));
        }
      );

      const result = await service.checkAvailability('vscode');

      expect(result).toBe(false);
    });

    it('returns false for unknown editor ID', async () => {
      const result = await service.checkAvailability('notepad');

      expect(result).toBe(false);
    });

    it('resolves per-platform binary for antigravity on darwin', async () => {
      mockPlatform.mockReturnValue('darwin');
      const svc = new JsonDrivenIdeLauncherService();

      mockExecFile.mockImplementation(
        (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
          cb(null);
        }
      );

      const result = await svc.checkAvailability('antigravity');

      expect(result).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith('which', ['agy'], expect.any(Function));
    });
  });
});
