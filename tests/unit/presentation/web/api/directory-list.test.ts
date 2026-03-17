// @vitest-environment node

/**
 * API Route Tests: GET /api/directory/list
 *
 * Tests for the directory listing endpoint used by the React file manager.
 * Validates path security (absolute paths, traversal prevention), filtering
 * (directories only, hidden files), and error handling (permission denied,
 * non-existent paths).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'node:path';

// --- Mocks ---

const mockReaddir = vi.fn();
const mockStat = vi.fn();
const mockAccess = vi.fn();

vi.mock('node:fs/promises', () => ({
  readdir: (...args: unknown[]) => mockReaddir(...args),
  stat: (...args: unknown[]) => mockStat(...args),
  access: (...args: unknown[]) => mockAccess(...args),
}));

vi.mock('node:os', () => ({
  homedir: () => '/home/testuser',
}));

// --- Helpers ---

interface MockDirent {
  name: string;
  isDirectory: () => boolean;
  isSymbolicLink: () => boolean;
}

function makeDirent(name: string, isDir: boolean, isSymlink = false): MockDirent {
  return {
    name,
    isDirectory: () => isDir,
    isSymbolicLink: () => isSymlink,
  };
}

function makeStat(mtime: Date = new Date('2026-03-15T10:30:00Z')) {
  return { mtime, isDirectory: () => true };
}

function makeRequest(queryParams?: Record<string, string>): Request {
  const url = new URL('http://localhost:3000/api/directory/list');
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }
  return new Request(url.toString(), { method: 'GET' });
}

// --- Tests ---

describe('GET /api/directory/list', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let routeModule: typeof import('@/app/api/directory/list/route');

  beforeEach(async () => {
    vi.clearAllMocks();
    routeModule = await import(
      '../../../../../src/presentation/web/app/api/directory/list/route.js'
    );
  });

  describe('successful listing', () => {
    it('returns 200 with directory entries for a valid absolute path', async () => {
      const dirents = [makeDirent('projects', true), makeDirent('documents', true)];
      mockReaddir.mockResolvedValueOnce(dirents);
      mockStat
        .mockResolvedValueOnce(makeStat()) // access check for target dir
        .mockResolvedValueOnce(makeStat(new Date('2026-03-10T08:00:00Z')))
        .mockResolvedValueOnce(makeStat(new Date('2026-03-12T14:00:00Z')));

      const response = await routeModule.GET(makeRequest({ path: '/home/testuser' }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.currentPath).toBe('/home/testuser');
      expect(body.entries).toHaveLength(2);
      expect(body.entries[0]).toEqual({
        name: 'projects',
        path: path.join('/home/testuser', 'projects'),
        isDirectory: true,
        updatedAt: '2026-03-10T08:00:00.000Z',
      });
      expect(body.entries[1]).toEqual({
        name: 'documents',
        path: path.join('/home/testuser', 'documents'),
        isDirectory: true,
        updatedAt: '2026-03-12T14:00:00.000Z',
      });
    });

    it('defaults to os.homedir() when path param is omitted', async () => {
      mockReaddir.mockResolvedValueOnce([]);
      mockStat.mockResolvedValueOnce(makeStat());

      const response = await routeModule.GET(makeRequest());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.currentPath).toBe('/home/testuser');
      expect(mockReaddir).toHaveBeenCalledWith('/home/testuser', { withFileTypes: true });
    });

    it('returns empty entries array for an empty directory', async () => {
      mockReaddir.mockResolvedValueOnce([]);
      mockStat.mockResolvedValueOnce(makeStat());

      const response = await routeModule.GET(makeRequest({ path: '/home/testuser/empty' }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.entries).toEqual([]);
      expect(body.currentPath).toBe('/home/testuser/empty');
    });
  });

  describe('directory-only filtering (FR-7)', () => {
    it('only returns directories, not files', async () => {
      const dirents = [
        makeDirent('src', true),
        makeDirent('readme.md', false),
        makeDirent('package.json', false),
        makeDirent('node_modules', true),
      ];
      mockReaddir.mockResolvedValueOnce(dirents);
      mockStat
        .mockResolvedValueOnce(makeStat()) // access check
        .mockResolvedValueOnce(makeStat())
        .mockResolvedValueOnce(makeStat());

      const response = await routeModule.GET(makeRequest({ path: '/home/testuser/project' }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.entries).toHaveLength(2);
      expect(body.entries.map((e: { name: string }) => e.name)).toEqual(['src', 'node_modules']);
    });
  });

  describe('hidden entries filtering (FR-8)', () => {
    it('excludes hidden entries (starting with .) by default', async () => {
      const dirents = [
        makeDirent('.config', true),
        makeDirent('.local', true),
        makeDirent('projects', true),
        makeDirent('.hidden-dir', true),
      ];
      mockReaddir.mockResolvedValueOnce(dirents);
      mockStat
        .mockResolvedValueOnce(makeStat()) // access check
        .mockResolvedValueOnce(makeStat());

      const response = await routeModule.GET(makeRequest({ path: '/home/testuser' }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.entries).toHaveLength(1);
      expect(body.entries[0].name).toBe('projects');
    });

    it('includes hidden entries when showHidden=true', async () => {
      const dirents = [makeDirent('.config', true), makeDirent('projects', true)];
      mockReaddir.mockResolvedValueOnce(dirents);
      mockStat
        .mockResolvedValueOnce(makeStat()) // access check
        .mockResolvedValueOnce(makeStat())
        .mockResolvedValueOnce(makeStat());

      const response = await routeModule.GET(
        makeRequest({ path: '/home/testuser', showHidden: 'true' })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.entries).toHaveLength(2);
      expect(body.entries.map((e: { name: string }) => e.name)).toEqual(['.config', 'projects']);
    });
  });

  describe('path validation and security', () => {
    it('returns 400 for relative paths (NFR-1)', async () => {
      const response = await routeModule.GET(makeRequest({ path: 'relative/path' }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Path must be absolute');
    });

    it('returns 400 for dot-relative paths', async () => {
      const response = await routeModule.GET(makeRequest({ path: './some/path' }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Path must be absolute');
    });

    it('resolves path with ../ sequences via path.resolve() (NFR-2)', async () => {
      mockReaddir.mockResolvedValueOnce([]);
      mockStat.mockResolvedValueOnce(makeStat());

      const response = await routeModule.GET(
        makeRequest({ path: '/home/testuser/projects/../documents' })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.currentPath).toBe(path.resolve('/home/testuser/projects/../documents'));
      expect(mockReaddir).toHaveBeenCalledWith(
        path.resolve('/home/testuser/projects/../documents'),
        { withFileTypes: true }
      );
    });

    it('returns 404 for non-existent paths', async () => {
      const err = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      mockStat.mockRejectedValueOnce(err);

      const response = await routeModule.GET(makeRequest({ path: '/home/testuser/nonexistent' }));
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Directory not found');
    });

    it('returns 400 when path points to a file, not a directory', async () => {
      mockStat.mockResolvedValueOnce({ mtime: new Date(), isDirectory: () => false });

      const response = await routeModule.GET(makeRequest({ path: '/home/testuser/file.txt' }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Path is not a directory');
    });
  });

  describe('permission errors and edge cases (task-5)', () => {
    it('skips entries where stat throws permission error', async () => {
      const dirents = [
        makeDirent('accessible', true),
        makeDirent('restricted', true),
        makeDirent('also-accessible', true),
      ];
      mockReaddir.mockResolvedValueOnce(dirents);
      mockStat
        .mockResolvedValueOnce(makeStat()) // access check for target dir
        .mockResolvedValueOnce(makeStat(new Date('2026-03-10T08:00:00Z'))) // accessible
        .mockRejectedValueOnce(Object.assign(new Error('EACCES'), { code: 'EACCES' })) // restricted
        .mockResolvedValueOnce(makeStat(new Date('2026-03-12T14:00:00Z'))); // also-accessible

      const response = await routeModule.GET(makeRequest({ path: '/home/testuser' }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.entries).toHaveLength(2);
      expect(body.entries.map((e: { name: string }) => e.name)).toEqual([
        'accessible',
        'also-accessible',
      ]);
    });

    it('each entry includes updatedAt as ISO 8601 string', async () => {
      const mtime = new Date('2026-01-15T12:00:00Z');
      mockReaddir.mockResolvedValueOnce([makeDirent('my-dir', true)]);
      mockStat
        .mockResolvedValueOnce(makeStat()) // access check
        .mockResolvedValueOnce(makeStat(mtime));

      const response = await routeModule.GET(makeRequest({ path: '/home/testuser' }));
      const body = await response.json();

      expect(body.entries[0].updatedAt).toBe('2026-01-15T12:00:00.000Z');
    });

    it('includes symlinks that resolve to directories', async () => {
      const dirents = [
        makeDirent('real-dir', true),
        makeDirent('symlink-to-dir', false, true),
        makeDirent('symlink-to-file', false, true),
      ];
      mockReaddir.mockResolvedValueOnce(dirents);
      mockStat
        .mockResolvedValueOnce(makeStat()) // access check
        .mockResolvedValueOnce(makeStat()) // real-dir
        .mockResolvedValueOnce({ mtime: new Date(), isDirectory: () => true }) // symlink-to-dir (stat follows symlinks)
        .mockResolvedValueOnce({ mtime: new Date(), isDirectory: () => false }); // symlink-to-file

      const response = await routeModule.GET(makeRequest({ path: '/home/testuser' }));
      const body = await response.json();

      expect(body.entries).toHaveLength(2);
      expect(body.entries.map((e: { name: string }) => e.name)).toEqual([
        'real-dir',
        'symlink-to-dir',
      ]);
    });

    it('excludes broken symlinks', async () => {
      const dirents = [makeDirent('good-dir', true), makeDirent('broken-symlink', false, true)];
      mockReaddir.mockResolvedValueOnce(dirents);
      mockStat
        .mockResolvedValueOnce(makeStat()) // access check
        .mockResolvedValueOnce(makeStat()) // good-dir
        .mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' })); // broken symlink

      const response = await routeModule.GET(makeRequest({ path: '/home/testuser' }));
      const body = await response.json();

      expect(body.entries).toHaveLength(1);
      expect(body.entries[0].name).toBe('good-dir');
    });

    it('returns 500 for unexpected errors during readdir', async () => {
      mockStat.mockResolvedValueOnce(makeStat());
      mockReaddir.mockRejectedValueOnce(new Error('Unexpected IO error'));

      const response = await routeModule.GET(makeRequest({ path: '/home/testuser' }));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Unexpected IO error');
    });
  });
});
