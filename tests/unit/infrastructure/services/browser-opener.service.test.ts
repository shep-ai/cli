import { describe, it, expect, vi } from 'vitest';
import {
  BrowserOpenerService,
  type BrowserOpenerDeps,
} from '@/infrastructure/services/browser-opener.service.js';

function createMockChild() {
  return { unref: vi.fn() };
}

function createService(platform: NodeJS.Platform, execFileError?: Error) {
  const child = createMockChild();
  const execFile = vi
    .fn<BrowserOpenerDeps['execFile']>()
    .mockImplementation(
      (_cmd: string, _args: readonly string[], callback: (error: Error | null) => void) => {
        if (execFileError) {
          callback(execFileError);
        } else {
          callback(null);
        }
        return child as unknown as ReturnType<BrowserOpenerDeps['execFile']>;
      }
    );
  const warn = vi.fn();
  const service = new BrowserOpenerService({ platform, execFile, warn });
  return { service, execFile, warn, child };
}

describe('BrowserOpenerService', () => {
  const testUrl = 'http://localhost:3000';

  describe('darwin (macOS)', () => {
    it('calls execFile with "open" command and url as argument', () => {
      const { service, execFile } = createService('darwin');
      service.open(testUrl);
      expect(execFile).toHaveBeenCalledWith('open', [testUrl], expect.any(Function));
    });

    it('calls unref on the child process', () => {
      const { service, child } = createService('darwin');
      service.open(testUrl);
      expect(child.unref).toHaveBeenCalled();
    });
  });

  describe('linux', () => {
    it('calls execFile with "xdg-open" command and url as argument', () => {
      const { service, execFile } = createService('linux');
      service.open(testUrl);
      expect(execFile).toHaveBeenCalledWith('xdg-open', [testUrl], expect.any(Function));
    });

    it('calls unref on the child process', () => {
      const { service, child } = createService('linux');
      service.open(testUrl);
      expect(child.unref).toHaveBeenCalled();
    });
  });

  describe('win32 (Windows)', () => {
    it('calls execFile with "cmd" and /c start args', () => {
      const { service, execFile } = createService('win32');
      service.open(testUrl);
      expect(execFile).toHaveBeenCalledWith(
        'cmd',
        ['/c', 'start', '', testUrl],
        expect.any(Function)
      );
    });

    it('calls unref on the child process', () => {
      const { service, child } = createService('win32');
      service.open(testUrl);
      expect(child.unref).toHaveBeenCalled();
    });
  });

  describe('unsupported platform', () => {
    it('does not call execFile on unsupported platform', () => {
      const { service, execFile } = createService('freebsd' as NodeJS.Platform);
      service.open(testUrl);
      expect(execFile).not.toHaveBeenCalled();
    });

    it('does not call warn on unsupported platform', () => {
      const { service, warn } = createService('freebsd' as NodeJS.Platform);
      service.open(testUrl);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('calls warn when execFile fails', () => {
      const error = new Error('xdg-open not found');
      const { service, warn } = createService('linux', error);
      service.open(testUrl);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('xdg-open not found'));
    });

    it('does not throw when execFile fails', () => {
      const error = new Error('command not found');
      const { service } = createService('darwin', error);
      expect(() => service.open(testUrl)).not.toThrow();
    });
  });

  describe('constructor defaults', () => {
    it('creates service with default deps when none provided', () => {
      const service = new BrowserOpenerService();
      expect(service).toBeInstanceOf(BrowserOpenerService);
    });
  });
});
