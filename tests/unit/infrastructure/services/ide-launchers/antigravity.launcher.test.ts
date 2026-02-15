// @vitest-environment node
import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSpawn = vi.hoisted(() => vi.fn());
const mockExecFile = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawn: mockSpawn,
    execFile: mockExecFile,
  };
});

import { AntigravityLauncher } from '@/infrastructure/services/ide-launchers/antigravity.launcher';

describe('AntigravityLauncher', () => {
  let launcher: AntigravityLauncher;

  beforeEach(() => {
    vi.clearAllMocks();
    launcher = new AntigravityLauncher();
  });

  describe('metadata', () => {
    it('should have name "Antigravity"', () => {
      expect(launcher.name).toBe('Antigravity');
    });

    it('should have editorId "antigravity"', () => {
      expect(launcher.editorId).toBe('antigravity');
    });

    it('should have binary "agy"', () => {
      expect(launcher.binary).toBe('agy');
    });
  });

  describe('launch', () => {
    it('should spawn a detached process with correct args', async () => {
      const mockChild = { unref: vi.fn() };
      mockSpawn.mockReturnValue(mockChild);

      await launcher.launch('/some/project');

      expect(mockSpawn).toHaveBeenCalledWith('agy', ['/some/project'], {
        detached: true,
        stdio: 'ignore',
      });
    });

    it('should call unref on the spawned process', async () => {
      const mockChild = { unref: vi.fn() };
      mockSpawn.mockReturnValue(mockChild);

      await launcher.launch('/some/project');

      expect(mockChild.unref).toHaveBeenCalled();
    });
  });

  describe('checkAvailable', () => {
    it('should return true when the binary is found', async () => {
      mockExecFile.mockImplementation(
        (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
          cb(null);
        }
      );

      const result = await launcher.checkAvailable();

      expect(result).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith('which', ['agy'], expect.any(Function));
    });

    it('should return false when the binary is not found', async () => {
      mockExecFile.mockImplementation(
        (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
          cb(new Error('not found'));
        }
      );

      const result = await launcher.checkAvailable();

      expect(result).toBe(false);
    });
  });
});
