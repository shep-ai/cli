import { describe, it, expect, vi } from 'vitest';
import {
  FolderDialogService,
  type FolderDialogDeps,
} from '@/infrastructure/services/folder-dialog.service.js';

function createService(platform: NodeJS.Platform, execReturn?: string, execThrow?: unknown) {
  const exec = vi.fn<FolderDialogDeps['exec']>();
  if (execThrow) {
    exec.mockImplementation(() => {
      throw execThrow;
    });
  } else {
    exec.mockReturnValue(execReturn ?? '');
  }
  const service = new FolderDialogService({ platform, exec });
  return { service, exec };
}

describe('FolderDialogService', () => {
  describe('getCommand()', () => {
    it('returns osascript command for darwin', () => {
      const { service } = createService('darwin');
      const cmd = service.getCommand();
      expect(cmd).toContain('osascript');
      expect(cmd).toContain('choose folder');
    });

    it('returns zenity command for linux', () => {
      const { service } = createService('linux');
      const cmd = service.getCommand();
      expect(cmd).toContain('zenity');
      expect(cmd).toContain('--directory');
    });

    it('returns powershell command for win32', () => {
      const { service } = createService('win32');
      const cmd = service.getCommand();
      expect(cmd).toContain('powershell');
      expect(cmd).toContain('FolderBrowserDialog');
    });

    it('returns null for unsupported platforms', () => {
      const { service } = createService('freebsd' as NodeJS.Platform);
      expect(service.getCommand()).toBeNull();
    });
  });

  describe('pickFolder() — macOS (darwin)', () => {
    it('returns the selected folder path', () => {
      const { service } = createService('darwin', '/Users/dev/my-repo\n');
      expect(service.pickFolder()).toBe('/Users/dev/my-repo');
    });

    it('trims trailing whitespace and newlines', () => {
      const { service } = createService('darwin', '  /Users/dev/my-repo  \n');
      expect(service.pickFolder()).toBe('/Users/dev/my-repo');
    });

    it('calls exec with osascript command and utf-8 encoding', () => {
      const { service, exec } = createService('darwin', '/Users/dev/my-repo\n');
      service.pickFolder();
      expect(exec).toHaveBeenCalledWith(expect.stringContaining('osascript'), {
        encoding: 'utf-8',
        timeout: 60_000,
      });
    });

    it('returns null when user cancels (exit code 1)', () => {
      const { service } = createService('darwin', undefined, { status: 1 });
      expect(service.pickFolder()).toBeNull();
    });
  });

  describe('pickFolder() — Linux', () => {
    it('returns the selected folder path', () => {
      const { service } = createService('linux', '/home/dev/my-repo\n');
      expect(service.pickFolder()).toBe('/home/dev/my-repo');
    });

    it('calls exec with zenity command', () => {
      const { service, exec } = createService('linux', '/home/dev/my-repo\n');
      service.pickFolder();
      expect(exec).toHaveBeenCalledWith(expect.stringContaining('zenity'), expect.any(Object));
    });

    it('returns null when user cancels (exit code 1)', () => {
      const { service } = createService('linux', undefined, { status: 1 });
      expect(service.pickFolder()).toBeNull();
    });
  });

  describe('pickFolder() — Windows (win32)', () => {
    it('returns the selected folder path', () => {
      const { service } = createService('win32', 'C:\\Users\\dev\\my-repo\r\n');
      expect(service.pickFolder()).toBe('C:\\Users\\dev\\my-repo');
    });

    it('calls exec with powershell command', () => {
      const { service, exec } = createService('win32', 'C:\\Users\\dev\\my-repo\r\n');
      service.pickFolder();
      expect(exec).toHaveBeenCalledWith(expect.stringContaining('powershell'), expect.any(Object));
    });

    it('returns null when user cancels (exit code 1)', () => {
      const { service } = createService('win32', undefined, { status: 1 });
      expect(service.pickFolder()).toBeNull();
    });
  });

  describe('error handling', () => {
    it('throws for unsupported platforms', () => {
      const { service } = createService('freebsd' as NodeJS.Platform);
      expect(() => service.pickFolder()).toThrow('Unsupported platform: freebsd');
    });

    it('returns null when exec returns empty string', () => {
      const { service } = createService('darwin', '');
      expect(service.pickFolder()).toBeNull();
    });

    it('returns null when exec returns only whitespace', () => {
      const { service } = createService('darwin', '   \n');
      expect(service.pickFolder()).toBeNull();
    });

    it('re-throws unexpected exec errors (non exit-code-1)', () => {
      const { service } = createService('darwin', undefined, { status: 127, message: 'not found' });
      expect(() => service.pickFolder()).toThrow();
    });

    it('re-throws non-exec errors', () => {
      const { service } = createService('darwin', undefined, new Error('ENOENT'));
      expect(() => service.pickFolder()).toThrow('ENOENT');
    });
  });

  describe('constructor defaults', () => {
    it('creates service with default deps when none provided', () => {
      const service = new FolderDialogService();
      // Should not throw — just validates construction
      expect(service.getCommand()).not.toBeUndefined();
    });
  });
});
