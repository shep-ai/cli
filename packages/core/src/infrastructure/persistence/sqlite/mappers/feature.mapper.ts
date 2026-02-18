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
 * - ApprovalGates flattened to allow_prd, allow_plan, allow_merge columns
 * - PullRequest flattened to pr_url, pr_number, pr_status, commit_hash, ci_status columns
 * - allowMerge also written to auto_merge for backward compatibility
 */

import type { Feature } from '../../../../domain/generated/output.js';
import type { SdlcLifecycle, PrStatus, CiStatus } from '../../../../domain/generated/output.js';

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
  // Workflow configuration (flat columns)
  push: number;
  open_pr: number;
  auto_merge: number;
  allow_prd: number;
  allow_plan: number;
  allow_merge: number;
  worktree_path: string | null;
  // PR tracking (flat columns)
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
    // Flatten workflow flags to individual columns
    push: feature.push ? 1 : 0,
    open_pr: feature.openPr ? 1 : 0,
    auto_merge: feature.approvalGates?.allowMerge ? 1 : 0,
    allow_prd: feature.approvalGates?.allowPrd ? 1 : 0,
    allow_plan: feature.approvalGates?.allowPlan ? 1 : 0,
    allow_merge: feature.approvalGates?.allowMerge ? 1 : 0,
    worktree_path: feature.worktreePath ?? null,
    // Flatten pr to individual columns
    pr_url: feature.pr?.url ?? null,
    pr_number: feature.pr?.number ?? null,
    pr_status: feature.pr?.status ?? null,
    commit_hash: feature.pr?.commitHash ?? null,
    ci_status: feature.pr?.ciStatus ?? null,
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
    // Assemble workflow flags from flat columns
    push: row.push === 1,
    openPr: row.open_pr === 1,
    approvalGates: {
      allowPrd: row.allow_prd === 1,
      allowPlan: row.allow_plan === 1,
      allowMerge: row.allow_merge === 1,
    },
    ...(row.worktree_path !== null && { worktreePath: row.worktree_path }),
    // Assemble pr from flat columns (only when pr_url exists)
    ...(row.pr_url !== null && {
      pr: {
        url: row.pr_url,
        number: row.pr_number!,
        status: row.pr_status as PrStatus,
        ...(row.commit_hash !== null && { commitHash: row.commit_hash }),
        ...(row.ci_status !== null && { ciStatus: row.ci_status as CiStatus }),
      },
    }),
  };
}
