import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createInMemoryDatabase, tableExists } from '../../../helpers/database.helper.js';
import { runSQLiteMigrations } from '@/infrastructure/persistence/sqlite/migrations.js';
import { SQLiteRepositoryRepository } from '@/infrastructure/repositories/sqlite-repository.repository.js';
import type { Repository } from '@/domain/generated/output.js';

describe('SQLiteRepositoryRepository', () => {
  let db: Database.Database;
  let repository: SQLiteRepositoryRepository;

  const createTestRepo = (overrides?: Partial<Repository>): Repository => ({
    id: 'repo-1',
    name: 'my-project',
    path: '/Users/test/my-project',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    db = createInMemoryDatabase();
    await runSQLiteMigrations(db);
    expect(tableExists(db, 'repositories')).toBe(true);
    repository = new SQLiteRepositoryRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('create()', () => {
    it('should create a repository record', async () => {
      const repo = createTestRepo();
      await repository.create(repo);

      const row = db.prepare('SELECT * FROM repositories WHERE id = ?').get('repo-1') as Record<
        string,
        unknown
      >;
      expect(row).toBeDefined();
      expect(row.id).toBe('repo-1');
      expect(row.name).toBe('my-project');
      expect(row.path).toBe('/Users/test/my-project');
    });

    it('should be idempotent for duplicate path (INSERT OR IGNORE)', async () => {
      const repo = createTestRepo();
      await repository.create(repo);
      await repository.create(createTestRepo({ id: 'repo-2' }));

      // Should still only have one record (path is UNIQUE)
      const rows = db.prepare('SELECT * FROM repositories').all();
      expect(rows).toHaveLength(1);
    });

    it('should return the existing entity on UNIQUE path conflict', async () => {
      const repo = createTestRepo();
      await repository.create(repo);

      // Second create with a different id but same path — conflict
      const result = await repository.create(createTestRepo({ id: 'repo-2' }));

      // Must return the ORIGINAL row (id: 'repo-1'), not undefined
      expect(result).toBeDefined();
      expect(result.id).toBe('repo-1');
      expect(result.path).toBe('/Users/test/my-project');
    });

    it('should return the newly created entity when path is new', async () => {
      const repo = createTestRepo();
      const result = await repository.create(repo);

      expect(result).toBeDefined();
      expect(result.id).toBe('repo-1');
      expect(result.path).toBe('/Users/test/my-project');
    });

    it('should default specStorageMode to in-repo when not specified', async () => {
      const repo = createTestRepo();
      const result = await repository.create(repo);

      expect(result.specStorageMode).toBe('in-repo');
    });
  });

  describe('findById()', () => {
    it('should return repository by id', async () => {
      await repository.create(createTestRepo());

      const found = await repository.findById('repo-1');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('repo-1');
      expect(found!.name).toBe('my-project');
      expect(found!.path).toBe('/Users/test/my-project');
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByPath()', () => {
    it('should return repository by path', async () => {
      await repository.create(createTestRepo());

      const found = await repository.findByPath('/Users/test/my-project');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('repo-1');
    });

    it('should return null for non-existent path', async () => {
      const found = await repository.findByPath('/non/existent');
      expect(found).toBeNull();
    });
  });

  describe('list()', () => {
    it('should return all repositories ordered by created_at (insertion order)', async () => {
      await repository.create(
        createTestRepo({
          id: 'r1',
          name: 'beta',
          path: '/b',
          createdAt: new Date('2026-01-01T00:00:00Z'),
        })
      );
      await repository.create(
        createTestRepo({
          id: 'r2',
          name: 'alpha',
          path: '/a',
          createdAt: new Date('2026-01-02T00:00:00Z'),
        })
      );

      const repos = await repository.list();
      expect(repos).toHaveLength(2);
      // beta was added first (earlier createdAt), so it comes first
      expect(repos[0].name).toBe('beta');
      expect(repos[1].name).toBe('alpha');
    });

    it('should return empty array when no repositories exist', async () => {
      const repos = await repository.list();
      expect(repos).toEqual([]);
    });
  });

  describe('remove()', () => {
    it('should delete repository by id', async () => {
      await repository.create(createTestRepo());
      await repository.remove('repo-1');

      const found = await repository.findById('repo-1');
      expect(found).toBeNull();
    });
  });

  describe('findByRemoteUrl()', () => {
    it('should return repository when remoteUrl matches exactly', async () => {
      const repo = createTestRepo({ remoteUrl: 'https://github.com/owner/repo' });
      await repository.create(repo);
      // update remote_url since create() does not insert it
      await repository.update('repo-1', { remoteUrl: 'https://github.com/owner/repo' });

      const found = await repository.findByRemoteUrl('https://github.com/owner/repo');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('repo-1');
      expect(found!.remoteUrl).toBe('https://github.com/owner/repo');
    });

    it('should return repository when URL differs only in .git suffix', async () => {
      await repository.create(createTestRepo());
      await repository.update('repo-1', { remoteUrl: 'https://github.com/owner/repo' });

      const found = await repository.findByRemoteUrl('https://github.com/owner/repo.git');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('repo-1');
    });

    it('should return repository when URL differs only in casing', async () => {
      await repository.create(createTestRepo());
      await repository.update('repo-1', { remoteUrl: 'https://github.com/owner/repo' });

      const found = await repository.findByRemoteUrl('https://github.com/Owner/Repo');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('repo-1');
    });

    it('should return null when no match found', async () => {
      await repository.create(createTestRepo());

      const found = await repository.findByRemoteUrl('https://github.com/other/repo');
      expect(found).toBeNull();
    });

    it('should not return soft-deleted repositories', async () => {
      await repository.create(createTestRepo());
      await repository.update('repo-1', { remoteUrl: 'https://github.com/owner/repo' });
      await repository.softDelete('repo-1');

      const found = await repository.findByRemoteUrl('https://github.com/owner/repo');
      expect(found).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update remoteUrl and updatedAt', async () => {
      await repository.create(createTestRepo());

      const updated = await repository.update('repo-1', {
        remoteUrl: 'https://github.com/owner/repo',
      });

      expect(updated.remoteUrl).toBe('https://github.com/owner/repo');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        new Date('2026-01-01T00:00:00Z').getTime()
      );
    });

    it('should update name without affecting other fields', async () => {
      await repository.create(createTestRepo());
      await repository.update('repo-1', { remoteUrl: 'https://github.com/owner/repo' });

      const updated = await repository.update('repo-1', { name: 'new-name' });

      expect(updated.name).toBe('new-name');
      expect(updated.path).toBe('/Users/test/my-project');
      expect(updated.remoteUrl).toBe('https://github.com/owner/repo');
    });

    it('should update specStorageMode and persist it', async () => {
      await repository.create(createTestRepo());

      const updated = await repository.update('repo-1', {
        specStorageMode: 'shep-managed',
      });

      expect(updated.specStorageMode).toBe('shep-managed');

      const found = await repository.findById('repo-1');
      expect(found!.specStorageMode).toBe('shep-managed');
    });

    it('should throw for nonexistent id', async () => {
      await expect(
        repository.update('nonexistent', { remoteUrl: 'https://github.com/owner/repo' })
      ).rejects.toThrow('Repository not found: nonexistent');
    });
  });

  describe('date handling', () => {
    it('should round-trip dates through create and findById', async () => {
      const repo = createTestRepo({
        createdAt: new Date('2026-06-15T14:30:00Z'),
        updatedAt: new Date('2026-06-15T16:00:00Z'),
      });
      await repository.create(repo);

      const found = await repository.findById('repo-1');
      expect(found!.createdAt).toEqual(new Date('2026-06-15T14:30:00Z'));
      expect(found!.updatedAt).toEqual(new Date('2026-06-15T16:00:00Z'));
    });
  });
});
