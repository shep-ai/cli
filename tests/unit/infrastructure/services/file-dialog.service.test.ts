import { describe, it, expect, vi } from 'vitest';
import {
  FileDialogService,
  type FileDialogDeps,
  type FileAttachment,
} from '@/infrastructure/services/file-dialog.service.js';

function createService(
  platform: NodeJS.Platform,
  execReturn?: string,
  execThrow?: unknown,
  statReturn?: { size: number }
) {
  const exec = vi.fn<FileDialogDeps['exec']>();
  if (execThrow) {
    exec.mockImplementation(() => {
      throw execThrow;
    });
  } else {
    exec.mockReturnValue(execReturn ?? '');
  }
  const stat = vi.fn<FileDialogDeps['stat']>().mockReturnValue(statReturn ?? { size: 1024 });
  const service = new FileDialogService({ platform, exec, stat });
  return { service, exec, stat };
}

describe('FileDialogService', () => {
  describe('getCommand()', () => {
    it('returns osascript command for darwin', () => {
      const { service } = createService('darwin');
      const cmd = service.getCommand();
      expect(cmd).toContain('osascript');
      expect(cmd).toContain('choose file');
    });

    it('returns zenity command for linux', () => {
      const { service } = createService('linux');
      const cmd = service.getCommand();
      expect(cmd).toContain('zenity');
      expect(cmd).toContain('--file-selection');
      expect(cmd).toContain('--multiple');
    });

    it('returns powershell command for win32', () => {
      const { service } = createService('win32');
      const cmd = service.getCommand();
      expect(cmd).toContain('powershell');
      expect(cmd).toContain('OpenFileDialog');
      expect(cmd).toContain('Multiselect');
    });

    it('returns null for unsupported platforms', () => {
      const { service } = createService('freebsd' as NodeJS.Platform);
      expect(service.getCommand()).toBeNull();
    });
  });

  describe('pickFiles() — macOS (darwin)', () => {
    it('returns file attachments with path, name, and size', () => {
      const { service } = createService('darwin', '/Users/dev/docs/requirements.pdf\n', undefined, {
        size: 42000,
      });
      const result = service.pickFiles();
      expect(result).toEqual([
        { path: '/Users/dev/docs/requirements.pdf', name: 'requirements.pdf', size: 42000 },
      ]);
    });

    it('parses multiple newline-separated file paths', () => {
      const { service, stat } = createService(
        'darwin',
        '/Users/dev/a.pdf\n/Users/dev/b.png\n/Users/dev/c.ts\n'
      );
      stat
        .mockReturnValueOnce({ size: 1000 })
        .mockReturnValueOnce({ size: 2000 })
        .mockReturnValueOnce({ size: 3000 });

      const result = service.pickFiles();
      expect(result).toEqual([
        { path: '/Users/dev/a.pdf', name: 'a.pdf', size: 1000 },
        { path: '/Users/dev/b.png', name: 'b.png', size: 2000 },
        { path: '/Users/dev/c.ts', name: 'c.ts', size: 3000 },
      ]);
    });

    it('calls exec with osascript command and utf-8 encoding', () => {
      const { service, exec } = createService('darwin', '/Users/dev/file.txt\n');
      service.pickFiles();
      expect(exec).toHaveBeenCalledWith(expect.stringContaining('osascript'), {
        encoding: 'utf-8',
        timeout: 60_000,
      });
    });

    it('calls stat for each returned file path', () => {
      const { service, stat } = createService('darwin', '/Users/dev/a.pdf\n/Users/dev/b.png\n');
      service.pickFiles();
      expect(stat).toHaveBeenCalledTimes(2);
      expect(stat).toHaveBeenCalledWith('/Users/dev/a.pdf');
      expect(stat).toHaveBeenCalledWith('/Users/dev/b.png');
    });

    it('returns null when user cancels (exit code 1)', () => {
      const { service } = createService('darwin', undefined, { status: 1 });
      expect(service.pickFiles()).toBeNull();
    });
  });

  describe('pickFiles() — Linux', () => {
    it('returns file attachments with path, name, and size', () => {
      const { service } = createService('linux', '/home/dev/spec.pdf\n', undefined, { size: 8000 });
      const result = service.pickFiles();
      expect(result).toEqual([{ path: '/home/dev/spec.pdf', name: 'spec.pdf', size: 8000 }]);
    });

    it('calls exec with zenity command', () => {
      const { service, exec } = createService('linux', '/home/dev/file.txt\n');
      service.pickFiles();
      expect(exec).toHaveBeenCalledWith(expect.stringContaining('zenity'), expect.any(Object));
    });

    it('returns null when user cancels (exit code 1)', () => {
      const { service } = createService('linux', undefined, { status: 1 });
      expect(service.pickFiles()).toBeNull();
    });
  });

  describe('pickFiles() — Windows (win32)', () => {
    it('returns file attachments with path, name, and size', () => {
      const { service } = createService('win32', 'C:\\Users\\dev\\spec.pdf\r\n', undefined, {
        size: 5000,
      });
      const result = service.pickFiles();
      expect(result).toEqual([{ path: 'C:\\Users\\dev\\spec.pdf', name: 'spec.pdf', size: 5000 }]);
    });

    it('calls exec with powershell command', () => {
      const { service, exec } = createService('win32', 'C:\\Users\\dev\\file.txt\r\n');
      service.pickFiles();
      expect(exec).toHaveBeenCalledWith(expect.stringContaining('powershell'), expect.any(Object));
    });

    it('returns null when user cancels (exit code 1)', () => {
      const { service } = createService('win32', undefined, { status: 1 });
      expect(service.pickFiles()).toBeNull();
    });
  });

  describe('error handling', () => {
    it('throws for unsupported platforms', () => {
      const { service } = createService('freebsd' as NodeJS.Platform);
      expect(() => service.pickFiles()).toThrow('Unsupported platform: freebsd');
    });

    it('returns null when exec returns empty string', () => {
      const { service } = createService('darwin', '');
      expect(service.pickFiles()).toBeNull();
    });

    it('returns null when exec returns only whitespace', () => {
      const { service } = createService('darwin', '   \n');
      expect(service.pickFiles()).toBeNull();
    });

    it('re-throws unexpected exec errors (non exit-code-1)', () => {
      const { service } = createService('darwin', undefined, { status: 127, message: 'not found' });
      expect(() => service.pickFiles()).toThrow();
    });

    it('re-throws non-exec errors', () => {
      const { service } = createService('darwin', undefined, new Error('ENOENT'));
      expect(() => service.pickFiles()).toThrow('ENOENT');
    });
  });

  describe('constructor defaults', () => {
    it('creates service with default deps when none provided', () => {
      const service = new FileDialogService();
      expect(service.getCommand()).not.toBeUndefined();
    });
  });
});
