/**
 * SQLite Repository Repository Implementation
 *
 * Implements IRepositoryRepository using better-sqlite3.
 */

import type Database from 'better-sqlite3';
import { injectable } from 'tsyringe';
import type { IRepositoryRepository } from '../../application/ports/output/repositories/repository-repository.interface.js';
import type { Repository } from '../../domain/generated/output.js';
import {
  toDatabase,
  fromDatabase,
  type RepositoryRow,
} from '../persistence/sqlite/mappers/repository.mapper.js';

@injectable()
export class SQLiteRepositoryRepository implements IRepositoryRepository {
  constructor(private readonly db: Database.Database) {}

  async create(repository: Repository): Promise<void> {
    const row = toDatabase(repository);
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO repositories (id, name, path, created_at, updated_at)
      VALUES (@id, @name, @path, @created_at, @updated_at)
    `);
    stmt.run(row);
  }

  async findById(id: string): Promise<Repository | null> {
    const stmt = this.db.prepare('SELECT * FROM repositories WHERE id = ?');
    const row = stmt.get(id) as RepositoryRow | undefined;
    return row ? fromDatabase(row) : null;
  }

  async findByPath(path: string): Promise<Repository | null> {
    const stmt = this.db.prepare('SELECT * FROM repositories WHERE path = ?');
    const row = stmt.get(path) as RepositoryRow | undefined;
    return row ? fromDatabase(row) : null;
  }

  async list(): Promise<Repository[]> {
    const stmt = this.db.prepare('SELECT * FROM repositories ORDER BY name');
    const rows = stmt.all() as RepositoryRow[];
    return rows.map(fromDatabase);
  }

  async remove(id: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM repositories WHERE id = ?');
    stmt.run(id);
  }
}
