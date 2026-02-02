/**
 * @module Shep.Domain.Entities.Research
 *
 * Defines the Research entity that represents a research activity conducted
 * during the requirements or planning phase of the Shep AI platform.
 * Research helps gather information needed for technical decisions.
 *
 * ## Research Lifecycle
 *
 * ```
 * NotStarted --> Running --> Finished
 *                   |           ^
 *                   +-----------+
 *               (analysis complete)
 * ```
 *
 * ## Research Purpose
 *
 * Research activities are conducted to:
 * - Analyze codebase structure and patterns
 * - Evaluate technical approaches
 * - Investigate dependencies and integrations
 * - Validate feasibility of requirements
 * - Document findings for planning decisions
 */
import "../../common/base.tsp";
import "../../common/enums/states.tsp";
import "./artifact.tsp";

/**
 * Research Entity
 *
 * Represents a research topic exploration conducted to gather information
 * needed for requirement clarification or technical decisions. Research
 * produces artifacts containing findings, analysis, and recommendations.
 *
 * ## Properties
 *
 * | Property   | Type           | Required | Description                              |
 * |------------|----------------|----------|------------------------------------------|
 * | id         | UUID           | Yes      | Unique identifier (from BaseEntity)      |
 * | topic      | string         | Yes      | The topic being researched               |
 * | state      | ResearchState  | Yes      | Current state of research activity       |
 * | summary    | string         | Yes      | Summary of research findings             |
 * | artifacts  | Artifact[]     | Yes      | Artifacts produced during research       |
 * | createdAt  | utcDateTime    | Yes      | When created (from BaseEntity)           |
 * | updatedAt  | utcDateTime    | Yes      | When last updated (from BaseEntity)      |
 *
 * ## Example
 *
 * ```json
 * {
 *   "id": "res-550e8400-e29b-41d4-a716-446655440000",
 *   "topic": "Authentication library comparison for Node.js",
 *   "state": "Finished",
 *   "summary": "Evaluated Passport.js, Auth0, and Firebase Auth. Passport.js recommended for flexibility and existing Express integration.",
 *   "artifacts": [
 *     {
 *       "name": "Auth Library Comparison",
 *       "category": "Design",
 *       "format": "Markdown",
 *       "summary": "Detailed comparison matrix of authentication libraries"
 *     }
 *   ]
 * }
 * ```
 *
 * ## Research Outputs
 *
 * Research typically produces:
 * - **Summary**: Concise findings and recommendations
 * - **Artifacts**: Detailed analysis documents, diagrams, or specifications
 * - **Recommendations**: Suggested approaches based on findings
 */
@doc("A research topic exploration for gathering technical information")
model Research extends BaseEntity {
  /**
   * The topic being researched.
   * Describes the area of investigation, such as a technical
   * approach, library comparison, or architecture pattern.
   */
  @doc("The topic or subject being researched")
  topic: string;

  /**
   * Current state of the research activity.
   * Tracks whether research is pending, in progress, or complete.
   */
  @doc("Current state of the research activity (NotStarted, Running, Finished)")
  state: ResearchState;

  /**
   * Summary of research findings.
   * Provides a concise overview of what was discovered,
   * including key insights and recommendations.
   */
  @doc("Summary of research findings and recommendations")
  summary: string;

  /**
   * Artifacts produced during the research.
   * May include detailed analysis documents, comparison matrices,
   * diagrams, or other documentation created during research.
   */
  @doc("Artifacts produced during the research activity")
  artifacts: Artifact[];
}
