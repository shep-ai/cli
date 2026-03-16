/**
 * @module Shep.Deployment.DevEnvironmentAnalysis
 *
 * Defines the DevEnvironmentAnalysis entity for cached dev environment
 * analysis results.
 *
 * DevEnvironmentAnalysis represents the result of analyzing a repository to
 * determine how to start its development environment. Results are cached in
 * SQLite keyed by git remote URL (or root repo path for non-git repos) and
 * reused on subsequent deploys.
 *
 * ## Usage
 *
 * Import this module to work with analysis results:
 *
 * ```typespec
 * import "./dev-environment-analysis.tsp";
 *
 * op analyzeRepository(path: string): DevEnvironmentAnalysis;
 * ```
 *
 * ## Design Notes
 *
 * DevEnvironmentAnalysis follows the Deployment model pattern: it defines
 * its own id and timestamps rather than extending BaseEntity, consistent
 * with other entities in the deployment module.
 *
 * The cacheKey field stores the resolved cache key (git remote URL or root
 * repo absolute path) that ensures all worktrees of the same repo share a
 * single cache entry.
 */
import "../common/scalars.tsp";
import "../common/enums/deployment.tsp";
import "./dev-command.tsp";

/**
 * Result of analyzing a repository's dev environment.
 *
 * DevEnvironmentAnalysis captures everything needed to start (or explain why
 * you cannot start) a development environment for any repository, regardless
 * of language or framework. Results come from either fast-path detection
 * (package.json scanning) or AI agent analysis, and are cached per-repo with
 * manual-only invalidation.
 *
 * When canStart is false, the reason field explains why the repository has
 * nothing to start (e.g., "This is a utility library with no server or UI").
 *
 * @example Startable Node.js project:
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "cacheKey": "git@github.com:org/webapp.git",
 *   "canStart": true,
 *   "commands": [
 *     {
 *       "command": "npm run dev",
 *       "description": "Start Next.js development server"
 *     }
 *   ],
 *   "ports": [3000],
 *   "language": "TypeScript",
 *   "framework": "Next.js",
 *   "source": "FastPath",
 *   "createdAt": "2024-01-15T10:30:00Z",
 *   "updatedAt": "2024-01-15T10:30:00Z"
 * }
 * ```
 *
 * @example Non-startable library:
 * ```json
 * {
 *   "id": "660e8400-e29b-41d4-a716-446655440001",
 *   "cacheKey": "/Users/dev/my-utils",
 *   "canStart": false,
 *   "reason": "This is a utility library with no server or UI to start",
 *   "commands": [],
 *   "language": "Python",
 *   "source": "Agent",
 *   "createdAt": "2024-01-15T10:30:00Z",
 *   "updatedAt": "2024-01-15T10:30:00Z"
 * }
 * ```
 */
@doc("Result of analyzing a repository's dev environment configuration")
model DevEnvironmentAnalysis {
  @doc("Unique identifier for the analysis record")
  id: UUID;

  @doc("Cache key for this analysis (git remote URL or root repo absolute path)")
  cacheKey: string;

  @doc("Whether the repository has a startable dev environment")
  canStart: boolean;

  @doc("Human-readable reason when canStart is false (e.g., 'This is a utility library with no server')")
  reason?: string;

  @doc("Ordered list of commands to start the dev environment (first command is primary)")
  commands: DevCommand[];

  @doc("Prerequisites that must be installed before running commands (e.g., 'Docker', 'Python 3.10+')")
  prerequisites?: string[];

  @doc("Expected port numbers the dev environment will listen on")
  ports?: int32[];

  @doc("Environment variables needed to run the dev environment")
  environmentVariables?: Record<string>;

  @doc("Primary programming language of the repository")
  language: string;

  @doc("Framework or build tool detected (e.g., 'Next.js', 'Django', 'Cargo')")
  framework?: string;

  @doc("How this analysis was produced (FastPath, Agent, or Manual)")
  source: AnalysisSource;

  @doc("Timestamp when the analysis was first created")
  @visibility("read")
  createdAt: utcDateTime;

  @doc("Timestamp when the analysis was last updated")
  @visibility("read")
  updatedAt: utcDateTime;
}
