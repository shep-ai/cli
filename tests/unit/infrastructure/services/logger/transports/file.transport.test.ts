import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFileTransport } from '../../../../../../src/infrastructure/services/logger/transports/file.transport.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Test suite for File Transport.
 *
 * Tests the file transport factory for pino logger with rotation.
 * Uses pino-roll for daily rotation and size-based rotation.
 *
 * TDD Phase: RED
 * - Tests written BEFORE implementation
 */
describe('File Transport', () => {
  const testLogDir = path.join(os.tmpdir(), 'shep-test-logs');

  beforeEach(() => {
    // Clean up test log directory
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test log directory
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  describe('createFileTransport', () => {
    it('should create a transport object with pino-roll target', () => {
      const transport = createFileTransport(testLogDir);

      expect(transport).toBeDefined();
      expect(transport).toHaveProperty('target');
      expect(transport.target).toBe('pino-roll');
    });

    it('should configure daily rotation frequency', () => {
      const transport = createFileTransport(testLogDir);

      expect(transport.options).toHaveProperty('frequency', 'daily');
    });

    it('should configure 100MB size limit', () => {
      const transport = createFileTransport(testLogDir);

      expect(transport.options).toHaveProperty('size', '100m');
    });

    it('should configure 30 day retention', () => {
      const transport = createFileTransport(testLogDir);

      expect(transport.options).toHaveProperty('retention', 30);
    });

    it('should configure file pattern with date', () => {
      const transport = createFileTransport(testLogDir);

      expect(transport.options).toHaveProperty('file');
      const filePattern = transport.options.file as string;
      expect(filePattern).toMatch(/shep\.\d{4}-\d{2}-\d{2}\.log$/);
    });

    it('should configure symlink to current.log', () => {
      const transport = createFileTransport(testLogDir);

      expect(transport.options).toHaveProperty('link');
      const linkPath = transport.options.link as string;
      expect(linkPath).toContain('current.log');
    });

    it('should use absolute path for log directory', () => {
      const transport = createFileTransport(testLogDir);

      const filePattern = transport.options.file as string;
      expect(path.isAbsolute(filePattern)).toBe(true);
    });

    it('should handle custom log directory path', () => {
      const customDir = path.join(testLogDir, 'custom');
      const transport = createFileTransport(customDir);

      const filePattern = transport.options.file as string;
      expect(filePattern).toContain('custom');
    });

    it('should expand tilde in home directory path', () => {
      const homeDir = '~/.shep/logs';
      const transport = createFileTransport(homeDir);

      const filePattern = transport.options.file as string;
      // Should be expanded to actual home directory
      expect(filePattern).not.toContain('~');
      expect(path.isAbsolute(filePattern)).toBe(true);
    });

    it('should create log directory if it does not exist', () => {
      const newDir = path.join(testLogDir, 'new-logs');
      expect(fs.existsSync(newDir)).toBe(false);

      createFileTransport(newDir);

      expect(fs.existsSync(newDir)).toBe(true);
    });

    it('should set directory permissions to 0700', () => {
      const newDir = path.join(testLogDir, 'secure-logs');

      createFileTransport(newDir);

      const stats = fs.statSync(newDir);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o700);
    });

    it('should not error if directory already exists', () => {
      fs.mkdirSync(testLogDir, { recursive: true });

      expect(() => {
        createFileTransport(testLogDir);
      }).not.toThrow();
    });

    it('should configure extension for rotated files', () => {
      const transport = createFileTransport(testLogDir);

      expect(transport.options).toHaveProperty('extension', '.log');
    });

    it('should enable sync writes for reliability', () => {
      const transport = createFileTransport(testLogDir);

      expect(transport.options).toHaveProperty('sync', true);
    });
  });

  describe('File naming patterns', () => {
    it('should generate correct file path for today', () => {
      const transport = createFileTransport(testLogDir);
      const filePattern = transport.options.file as string;

      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');

      expect(filePattern).toContain(`shep.${year}-${month}-${day}.log`);
    });

    it('should include directory in file path', () => {
      const transport = createFileTransport(testLogDir);
      const filePattern = transport.options.file as string;

      expect(filePattern).toContain(testLogDir);
    });
  });
});
