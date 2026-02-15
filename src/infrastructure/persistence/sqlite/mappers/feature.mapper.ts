/**
 * Feature Database Mapper
 *
 * Maps between Feature domain objects and SQLite database rows.
 *
 * Mapping Rules:
 * - TypeScript objects (camelCase) <-> SQL columns (snake_case)
 * - Dates stored as INTEGER (unix milliseconds)
 * - Optional fields stored as NULL when missing
 * - Arrays/objects stored as JSON TEXT
 * - SdlcLifecycle stored as string value
 */

import type { Feature } from '../../../../domain/generated/output.js';
import { type SdlcLifecycle } from '../../../../domain/generated/output.js';
import type { DashboardFeature } from '../../../../application/ports/output/repositories/feature-repository.interface.js';

/**
 * Database row type matching the features table schema.
 * Uses snake_case column names.
 */
export interface FeatureRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  repository_path: string;
  branch: string;
  lifecycle: string;
  messages: string;
  plan: string | null;
  related_artifacts: string;
  agent_run_id: string | null;
  spec_path: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Database row type for features LEFT JOINed with agent_runs.
 */
export interface DashboardFeatureRow extends FeatureRow {
  agent_status: string | null;
  agent_error: string | null;
  agent_result: string | null;
  agent_type: string | null;
}

/**
 * Maps a feature+agent_run joined row to a DashboardFeature.
 */
export function fromDashboardDatabase(row: DashboardFeatureRow): DashboardFeature {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    repositoryPath: row.repository_path,
    branch: row.branch,
    lifecycle: row.lifecycle,
    ...(row.spec_path !== null && { specPath: row.spec_path }),
    ...(row.agent_status !== null && { agentStatus: row.agent_status }),
    ...(row.agent_error !== null && { agentError: row.agent_error }),
    ...(row.agent_result !== null && { agentResult: row.agent_result }),
    ...(row.agent_type !== null && { agentType: row.agent_type }),
  };
}

/**
 * Maps Feature domain object to database row.
 * Converts Date objects to unix milliseconds and complex fields to JSON for SQL storage.
 *
 * @param feature - Feature domain object
 * @returns Database row object with snake_case columns
 */
export function toDatabase(feature: Feature): FeatureRow {
  return {
    id: feature.id,
    name: feature.name,
    slug: feature.slug,
    description: feature.description,
    repository_path: feature.repositoryPath,
    branch: feature.branch,
    lifecycle: feature.lifecycle,
    messages: JSON.stringify(feature.messages),
    plan: feature.plan !== undefined ? JSON.stringify(feature.plan) : null,
    related_artifacts: JSON.stringify(feature.relatedArtifacts),
    agent_run_id: feature.agentRunId ?? null,
    spec_path: feature.specPath ?? null,
    created_at: feature.createdAt instanceof Date ? feature.createdAt.getTime() : feature.createdAt,
    updated_at: feature.updatedAt instanceof Date ? feature.updatedAt.getTime() : feature.updatedAt,
  };
}

/**
 * Maps database row to Feature domain object.
 * Converts unix milliseconds back to Date objects and JSON strings to arrays/objects.
 *
 * @param row - Database row with snake_case columns
 * @returns Feature domain object with camelCase properties
 */
export function fromDatabase(row: FeatureRow): Feature {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    repositoryPath: row.repository_path,
    branch: row.branch,
    lifecycle: row.lifecycle as SdlcLifecycle,
    messages: JSON.parse(row.messages),
    relatedArtifacts: JSON.parse(row.related_artifacts),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    ...(row.plan !== null && { plan: JSON.parse(row.plan) }),
    ...(row.agent_run_id !== null && { agentRunId: row.agent_run_id }),
    ...(row.spec_path !== null && { specPath: row.spec_path }),
  };
}
