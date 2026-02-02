/**
 * @module Shep.Domain.Entities.Task
 *
 * Defines the Task entity that represents a discrete unit of work within
 * an implementation plan in the Shep AI platform. Tasks are the primary
 * work items that developers execute during implementation.
 *
 * ## Task Lifecycle
 *
 * ```
 * Todo --> WIP --> Done
 *           |       |
 *           v       v
 *        Review <---+
 *           |
 *           v
 *     (back to WIP if issues found)
 * ```
 *
 * ## Task Structure
 *
 * Tasks contain:
 * - **Dependencies**: Other tasks that must complete first
 * - **Action Items**: Granular steps within the task
 * - **Branch Info**: Git branch management for isolation
 */
import "../../common/base.tsp";
import "../../common/enums/states.tsp";
import "./action-item.tsp";

/**
 * Task Entity
 *
 * Represents a discrete unit of work within a Plan. Tasks can depend on
 * other tasks and contain action items for granular work tracking.
 * Each task is associated with a Git branch for code isolation.
 *
 * ## Properties
 *
 * | Property    | Type          | Required | Description                              |
 * |-------------|---------------|----------|------------------------------------------|
 * | id          | UUID          | Yes      | Unique identifier (from BaseEntity)      |
 * | title       | string        | No       | Optional human-readable task title       |
 * | description | string        | No       | Optional detailed description            |
 * | dependsOn   | Task[]        | Yes      | Tasks that must complete before this one |
 * | actionItems | ActionItem[]  | Yes      | Granular steps within this task          |
 * | baseBranch  | string        | Yes      | Branch from which task branch was created|
 * | state       | TaskState     | Yes      | Current state of task execution          |
 * | branch      | string        | Yes      | Git branch for this task's work          |
 * | createdAt   | utcDateTime   | Yes      | When created (from BaseEntity)           |
 * | updatedAt   | utcDateTime   | Yes      | When last updated (from BaseEntity)      |
 *
 * ## Example
 *
 * ```json
 * {
 *   "id": "task-550e8400-e29b-41d4-a716-446655440000",
 *   "title": "Implement OAuth callback handler",
 *   "description": "Create the OAuth callback endpoint that processes authentication responses",
 *   "dependsOn": [
 *     { "id": "task-setup-oauth-providers" }
 *   ],
 *   "actionItems": [
 *     { "name": "Create callback route", "status": "Done" },
 *     { "name": "Implement token exchange", "status": "WIP" },
 *     { "name": "Add error handling", "status": "Todo" }
 *   ],
 *   "baseBranch": "main",
 *   "state": "WIP",
 *   "branch": "feature/oauth-callback"
 * }
 * ```
 *
 * ## Branching Strategy
 *
 * - `baseBranch`: The branch this task branches from (usually main or feature branch)
 * - `branch`: The working branch where changes for this task are made
 * - Dependencies should be merged before dependent tasks begin
 */
@doc("A discrete unit of work within an implementation plan")
model Task extends BaseEntity {
  /**
   * Optional human-readable title for the task.
   * Provides a brief summary of what the task accomplishes.
   * May be auto-generated from the first action item if not provided.
   */
  @doc("Optional human-readable title for the task")
  title?: string;

  /**
   * Optional detailed description of the task.
   * Provides context, acceptance criteria, or implementation notes
   * that help understand the scope and goals of the task.
   */
  @doc("Optional detailed description of what the task entails")
  description?: string;

  /**
   * Tasks that must be completed before this task can begin.
   * Creates a dependency graph that determines execution order
   * and enables parallel execution of independent tasks.
   */
  @doc("Tasks that must be completed before this task can begin")
  dependsOn: Task[];

  /**
   * Granular steps that comprise this task.
   * Action items break the task into atomic units of work
   * that can be individually tracked and completed.
   */
  @doc("Granular action items that comprise this task")
  actionItems: ActionItem[];

  /**
   * The base branch from which this task's branch was created.
   * Typically the main branch or a parent feature branch.
   * Used for merge operations when the task is complete.
   */
  @doc("The base branch from which this task's working branch was created")
  baseBranch: string;

  /**
   * Current state of the task in its execution lifecycle.
   * Tracks whether the task is pending, in progress, under review, or complete.
   */
  @doc("Current state of task execution (Todo, WIP, Review, Done)")
  state: TaskState;

  /**
   * Git branch where work for this task is performed.
   * Provides isolation for changes and enables independent code review.
   * Branch naming typically follows pattern: feature/task-slug
   */
  @doc("Git branch where work for this task is performed")
  branch: string;
}
