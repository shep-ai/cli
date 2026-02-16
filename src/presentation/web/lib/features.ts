/**
 * Feature Data Access
 *
 * Queries the shared ~/.shep/data SQLite database directly with better-sqlite3.
 * Self-contained to avoid importing CLI source files whose Node.js ESM
 * .js extension imports are incompatible with Turbopack's module resolution.
 *
 * Server-side only (used in server components).
 */

import Database from 'better-sqlite3';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

/** Feature row as stored in the SQLite features table (with LEFT JOIN agent_runs). */
interface FeatureRow {
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
  agent_status: string | null;
  agent_error: string | null;
  agent_result: string | null;
}

/** Domain Feature object returned to the UI. */
export interface Feature {
  id: string;
  name: string;
  slug: string;
  description: string;
  repositoryPath: string;
  branch: string;
  lifecycle: string;
  specPath?: string;
  agentStatus?: string;
  agentError?: string;
  /** Current agent graph node, e.g. "node:plan". */
  agentResult?: string;
}

function fromRow(row: FeatureRow): Feature {
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
  };
}

/**
 * List all features from the shared ~/.shep/data SQLite database.
 * Returns an empty array if the database doesn't exist or the query fails.
 */
export async function getFeatures(): Promise<Feature[]> {
  const dbPath = join(homedir(), '.shep', 'data');
  if (!existsSync(dbPath)) return [];

  try {
    const db = new Database(dbPath, { readonly: true });
    const rows = db
      .prepare(
        'SELECT f.*, ar.status as agent_status, ar.error as agent_error, ar.result as agent_result FROM features f LEFT JOIN agent_runs ar ON f.agent_run_id = ar.id'
      )
      .all() as FeatureRow[];
    db.close();
    return rows.map(fromRow);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load features:', error);
    return [];
  }
}
