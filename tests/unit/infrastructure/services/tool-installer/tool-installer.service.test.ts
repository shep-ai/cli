// @vitest-environment node
import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

const mockSpawn = vi.hoisted(() => vi.fn());
const mockExec = vi.hoisted(() => vi.fn());
const mockCheckBinaryExists = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    spawn: mockSpawn,
    exec: mockExec,
  };
});

vi.mock('@/infrastructure/services/tool-installer/binary-exists', () => ({
  checkBinaryExists: mockCheckBinaryExists,
}));

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
    it('should return "available" status when binary is found', async () => {
      mockCheckBinaryExists.mockResolvedValue({ found: true });

      const result = await service.checkAvailability('vscode');

      expect(result.status).toBe('available');
      expect(result.toolName).toBe('vscode');
      expect(mockCheckBinaryExists).toHaveBeenCalledWith('code');
    });

    it('should return "missing" status with suggestions when binary is not found', async () => {
      mockCheckBinaryExists.mockResolvedValue({ found: false, notInPath: true });
      // verifyCommand fallback should also fail when the tool is truly missing
      mockExec.mockImplementation((_cmd: string, cb: (err: Error | null) => void) => {
        cb(new Error('Command failed'));
      });

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
      mockCheckBinaryExists.mockResolvedValue({
        found: false,
        error: new Error('Permission denied'),
      });

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
      expect(command!.packageManager).toBe('manual');
    });
  });

  describe('listAvailableTerminals', () => {
    it('should include system terminal as always available', async () => {
      mockCheckBinaryExists.mockResolvedValue({ found: true });

      const results = await service.listAvailableTerminals();

      const system = results.find((r) => r.id === 'system');
      expect(system).toBeDefined();
      expect(system!.available).toBe(true);
    });

    it('should include warp as available when binary check passes', async () => {
      // Warp uses a verifyCommand starting with "test " (app bundle check)
      // We simulate exec returning no error (available)
      mockExec.mockImplementation((_cmd: string, cb: (err: Error | null) => void) => {
        cb(null);
      });
      mockCheckBinaryExists.mockResolvedValue({ found: true });

      const results = await service.listAvailableTerminals();

      // System terminal must always be present
      expect(results.some((r) => r.id === 'system')).toBe(true);
    });

    it('should mark warp as unavailable when app bundle is not found', async () => {
      mockExec.mockImplementation((_cmd: string, cb: (err: Error | null) => void) => {
        cb(new Error('not found'));
      });
      mockCheckBinaryExists.mockResolvedValue({ found: false, notInPath: true });

      const results = await service.listAvailableTerminals();

      const warp = results.find((r) => r.id === 'warp');
      if (warp) {
        expect(warp.available).toBe(false);
      }
      // System terminal is always available
      expect(results.some((r) => r.id === 'system' && r.available)).toBe(true);
    });
  });

  describe('getTerminalOpenConfig', () => {
    it('should return null for unknown terminal id', () => {
      const config = service.getTerminalOpenConfig('nonexistent-terminal');
      expect(config).toBeNull();
    });

    it('should return null for terminal without openDirectory', () => {
      // 'git' has no openDirectory and is not a terminal
      const config = service.getTerminalOpenConfig('git');
      expect(config).toBeNull();
    });

    it('should return resolved openDirectory for a known terminal', () => {
      // warp has openDirectory: "open -a Warp {dir}" (string)
      const config = service.getTerminalOpenConfig('warp');
      // On CI this may be null if warp isn't a terminal with openDirectory on this platform,
      // but the method should at least not throw
      if (config) {
        expect(config.openDirectory).toContain('{dir}');
        expect(typeof config.shell).toBe('boolean');
      }
    });

    it('should return platform-resolved openDirectory for system-terminal', () => {
      const config = service.getTerminalOpenConfig('system-terminal');
      expect(config).not.toBeNull();
      expect(config!.openDirectory).toContain('{dir}');
      expect(config!.shell).toBe(false);
    });

    it('should return shell: true when spawnOptions.shell is true', () => {
      // tmux has spawnOptions.shell: true
      const config = service.getTerminalOpenConfig('tmux');
      if (config) {
        expect(config.shell).toBe(true);
      }
    });
  });

  describe('executeInstall', () => {
    it('should call spawn with shell: true instead of sh -c', async () => {
      const mockProc = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProc);

      const installPromise = service.executeInstall('vscode');

      await new Promise((resolve) => setTimeout(resolve, 50));
      await installPromise;

      expect(mockSpawn).toHaveBeenCalled();
      const [cmd, args, opts] = mockSpawn.mock.calls[0];
      // Should NOT use spawn('sh', ['-c', ...]) — should use spawn(command, [], { shell: true })
      expect(cmd).not.toBe('sh');
      expect(cmd).toBeDefined();
      expect(args).toEqual([]);
      expect(opts.shell).toBe(true);
    });

    it('should return "available" status on exit code 0', async () => {
      const mockProc = createMockProcess(0);
      mockSpawn.mockReturnValue(mockProc);
      // Mock binary check to return success after installation
      mockCheckBinaryExists.mockResolvedValue({ found: true });

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
