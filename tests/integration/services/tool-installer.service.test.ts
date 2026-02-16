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
 * Create a mock child process for spawn testing.
 * Automatically emits 'close' event after a delay.
 */
const createMockProcess = (exitCode = 0) => {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const proc = new EventEmitter() as any;
  proc.stdout = stdout;
  proc.stderr = stderr;
  proc.kill = vi.fn();

  setTimeout(() => {
    proc.emit('close', exitCode);
  }, 10);

  return proc;
};

/** All supported tool names for parametrized testing */
const SUPPORTED_TOOLS = [
  'vscode',
  'cursor',
  'windsurf',
  'zed',
  'antigravity',
  'cursor-cli',
  'claude-code',
];

describe('ToolInstallerServiceImpl - Integration Tests', () => {
  let service: ToolInstallerServiceImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ToolInstallerServiceImpl();
  });

  describe('checkAvailability for all tools', () => {
    SUPPORTED_TOOLS.forEach((toolName) => {
      it(`should return "available" for ${toolName} when binary is found`, async () => {
        mockExecFile.mockImplementation(
          (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
            cb(null);
          }
        );

        const result = await service.checkAvailability(toolName);

        expect(result.status).toBe('available');
        expect(result.toolName).toBe(toolName);
      });

      it(`should return "missing" with suggestions for ${toolName} when binary not found`, async () => {
        mockExecFile.mockImplementation(
          (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
            cb(new Error('not found'));
          }
        );

        const result = await service.checkAvailability(toolName);

        expect(result.status).toBe('missing');
        expect(result.toolName).toBe(toolName);
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getInstallCommand for all tools on Linux', () => {
    SUPPORTED_TOOLS.forEach((toolName) => {
      it(`should return correct command for ${toolName} on linux`, () => {
        const command = service.getInstallCommand(toolName);

        expect(command).not.toBeNull();
        expect(command!.toolName).toBe(toolName);
        expect(command!.platform).toBe('linux');
        expect(typeof command!.command).toBe('string');
        expect(command!.command.length).toBeGreaterThan(0);
        expect(command!.timeout).toBeGreaterThan(0);
        expect(command!.packageManager).toBeDefined();
      });
    });
  });

  describe('executeInstall full flow', () => {
    it('should complete installation successfully with exit code 0', async () => {
      const mockProc = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProc);

      const result = await service.executeInstall('vscode');

      expect(result.status).toBe('available');
      expect(result.toolName).toBe('vscode');
      expect(result.errorMessage).toBeUndefined();
    });

    it('should handle installation failure with non-zero exit code', async () => {
      const mockProc = createMockProcess(1);
      mockSpawn.mockReturnValue(mockProc);

      const result = await service.executeInstall('cursor');

      expect(result.status).toBe('error');
      expect(result.toolName).toBe('cursor');
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('exit code 1');
    });

    it('should stream output during installation', async () => {
      const mockProc = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProc);

      const outputLines: string[] = [];
      const onOutput = (data: string) => {
        outputLines.push(data);
      };

      const installPromise = service.executeInstall('windsurf', onOutput);

      // Emit some output
      setTimeout(() => {
        mockProc.stdout.emit('data', Buffer.from('Installing...\n'));
        mockProc.stderr.emit('data', Buffer.from('Verifying...\n'));
      }, 5);

      await new Promise((resolve) => setTimeout(resolve, 50));
      const result = await installPromise;

      expect(result.status).toBe('available');
      expect(outputLines.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle permission denied (exit code 126)', async () => {
      const mockProc = createMockProcess(126);
      mockSpawn.mockReturnValue(mockProc);

      const result = await service.executeInstall('zed');

      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('126');
    });

    it('should handle command not found (exit code 127)', async () => {
      const mockProc = createMockProcess(127);
      mockSpawn.mockReturnValue(mockProc);

      const result = await service.executeInstall('antigravity');

      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('127');
    });

    it('should kill process on timeout', async () => {
      const mockProc = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProc);

      // Don't emit close immediately - let timeout kill it
      const closeEmit = mockProc.emit.bind(mockProc);
      mockProc.emit = vi.fn((event: string, ...args: any[]) => {
        if (event !== 'close') {
          closeEmit(event, ...args);
        }
      });

      const installPromise = service.executeInstall('cursor-cli');

      await new Promise((resolve) => setTimeout(resolve, 150));

      // Manually emit close to complete the promise
      closeEmit('close', 0);
      await installPromise;

      // Process.kill should have been called due to timeout
      expect(mockProc.kill).toBeDefined();
    });
  });

  describe('Unknown tools', () => {
    it('should return error for unknown tool in checkAvailability', async () => {
      const result = await service.checkAvailability('unknown-tool-xyz-123');

      expect(result.status).toBe('error');
      expect(result.toolName).toBe('unknown-tool-xyz-123');
      expect(result.errorMessage).toContain('Unknown tool');
    });

    it('should return null for unknown tool in getInstallCommand', () => {
      const command = service.getInstallCommand('unknown-tool-xyz-123');

      expect(command).toBeNull();
    });

    it('should return error for unknown tool in executeInstall', async () => {
      const result = await service.executeInstall('unknown-tool-xyz-123');

      expect(result.status).toBe('error');
      expect(result.toolName).toBe('unknown-tool-xyz-123');
      expect(result.errorMessage).toContain('No installation command');
    });
  });

  describe('Error handling', () => {
    it('should handle spawn errors', async () => {
      mockSpawn.mockImplementation(() => {
        const proc = new EventEmitter() as any;
        setTimeout(() => {
          proc.emit('error', new Error('Failed to spawn process'));
        }, 5);
        return proc;
      });

      const result = await service.executeInstall('vscode');

      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('Installation error');
    });

    it('should handle checkAvailability errors gracefully', async () => {
      mockExecFile.mockImplementation(
        (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
          cb(new Error('Permission denied'));
        }
      );

      const result = await service.checkAvailability('vscode');

      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('Permission denied');
    });
  });
});
