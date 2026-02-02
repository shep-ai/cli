/**
 * @module Shep.Domain.Entities.AcceptanceCriteria
 *
 * Defines the AcceptanceCriteria entity for validating completion of action items.
 * Acceptance criteria are specific, testable conditions that must be satisfied
 * for an action item to be considered complete.
 *
 * ## Entity Relationships
 *
 * ```
 * +----------------+       1..*       +----------------------+
 * |   ActionItem   |----------------->| AcceptanceCriteria   |
 * +----------------+                  +----------------------+
 *                                     | id: UUID             |
 *                                     | description: string  |
 *                                     | verified: boolean    |
 *                                     | createdAt            |
 *                                     | updatedAt            |
 *                                     +----------------------+
 * ```
 *
 * ## Lifecycle
 *
 * AcceptanceCriteria are created during the planning phase and verified
 * during implementation. Each criterion transitions from unverified to
 * verified as the associated action item progresses.
 *
 * ```
 * Created (verified: false) --> Verified (verified: true)
 *                                    |
 *                                    v
 *                            ActionItem complete
 * ```
 *
 * ## Usage
 *
 * ```typespec
 * import "./acceptance-criteria.tsp";
 *
 * model ActionItem extends BaseEntity {
 *   acceptanceCriteria: AcceptanceCriteria[];
 * }
 * ```
 *
 * @see docs/concepts/feature-model.md - Feature model concepts
 * @see domain/entities/action-item.tsp - Parent entity that contains acceptance criteria
 * @see common/base.tsp - BaseEntity definition
 */
import "../../common/base.tsp";
import "../../common/scalars.tsp";

/**
 * AcceptanceCriteria Entity
 *
 * Represents a specific, testable condition that must be satisfied for an
 * action item to be considered complete. Acceptance criteria provide clear,
 * measurable goals that define the "done" state for work items.
 *
 * ## Properties
 *
 * | Property    | Type        | Description                                          |
 * |-------------|-------------|------------------------------------------------------|
 * | id          | UUID        | Unique identifier (inherited from BaseEntity)        |
 * | description | string      | Human-readable description of the criterion          |
 * | verified    | boolean     | Whether this criterion has been verified as complete |
 * | createdAt   | utcDateTime | When the criterion was created (inherited)           |
 * | updatedAt   | utcDateTime | When the criterion was last modified (inherited)     |
 *
 * ## Verification Rules
 *
 * - Criteria start as `verified: false` when created
 * - Verification can be manual (user confirms) or automated (tests pass)
 * - An ActionItem is only complete when ALL its criteria are verified
 * - Once verified, a criterion typically remains verified unless the
 *   implementation is reverted
 *
 * ## Best Practices for Writing Criteria
 *
 * - Use specific, measurable language
 * - Avoid vague terms like "should work well"
 * - Include expected inputs and outputs where applicable
 * - Reference specific test scenarios when possible
 *
 * @example
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "description": "User can log in with valid email and password",
 *   "verified": false,
 *   "createdAt": "2024-01-15T10:30:00Z",
 *   "updatedAt": "2024-01-15T10:30:00Z"
 * }
 * ```
 *
 * @example
 * ```json
 * {
 *   "id": "660f9511-f3ac-52e5-b827-557766551111",
 *   "description": "API returns 401 status code for invalid credentials",
 *   "verified": true,
 *   "createdAt": "2024-01-15T10:30:00Z",
 *   "updatedAt": "2024-01-16T14:20:00Z"
 * }
 * ```
 */
@doc("Acceptance criterion for validating completion of an action item")
model AcceptanceCriteria extends BaseEntity {
  /**
   * Human-readable description of what must be true for this criterion to be met.
   *
   * The description should be specific, testable, and written in a way that
   * allows both humans and automated systems to verify completion. Good
   * descriptions include expected behaviors, inputs, outputs, or edge cases.
   *
   * @example "User can log in with valid email and password"
   * @example "API returns 401 status code for invalid credentials"
   * @example "Form validates email format before submission"
   */
  @doc("Description of what must be true for this criterion to be satisfied")
  description: string;

  /**
   * Whether this criterion has been verified as complete.
   *
   * Defaults to `false` when the criterion is created. Set to `true` when
   * verification confirms that the implementation meets the described
   * requirement. Verification may be:
   *
   * - **Manual**: A reviewer confirms the criterion is met
   * - **Automated**: Tests or checks validate the criterion programmatically
   *
   * An ActionItem cannot be marked as complete until all its acceptance
   * criteria have `verified: true`.
   */
  @doc("Whether this criterion has been verified as complete")
  verified: boolean;
}
