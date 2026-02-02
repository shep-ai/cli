/**
 * @module Shep.Domain.Entities.Plan
 *
 * Defines the Plan entity that represents an implementation plan for a feature
 * in the Shep AI platform. Plans contain the structured breakdown of work
 * including requirements, tasks, artifacts, and scheduling information.
 *
 * ## Plan Lifecycle
 *
 * ```
 * Requirements --> ClarificationRequired --> Ready
 *      |                  ^                    |
 *      |                  |                    |
 *      +------------------+                    v
 *      (needs clarification)            (approved for execution)
 * ```
 *
 * ## Plan Structure
 *
 * A Plan aggregates several components:
 * - **Overview**: High-level description of the implementation approach
 * - **Requirements**: User and inferred requirements being addressed
 * - **Artifacts**: Documents and deliverables to be produced
 * - **Tasks**: Work items that comprise the implementation
 * - **Work Plan**: Optional Gantt chart visualization data
 */
import "../../common/base.tsp";
import "../../common/enums/states.tsp";
import "./requirement.tsp";
import "./artifact.tsp";
import "./task.tsp";
import "../value-objects/gantt.tsp";

/**
 * Plan Entity
 *
 * Represents a comprehensive implementation plan for a feature. The plan
 * breaks down the work into manageable tasks and artifacts, tracks requirements,
 * and optionally provides scheduling visualization through Gantt chart data.
 *
 * ## Properties
 *
 * | Property     | Type           | Required | Description                              |
 * |--------------|----------------|----------|------------------------------------------|
 * | id           | UUID           | Yes      | Unique identifier (from BaseEntity)      |
 * | overview     | string         | Yes      | High-level implementation approach       |
 * | requirements | Requirement[]  | Yes      | Requirements this plan addresses         |
 * | artifacts    | Artifact[]     | Yes      | Documents/deliverables to produce        |
 * | tasks        | Task[]         | Yes      | Work items comprising the plan           |
 * | state        | PlanState      | Yes      | Current state of plan execution          |
 * | workPlan     | GanttViewData  | No       | Optional Gantt chart visualization       |
 * | createdAt    | utcDateTime    | Yes      | When created (from BaseEntity)           |
 * | updatedAt    | utcDateTime    | Yes      | When last updated (from BaseEntity)      |
 *
 * ## Example
 *
 * ```json
 * {
 *   "id": "plan-550e8400-e29b-41d4-a716-446655440000",
 *   "overview": "Implement OAuth 2.0 authentication with Google and GitHub providers",
 *   "requirements": [...],
 *   "artifacts": [
 *     { "type": "PRD", "title": "Authentication PRD" },
 *     { "type": "Design", "title": "Auth Flow Diagram" }
 *   ],
 *   "tasks": [
 *     { "title": "Setup OAuth providers" },
 *     { "title": "Implement callback handlers" }
 *   ],
 *   "state": "Ready",
 *   "workPlan": {
 *     "startDate": "2024-01-15T00:00:00Z",
 *     "endDate": "2024-01-22T00:00:00Z",
 *     "tasks": [...]
 *   }
 * }
 * ```
 */
@doc("Implementation plan for a feature containing tasks, artifacts, and requirements")
model Plan extends BaseEntity {
  /**
   * High-level overview of the implementation approach.
   * Provides a summary of how the feature will be implemented,
   * including key technical decisions and architecture choices.
   */
  @doc("High-level overview describing the implementation approach")
  overview: string;

  /**
   * Collection of requirements that this plan addresses.
   * Includes both user-provided requirements and those inferred
   * during the requirements gathering phase.
   */
  @doc("User and inferred requirements that this plan addresses")
  requirements: Requirement[];

  /**
   * Collection of artifacts to be produced as part of this plan.
   * Artifacts include PRDs, design documents, API specifications,
   * and other deliverables generated during implementation.
   */
  @doc("Documents and artifacts to be produced as part of this plan")
  artifacts: Artifact[];

  /**
   * Collection of tasks that comprise the implementation work.
   * Tasks are ordered and may have dependencies on each other.
   * Each task contains action items for granular work tracking.
   */
  @doc("Work items (tasks) that comprise this implementation plan")
  tasks: Task[];

  /**
   * Current state of the plan in its lifecycle.
   * Indicates whether the plan is still gathering requirements,
   * needs clarification, or is ready for execution.
   */
  @doc("Current state of the plan execution lifecycle")
  state: PlanState;

  /**
   * Optional Gantt chart visualization data for work scheduling.
   * When present, provides timeline and dependency information
   * for displaying the work plan in a Gantt chart format.
   */
  @doc("Optional Gantt chart visualization data for work scheduling")
  workPlan?: GanttViewData;
}
