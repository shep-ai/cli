/**
 * @module Shep.Domain.Entities.ActionItem
 *
 * Defines the ActionItem entity representing granular, atomic units of work
 * within a Task. Action items are the smallest trackable work units in the
 * Shep AI SDLC platform.
 *
 * ## Entity Relationships
 *
 * ```
 * +----------+       1..*       +-------------+       1..*       +----------------------+
 * |   Task   |----------------->|  ActionItem |----------------->| AcceptanceCriteria   |
 * +----------+                  +-------------+                  +----------------------+
 *                               | id          |
 *                               | name        |
 *                               | description |
 *                               | branch      |
 *                               | dependsOn[] |---+
 *                               +-------------+   |
 *                                     ^           |
 *                                     +-----------+
 *                                   (self-reference)
 * ```
 *
 * ## Dependency Graph
 *
 * ActionItems can depend on other ActionItems, forming a directed acyclic
 * graph (DAG) that determines execution order:
 *
 * ```
 *     +-------------------+
 *     | Setup Environment |
 *     +--------+----------+
 *              |
 *     +--------v----------+
 *     | Create Database   |
 *     | Schema            |
 *     +--------+----------+
 *              |
 *       +------+------+
 *       |             |
 * +-----v-----+ +-----v-----+
 * | Add User  | | Add Auth  |
 * | Model     | | Endpoints |
 * +-----------+ +-----------+
 * ```
 *
 * ## Lifecycle
 *
 * ActionItems progress through states based on work completion and
 * acceptance criteria verification:
 *
 * ```
 * Created --> In Progress --> Criteria Verified --> Complete
 *     ^            |                                    |
 *     +------------+------------------------------------+
 *               (blocked by dependencies)
 * ```
 *
 * @see docs/concepts/feature-model.md - Feature model concepts
 * @see domain/entities/acceptance-criteria.tsp - Verification criteria
 * @see domain/entities/task.tsp - Parent entity containing action items
 * @see common/base.tsp - BaseEntity definition
 */
import "../../common/base.tsp";
import "../../common/scalars.tsp";
import "./acceptance-criteria.tsp";

/**
 * ActionItem Entity
 *
 * Represents a granular, atomic step within a Task. Action items break down
 * complex tasks into manageable pieces that can be worked on independently
 * (subject to dependency constraints) and verified via acceptance criteria.
 *
 * ## Properties
 *
 * | Property           | Type                 | Description                                       |
 * |--------------------|----------------------|---------------------------------------------------|
 * | id                 | UUID                 | Unique identifier (inherited from BaseEntity)     |
 * | name               | string               | Short name describing the action                  |
 * | description        | string               | Detailed description of what this action entails  |
 * | branch             | string               | Git branch where work is performed                |
 * | dependsOn          | ActionItem[]         | Action items that must complete first             |
 * | acceptanceCriteria | AcceptanceCriteria[] | Criteria for verifying completion                 |
 * | createdAt          | utcDateTime          | When created (inherited)                          |
 * | updatedAt          | utcDateTime          | When last modified (inherited)                    |
 *
 * ## Dependency Management
 *
 * The `dependsOn` array creates a dependency graph between action items.
 * Rules for dependencies:
 *
 * - **Acyclic**: Dependencies must form a DAG (no circular references)
 * - **Same Task**: Dependencies should typically be within the same Task
 * - **Blocking**: An action item cannot start until all dependencies complete
 * - **Parallel**: Items without mutual dependencies can execute in parallel
 *
 * ## Branch Strategy
 *
 * Each ActionItem may have its own feature branch, allowing:
 * - Isolated development of individual changes
 * - Independent code review per action item
 * - Clean merge history
 *
 * @example
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "name": "Add User Model",
 *   "description": "Create the User entity with email, password hash, and profile fields",
 *   "branch": "feature/user-auth/add-user-model",
 *   "dependsOn": [],
 *   "acceptanceCriteria": [
 *     {
 *       "id": "660f9511-f3ac-52e5-b827-557766551111",
 *       "description": "User model has email, passwordHash, and createdAt fields",
 *       "verified": false
 *     },
 *     {
 *       "id": "770a0622-a4bd-63f6-c938-668877662222",
 *       "description": "User model has unique constraint on email",
 *       "verified": false
 *     }
 *   ],
 *   "createdAt": "2024-01-15T10:30:00Z",
 *   "updatedAt": "2024-01-15T10:30:00Z"
 * }
 * ```
 *
 * @example
 * ```json
 * {
 *   "id": "880b1733-b5ce-74g7-da49-779988773333",
 *   "name": "Add Auth Endpoints",
 *   "description": "Implement login and logout API endpoints using the User model",
 *   "branch": "feature/user-auth/add-auth-endpoints",
 *   "dependsOn": [
 *     { "id": "550e8400-e29b-41d4-a716-446655440000" }
 *   ],
 *   "acceptanceCriteria": [
 *     {
 *       "id": "990c2844-c6df-85h8-eb50-880099884444",
 *       "description": "POST /auth/login returns JWT token for valid credentials",
 *       "verified": false
 *     }
 *   ],
 *   "createdAt": "2024-01-15T10:35:00Z",
 *   "updatedAt": "2024-01-15T10:35:00Z"
 * }
 * ```
 */
@doc("Granular, atomic step within a Task representing a single unit of work")
model ActionItem extends BaseEntity {
  /**
   * Short name describing the action.
   *
   * The name should be concise yet descriptive, typically following a
   * verb-noun pattern (e.g., "Add User Model", "Create Database Schema").
   * This name appears in task lists, progress views, and commit messages.
   *
   * @example "Add User Model"
   * @example "Create Database Schema"
   * @example "Implement Login Endpoint"
   */
  @doc("Short name describing the action (verb-noun pattern recommended)")
  name: string;

  /**
   * Detailed description of what this action item entails.
   *
   * The description provides context beyond the name, including:
   * - What changes need to be made
   * - Which files or components are affected
   * - Any technical considerations or constraints
   * - Expected outcomes or deliverables
   */
  @doc("Detailed description of the work to be performed")
  description: string;

  /**
   * Git branch where work for this action item is performed.
   *
   * Follows a hierarchical naming convention that includes the parent
   * feature and task context. This enables:
   * - Clear branch organization
   * - Easy identification of related changes
   * - Structured merge workflow
   *
   * @example "feature/user-auth/add-user-model"
   * @example "feature/checkout-flow/add-payment-validation"
   */
  @doc("Git branch name where this action item's work is performed")
  branch: string;

  /**
   * Action items that must be completed before this one can begin.
   *
   * Creates a dependency graph ensuring correct execution order.
   * Dependencies are typically within the same Task but may reference
   * items from other Tasks when cross-task coordination is needed.
   *
   * An empty array indicates no dependencies (can start immediately).
   */
  @doc("Action items that must complete before this one can start")
  dependsOn: ActionItem[];

  /**
   * Criteria that must be met for this action item to be considered complete.
   *
   * Each criterion is a specific, testable condition. All criteria must
   * be verified (`verified: true`) before the action item can be marked
   * as complete. This ensures consistent quality and clear completion
   * definitions.
   */
  @doc("Acceptance criteria for verifying completion of this action item")
  acceptanceCriteria: AcceptanceCriteria[];
}
