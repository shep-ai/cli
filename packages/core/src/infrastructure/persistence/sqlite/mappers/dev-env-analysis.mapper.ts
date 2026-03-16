/**
 * Dev Environment Analysis Database Mapper
 *
 * Maps between DevEnvironmentAnalysis domain objects and SQLite database rows.
 *
 * Mapping Rules:
 * - TypeScript objects (camelCase) <-> SQL columns (snake_case)
 * - Dates stored as INTEGER (unix milliseconds)
 * - JSON arrays/objects stored as TEXT (JSON.stringify)
 * - Optional fields stored as NULL when missing
 * - AnalysisSource stored as string value
 */

import type { DevEnvironmentAnalysis, DevCommand } from '../../../../domain/generated/output.js';
import { type AnalysisSource } from '../../../../domain/generated/output.js';

/**
 * Database row type matching the dev_environment_analyses table schema.
 * Uses snake_case column names.
 */
export interface DevEnvAnalysisRow {
  id: string;
  cache_key: string;
  can_start: number;
  reason: string | null;
  commands: string;
  prerequisites: string | null;
  ports: string | null;
  environment_variables: string | null;
  language: string;
  framework: string | null;
  source: string;
  created_at: number;
  updated_at: number;
}

/**
 * Maps DevEnvironmentAnalysis domain object to database row.
 * Converts Date objects to unix milliseconds, booleans to integers,
 * and arrays/objects to JSON strings.
 */
export function toDatabase(analysis: DevEnvironmentAnalysis): DevEnvAnalysisRow {
  return {
    id: analysis.id,
    cache_key: analysis.cacheKey,
    can_start: analysis.canStart ? 1 : 0,
    reason: analysis.reason ?? null,
    commands: JSON.stringify(analysis.commands),
    prerequisites: analysis.prerequisites ? JSON.stringify(analysis.prerequisites) : null,
    ports: analysis.ports ? JSON.stringify(analysis.ports) : null,
    environment_variables: analysis.environmentVariables
      ? JSON.stringify(analysis.environmentVariables)
      : null,
    language: analysis.language,
    framework: analysis.framework ?? null,
    source: analysis.source,
    created_at:
      analysis.createdAt instanceof Date ? analysis.createdAt.getTime() : analysis.createdAt,
    updated_at:
      analysis.updatedAt instanceof Date ? analysis.updatedAt.getTime() : analysis.updatedAt,
  };
}

/**
 * Maps database row to DevEnvironmentAnalysis domain object.
 * Converts unix milliseconds back to Date objects, integers to booleans,
 * and JSON strings back to arrays/objects.
 */
export function fromDatabase(row: DevEnvAnalysisRow): DevEnvironmentAnalysis {
  return {
    id: row.id,
    cacheKey: row.cache_key,
    canStart: row.can_start === 1,
    commands: JSON.parse(row.commands) as DevCommand[],
    language: row.language,
    source: row.source as AnalysisSource,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    ...(row.reason !== null && { reason: row.reason }),
    ...(row.prerequisites !== null && {
      prerequisites: JSON.parse(row.prerequisites) as string[],
    }),
    ...(row.ports !== null && { ports: JSON.parse(row.ports) as number[] }),
    ...(row.environment_variables !== null && {
      environmentVariables: JSON.parse(row.environment_variables) as Record<string, string>,
    }),
    ...(row.framework !== null && { framework: row.framework }),
  };
}
