/**
 * SQLite Feature Repository Implementation
 *
 * Implements IFeatureRepository using SQLite database.
 * Uses prepared statements to prevent SQL injection.
 */

import type Database from 'better-sqlite3';
import { injectable } from 'tsyringe';
import type {
  IFeatureRepository,
  FeatureListFilters,
} from '../../application/ports/output/feature-repository.interface.js';
import type { Feature } from '../../domain/generated/output.js';
import {
  toDatabase,
  fromDatabase,
  type FeatureRow,
} from '../persistence/sqlite/mappers/feature.mapper.js';

/**
 * SQLite implementation of IFeatureRepository.
 * Manages Feature persistence with CRUD operations.
 */
@injectable()
export class SQLiteFeatureRepository implements IFeatureRepository {
  constructor(private readonly db: Database.Database) {}

  async create(feature: Feature): Promise<void> {
    const row = toDatabase(feature);

    const stmt = this.db.prepare(`
      INSERT INTO features (
        id, name, slug, description, repository_path, branch,
        lifecycle, messages, plan, related_artifacts,
        agent_run_id, created_at, updated_at
      ) VALUES (
        @id, @name, @slug, @description, @repository_path, @branch,
        @lifecycle, @messages, @plan, @related_artifacts,
        @agent_run_id, @created_at, @updated_at
      )
    `);

    stmt.run(row);
  }

  async findById(id: string): Promise<Feature | null> {
    const stmt = this.db.prepare('SELECT * FROM features WHERE id = ?');
    const row = stmt.get(id) as FeatureRow | undefined;

    if (!row) {
      return null;
    }

    return fromDatabase(row);
  }

  async findByIdPrefix(prefix: string): Promise<Feature | null> {
    const stmt = this.db.prepare('SELECT * FROM features WHERE id LIKE ?');
    const rows = stmt.all(`${prefix}%`) as FeatureRow[];

    if (rows.length === 0) return null;
    if (rows.length > 1) {
      throw new Error(
        `Ambiguous ID prefix "${prefix}" matches ${rows.length} features. Use a longer prefix.`
      );
    }

    return fromDatabase(rows[0]);
  }

  async findBySlug(slug: string, repositoryPath: string): Promise<Feature | null> {
    const stmt = this.db.prepare('SELECT * FROM features WHERE slug = ? AND repository_path = ?');
    const row = stmt.get(slug, repositoryPath) as FeatureRow | undefined;

    if (!row) {
      return null;
    }

    return fromDatabase(row);
  }

  async list(filters?: FeatureListFilters): Promise<Feature[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.repositoryPath) {
      conditions.push('repository_path = ?');
      params.push(filters.repositoryPath);
    }

    if (filters?.lifecycle) {
      conditions.push('lifecycle = ?');
      params.push(filters.lifecycle);
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT * FROM features${where}`);
    const rows = stmt.all(...params) as FeatureRow[];

    return rows.map(fromDatabase);
  }

  async update(feature: Feature): Promise<void> {
    const row = toDatabase(feature);

    const stmt = this.db.prepare(`
      UPDATE features SET
        name = @name,
        slug = @slug,
        description = @description,
        repository_path = @repository_path,
        branch = @branch,
        lifecycle = @lifecycle,
        messages = @messages,
        plan = @plan,
        related_artifacts = @related_artifacts,
        agent_run_id = @agent_run_id,
        updated_at = @updated_at
      WHERE id = @id
    `);

    stmt.run(row);
  }

  async delete(id: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM features WHERE id = ?');
    stmt.run(id);
  }
}
