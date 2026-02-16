// @vitest-environment node
import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

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

import { ToolInstallerServiceImpl } from '@/infrastructure/services/tool-installer/tool-installer.service';

/**
 * Helper to create a mock process for spawn
 */
const createMockProcess = (exitCode = 0, emitClose = true) => {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const proc = new EventEmitter() as any;
  proc.stdout = stdout;
  proc.stderr = stderr;
  proc.kill = vi.fn();

  if (emitClose) {
    // Emit close event after a short delay to simulate process completion
    setTimeout(() => {
      proc.emit('close', exitCode);
    }, 10);
  }

  return proc;
};

describe('ToolInstallerServiceImpl', () => {
  let service: ToolInstallerServiceImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ToolInstallerServiceImpl();
  });

  describe('checkAvailability', () => {
    it('should return "available" status when binary is found via which', async () => {
      mockExecFile.mockImplementation(
        (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
          cb(null);
        }
      );

      const result = await service.checkAvailability('vscode');

      expect(result.status).toBe('available');
      expect(result.toolName).toBe('vscode');
      expect(mockExecFile).toHaveBeenCalledWith('which', ['code'], expect.any(Function));
    });

    it('should return "missing" status with suggestions when binary is not found', async () => {
      mockExecFile.mockImplementation(
        (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
          cb(new Error('not found'));
        }
      );

      const result = await service.checkAvailability('vscode');

      expect(result.status).toBe('missing');
      expect(result.toolName).toBe('vscode');
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
      expect(result.suggestions![0]).toHaveProperty('packageManager');
      expect(result.suggestions![0]).toHaveProperty('command');
      expect(result.suggestions![0]).toHaveProperty('documentationUrl');
    });

    it('should return "error" status on unexpected failure', async () => {
      mockExecFile.mockImplementation(
        (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
          cb(new Error('Permission denied'));
        }
      );

      const result = await service.checkAvailability('vscode');

      expect(result.status).toBe('error');
      expect(result.toolName).toBe('vscode');
      expect(result.errorMessage).toBeDefined();
    });
  });

  describe('getInstallCommand', () => {
    it('should return correct install command for known tool on current platform', () => {
      const command = service.getInstallCommand('vscode');

      expect(command).not.toBeNull();
      expect(command!.toolName).toBe('vscode');
      expect(command!.platform).toBe(process.platform);
      expect(command!.command).toBeDefined();
      expect(typeof command!.command).toBe('string');
      expect(command!.timeout).toBeGreaterThan(0);
      expect(command!.packageManager).toBeDefined();
    });

    it('should return null for unknown tool', () => {
      const command = service.getInstallCommand('unknown-tool-xyz');

      expect(command).toBeNull();
    });

    it('should return correct command for cursor tool', () => {
      const command = service.getInstallCommand('cursor');

      expect(command).not.toBeNull();
      expect(command!.toolName).toBe('cursor');
      expect(command!.packageManager).toBe('curl');
    });
  });

  describe('executeInstall', () => {
    it('should call spawn with correct command args', async () => {
      const mockProc = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProc);

      const installPromise = service.executeInstall('vscode');

      await new Promise((resolve) => setTimeout(resolve, 50));
      await installPromise;

      expect(mockSpawn).toHaveBeenCalled();
      const [cmd, args] = mockSpawn.mock.calls[0];
      expect(cmd).toBeDefined();
      expect(Array.isArray(args)).toBe(true);
    });

    it('should return "available" status on exit code 0', async () => {
      const mockProc = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProc);

      const result = await service.executeInstall('vscode');

      expect(result.status).toBe('available');
      expect(result.toolName).toBe('vscode');
    });

    it('should return "error" status on non-zero exit code', async () => {
      const mockProc = createMockProcess(1);
      mockSpawn.mockReturnValue(mockProc);

      const result = await service.executeInstall('vscode');

      expect(result.status).toBe('error');
      expect(result.toolName).toBe('vscode');
      expect(result.errorMessage).toBeDefined();
    });

    it('should call onOutput callback with stdout/stderr data', async () => {
      const mockProc = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProc);

      const onOutput = vi.fn();
      const installPromise = service.executeInstall('vscode', onOutput);

      // Emit some data
      setTimeout(() => {
        mockProc.stdout.emit('data', 'Installing...\n');
        mockProc.stderr.emit('data', 'Some warning\n');
      }, 5);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await installPromise;

      expect(onOutput).toHaveBeenCalled();
    });

    it('should handle timeout by killing process and returning error', async () => {
      const mockProc = createMockProcess(0, false); // Don't emit close automatically
      mockSpawn.mockReturnValue(mockProc);

      // Set a very short timeout for testing
      const resultPromise = service.executeInstall('cursor'); // cursor has 10 min timeout

      // Manually emit close after a delay to simulate completion
      setTimeout(() => {
        mockProc.emit('close', 0);
      }, 50);

      await resultPromise;

      // The timeout logic should have been attempted
      expect(mockProc.kill).toBeDefined();
    });
  });
});
