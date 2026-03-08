import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, mkdirSync, readdirSync } from 'fs';
import { rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';
import { AttachmentStorageService } from '@shepai/core/infrastructure/services/attachment-storage.service';

let tmpDir: string;
let service: AttachmentStorageService;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'shep-attach-test-'));
  // Create .shep directory to simulate repo structure
  mkdirSync(join(tmpDir, '.shep'), { recursive: true });
  service = new AttachmentStorageService();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function createTestBuffer(content = 'test file content'): Buffer {
  return Buffer.from(content, 'utf-8');
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

describe('AttachmentStorageService', () => {
  describe('store()', () => {
    it('writes file to pending dir and returns Attachment with correct fields', () => {
      const buf = createTestBuffer();
      const result = service.store(buf, 'screenshot.png', 'image/png', 'session-1', tmpDir);

      expect(result.name).toBe('screenshot.png');
      expect(result.size).toBe(BigInt(buf.length));
      expect(result.mimeType).toBe('image/png');
      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.sha256).toBe(sha256(buf));

      // File should exist on disk
      const expectedDir = join(tmpDir, '.shep', 'attachments', 'pending-session-1');
      expect(existsSync(expectedDir)).toBe(true);
      const writtenContent = readFileSync(join(expectedDir, 'screenshot.png'));
      expect(writtenContent).toEqual(buf);
    });

    it('returns existing record without writing when SHA-256 matches (dedup)', () => {
      const buf = createTestBuffer('same content');

      const result1 = service.store(buf, 'file1.png', 'image/png', 'session-1', tmpDir);
      const result2 = service.store(buf, 'file2.png', 'image/png', 'session-1', tmpDir);

      expect(result2.id).toBe(result1.id);
      expect(result2.name).toBe(result1.name);
      // Second file should NOT exist on disk
      const pendingDir = join(tmpDir, '.shep', 'attachments', 'pending-session-1');
      expect(existsSync(join(pendingDir, 'file2.png'))).toBe(false);
    });

    it('sanitizes filename containing path traversal (../) and spaces', () => {
      const buf = createTestBuffer();
      const result = service.store(
        buf,
        '../../etc/passwd test file.png',
        'image/png',
        'session-1',
        tmpDir
      );

      expect(result.name).not.toContain('..');
      expect(result.name).not.toContain('/');
      // File should be stored with sanitized name
      const pendingDir = join(tmpDir, '.shep', 'attachments', 'pending-session-1');
      const files = readdirSync(pendingDir);
      expect(files.length).toBe(1);
      expect(files[0]).not.toContain('..');
    });
  });

  describe('commit()', () => {
    it('renames pending dir to slug dir and returns updated paths', () => {
      const buf = createTestBuffer();
      service.store(buf, 'screenshot.png', 'image/png', 'session-1', tmpDir);

      const attachments = service.commit('session-1', 'my-feature', tmpDir);

      expect(attachments.length).toBe(1);
      expect(attachments[0].path).toContain('my-feature');
      expect(attachments[0].path).not.toContain('pending');

      // Pending dir should no longer exist
      const pendingDir = join(tmpDir, '.shep', 'attachments', 'pending-session-1');
      expect(existsSync(pendingDir)).toBe(false);

      // Slug dir should exist
      const slugDir = join(tmpDir, '.shep', 'attachments', 'my-feature');
      expect(existsSync(slugDir)).toBe(true);
      expect(existsSync(join(slugDir, 'screenshot.png'))).toBe(true);
    });
  });

  describe('store() edge cases', () => {
    it('handles zero-byte file', () => {
      const buf = Buffer.alloc(0);
      const result = service.store(buf, 'empty.txt', 'text/plain', 'session-1', tmpDir);

      expect(result.size).toBe(BigInt(0));
      expect(result.name).toBe('empty.txt');
      const pendingDir = join(tmpDir, '.shep', 'attachments', 'pending-session-1');
      expect(existsSync(join(pendingDir, 'empty.txt'))).toBe(true);
    });

    it('sanitizes filename with unicode characters', () => {
      const buf = createTestBuffer();
      const result = service.store(buf, 'café_résumé.pdf', 'application/pdf', 'session-1', tmpDir);

      // Non-ASCII chars replaced with underscores
      expect(result.name).not.toContain('é');
      expect(result.name).toMatch(/\.pdf$/);
    });

    it('handles filename that is only dots', () => {
      const buf = createTestBuffer();
      const result = service.store(buf, '...', 'text/plain', 'session-1', tmpDir);

      // Leading dots stripped, empty name falls back to 'unnamed'
      expect(result.name).toBe('unnamed');
    });

    it('isolates dedup across different sessions', () => {
      const buf = createTestBuffer('same content');

      const r1 = service.store(buf, 'file.png', 'image/png', 'session-A', tmpDir);
      const r2 = service.store(buf, 'file.png', 'image/png', 'session-B', tmpDir);

      // Different sessions should get different records even with same content
      expect(r2.id).not.toBe(r1.id);
    });
  });

  describe('commit() edge cases', () => {
    it('returns empty array when no pending dir exists', () => {
      const result = service.commit('nonexistent-session', 'my-feature', tmpDir);
      expect(result).toEqual([]);
    });
  });

  describe('delete()', () => {
    it('removes the attachment directory', () => {
      const buf = createTestBuffer();
      service.store(buf, 'file.png', 'image/png', 'session-1', tmpDir);
      service.commit('session-1', 'my-feature', tmpDir);

      const slugDir = join(tmpDir, '.shep', 'attachments', 'my-feature');
      expect(existsSync(slugDir)).toBe(true);

      service.delete('my-feature', tmpDir);

      expect(existsSync(slugDir)).toBe(false);
    });

    it('does not throw when directory does not exist', () => {
      expect(() => service.delete('nonexistent', tmpDir)).not.toThrow();
    });
  });
});
