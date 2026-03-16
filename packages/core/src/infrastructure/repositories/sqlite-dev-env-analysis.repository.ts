/**
 * SQLite Dev Environment Analysis Repository Implementation
 *
 * Implements IDevEnvAnalysisRepository using SQLite database.
 * Uses prepared statements to prevent SQL injection.
 * Stores cached analysis results keyed by cache_key (git remote URL or root repo path).
 */

import type Database from 'better-sqlite3';
import { injectable } from 'tsyringe';
import type { IDevEnvAnalysisRepository } from '../../application/ports/output/repositories/dev-env-analysis-repository.interface.js';
import type { DevEnvironmentAnalysis } from '../../domain/generated/output.js';
import {
  toDatabase,
  fromDatabase,
  type DevEnvAnalysisRow,
} from '../persistence/sqlite/mappers/dev-env-analysis.mapper.js';

/**
 * SQLite implementation of IDevEnvAnalysisRepository.
 * Manages DevEnvironmentAnalysis persistence with CRUD operations.
 */
@injectable()
export class SQLiteDevEnvAnalysisRepository implements IDevEnvAnalysisRepository {
  constructor(private readonly db: Database.Database) {}

  async findByCacheKey(cacheKey: string): Promise<DevEnvironmentAnalysis | null> {
    const stmt = this.db.prepare('SELECT * FROM dev_environment_analyses WHERE cache_key = ?');
    const row = stmt.get(cacheKey) as DevEnvAnalysisRow | undefined;

    if (!row) {
      return null;
    }

    return fromDatabase(row);
  }

  async save(analysis: DevEnvironmentAnalysis): Promise<void> {
    const row = toDatabase(analysis);

    const stmt = this.db.prepare(`
      INSERT INTO dev_environment_analyses (
        id, cache_key, can_start, reason, commands,
        prerequisites, ports, environment_variables,
        language, framework, source,
        created_at, updated_at
      ) VALUES (
        @id, @cache_key, @can_start, @reason, @commands,
        @prerequisites, @ports, @environment_variables,
        @language, @framework, @source,
        @created_at, @updated_at
      )
    `);

    stmt.run(row);
  }

  async update(analysis: DevEnvironmentAnalysis): Promise<void> {
    const row = toDatabase(analysis);

    const stmt = this.db.prepare(`
      UPDATE dev_environment_analyses SET
        can_start = @can_start,
        reason = @reason,
        commands = @commands,
        prerequisites = @prerequisites,
        ports = @ports,
        environment_variables = @environment_variables,
        language = @language,
        framework = @framework,
        source = @source,
        updated_at = @updated_at
      WHERE cache_key = @cache_key
    `);

    stmt.run(row);
  }

  async deleteByCacheKey(cacheKey: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM dev_environment_analyses WHERE cache_key = ?');
    stmt.run(cacheKey);
  }
}
