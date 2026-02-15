// @vitest-environment node
import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSpawn = vi.hoisted(() => vi.fn());
const mockExecFile = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    spawn: mockSpawn,
    execFile: mockExecFile,
  };
});

import { WindsurfLauncher } from '@/infrastructure/services/ide-launchers/windsurf.launcher';

describe('WindsurfLauncher', () => {
  let launcher: WindsurfLauncher;

  beforeEach(() => {
    vi.clearAllMocks();
    launcher = new WindsurfLauncher();
  });

  describe('metadata', () => {
    it('should have name "Windsurf"', () => {
      expect(launcher.name).toBe('Windsurf');
    });

    it('should have editorId "windsurf"', () => {
      expect(launcher.editorId).toBe('windsurf');
    });

    it('should have binary "windsurf"', () => {
      expect(launcher.binary).toBe('windsurf');
    });
  });

  describe('launch', () => {
    it('should spawn a detached process with correct args', async () => {
      const mockChild = { unref: vi.fn() };
      mockSpawn.mockReturnValue(mockChild);

      await launcher.launch('/some/path');

      expect(mockSpawn).toHaveBeenCalledWith('windsurf', ['/some/path'], {
        detached: true,
        stdio: 'ignore',
      });
    });

    it('should call unref on the spawned process', async () => {
      const mockChild = { unref: vi.fn() };
      mockSpawn.mockReturnValue(mockChild);

      await launcher.launch('/some/path');

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
      expect(mockExecFile).toHaveBeenCalledWith('which', ['windsurf'], expect.any(Function));
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
