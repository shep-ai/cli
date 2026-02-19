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
import {
  type SdlcLifecycle,
  type PrStatus,
  type CiStatus,
} from '../../../../domain/generated/output.js';

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
  // Workflow flags
  open_pr: number;
  auto_merge: number;
  allow_prd: number;
  allow_plan: number;
  allow_merge: number;
  // PR tracking state
  pr_url: string | null;
  pr_number: number | null;
  pr_status: string | null;
  commit_hash: string | null;
  ci_status: string | null;
  created_at: number;
  updated_at: number;
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
    // Workflow flags (boolean → INTEGER)
    open_pr: feature.openPr ? 1 : 0,
    auto_merge: feature.autoMerge ? 1 : 0,
    allow_prd: feature.allowPrd ? 1 : 0,
    allow_plan: feature.allowPlan ? 1 : 0,
    allow_merge: feature.allowMerge ? 1 : 0,
    // PR tracking state (optional → NULL)
    pr_url: feature.prUrl ?? null,
    pr_number: feature.prNumber ?? null,
    pr_status: feature.prStatus ?? null,
    commit_hash: feature.commitHash ?? null,
    ci_status: feature.ciStatus ?? null,
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
    // Workflow flags (INTEGER → boolean)
    openPr: row.open_pr === 1,
    autoMerge: row.auto_merge === 1,
    allowPrd: row.allow_prd === 1,
    allowPlan: row.allow_plan === 1,
    allowMerge: row.allow_merge === 1,
    // PR tracking state (NULL → undefined)
    ...(row.pr_url !== null && { prUrl: row.pr_url }),
    ...(row.pr_number !== null && { prNumber: row.pr_number }),
    ...(row.pr_status !== null && { prStatus: row.pr_status as PrStatus }),
    ...(row.commit_hash !== null && { commitHash: row.commit_hash }),
    ...(row.ci_status !== null && { ciStatus: row.ci_status as CiStatus }),
  };
}
