// @vitest-environment node

/**
 * Config File Reader Unit Tests
 *
 * Tests for reading config files and directory listings from repository paths.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  readConfigFiles,
  getDirectoryListing,
  readRepoContext,
} from '@/infrastructure/services/deployment/config-file-reader.js';

describe('Config File Reader', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'config-reader-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('readConfigFiles', () => {
    it('should read existing config files', async () => {
      await writeFile(join(tempDir, 'package.json'), '{"name": "test"}');
      await writeFile(join(tempDir, 'Dockerfile'), 'FROM node:20');

      const files = await readConfigFiles(tempDir);

      expect(files).toHaveLength(2);
      expect(files.find((f) => f.filename === 'package.json')?.content).toBe('{"name": "test"}');
      expect(files.find((f) => f.filename === 'Dockerfile')?.content).toBe('FROM node:20');
    });

    it('should truncate files exceeding 2000 characters', async () => {
      const longContent = 'x'.repeat(3000);
      await writeFile(join(tempDir, 'package.json'), longContent);

      const files = await readConfigFiles(tempDir);

      expect(files).toHaveLength(1);
      const file = files[0];
      expect(file.content.length).toBeLessThan(3000);
      expect(file.content).toContain('... [truncated]');
      // Should have 2000 chars + truncation notice
      expect(file.content.startsWith('x'.repeat(2000))).toBe(true);
    });

    it('should return empty array for directory with no config files', async () => {
      const files = await readConfigFiles(tempDir);
      expect(files).toEqual([]);
    });

    it('should return empty array for non-existent directory', async () => {
      const files = await readConfigFiles('/non/existent/path');
      expect(files).toEqual([]);
    });

    it('should silently skip files that cannot be read', async () => {
      await writeFile(join(tempDir, 'package.json'), '{"name": "test"}');
      // No Dockerfile — should be silently skipped

      const files = await readConfigFiles(tempDir);

      expect(files).toHaveLength(1);
      expect(files[0].filename).toBe('package.json');
    });

    it('should not truncate files at exactly 2000 characters', async () => {
      const content = 'y'.repeat(2000);
      await writeFile(join(tempDir, 'Cargo.toml'), content);

      const files = await readConfigFiles(tempDir);

      expect(files).toHaveLength(1);
      expect(files[0].content).toBe(content);
      expect(files[0].content).not.toContain('... [truncated]');
    });
  });

  describe('getDirectoryListing', () => {
    it('should list files and directories with directory suffix', async () => {
      await writeFile(join(tempDir, 'README.md'), '# Test');
      await mkdir(join(tempDir, 'src'));
      await mkdir(join(tempDir, 'tests'));

      const listing = await getDirectoryListing(tempDir);

      expect(listing).toContain('README.md');
      expect(listing).toContain('src/');
      expect(listing).toContain('tests/');
    });

    it('should exclude node_modules and .git directories', async () => {
      await mkdir(join(tempDir, 'node_modules'));
      await mkdir(join(tempDir, '.git'));
      await mkdir(join(tempDir, 'src'));

      const listing = await getDirectoryListing(tempDir);

      expect(listing).not.toContain('node_modules/');
      expect(listing).not.toContain('.git/');
      expect(listing).toContain('src/');
    });

    it('should exclude dist, build, .next, and __pycache__', async () => {
      await mkdir(join(tempDir, 'dist'));
      await mkdir(join(tempDir, 'build'));
      await mkdir(join(tempDir, '.next'));
      await mkdir(join(tempDir, '__pycache__'));
      await mkdir(join(tempDir, 'lib'));

      const listing = await getDirectoryListing(tempDir);

      expect(listing).not.toContain('dist/');
      expect(listing).not.toContain('build/');
      expect(listing).not.toContain('.next/');
      expect(listing).not.toContain('__pycache__/');
      expect(listing).toContain('lib/');
    });

    it('should return empty array for empty directory', async () => {
      const listing = await getDirectoryListing(tempDir);
      expect(listing).toEqual([]);
    });

    it('should return empty array for non-existent directory', async () => {
      const listing = await getDirectoryListing('/non/existent/path');
      expect(listing).toEqual([]);
    });

    it('should return sorted results', async () => {
      await writeFile(join(tempDir, 'z-file.txt'), '');
      await writeFile(join(tempDir, 'a-file.txt'), '');
      await mkdir(join(tempDir, 'm-dir'));

      const listing = await getDirectoryListing(tempDir);

      expect(listing).toEqual(['a-file.txt', 'm-dir/', 'z-file.txt']);
    });
  });

  describe('readRepoContext', () => {
    it('should return both files and directory listing', async () => {
      await writeFile(join(tempDir, 'package.json'), '{}');
      await mkdir(join(tempDir, 'src'));

      const context = await readRepoContext(tempDir);

      expect(context.files).toHaveLength(1);
      expect(context.files[0].filename).toBe('package.json');
      expect(context.directoryListing).toContain('src/');
    });

    it('should return empty results for empty directory', async () => {
      const context = await readRepoContext(tempDir);

      expect(context.files).toEqual([]);
      expect(context.directoryListing).toEqual([]);
    });
  });
});
