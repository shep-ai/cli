/**
 * Triage Use Case Types
 *
 * Transient types used during issue triage — computed during a single
 * `shep feat triage` command execution and never persisted to the database.
 */

import type { ExternalIssue } from '../../ports/output/services/external-issue-fetcher.interface.js';

/**
 * A cluster of semantically related issues identified by AI.
 */
export interface IssueCluster {
  name: string;
  description: string;
  issueNumbers: number[];
}

/**
 * Input for the TriageIssuesUseCase.
 */
export interface TriageIssuesInput {
  repositoryPath: string;
  /** Target repository (e.g., "owner/repo"). Uses the current repo if omitted. */
  repo?: string;
  /** Filter issues by labels. */
  labels?: string[];
  /** Maximum number of issues to fetch. Defaults to 100. */
  limit?: number;
}

/**
 * Result from the TriageIssuesUseCase containing fetched issues and proposed clusters.
 */
export interface TriageIssuesResult {
  issues: ExternalIssue[];
  clusters: IssueCluster[];
}
