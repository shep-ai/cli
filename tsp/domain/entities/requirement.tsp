/**
 * @module Shep.Domain.Entities.Requirement
 *
 * Defines the Requirement entity that captures user requirements and their
 * associated research in the Shep AI platform. Requirements are gathered
 * during the requirements phase and form the basis for planning.
 *
 * ## Requirement Lifecycle
 *
 * ```
 * User Query --> Parsing --> Research --> Clarification --> Finalized
 *      |            |           |              |               |
 *      v            v           v              v               v
 *  (capture)   (classify)  (analyze)     (validate)      (ready for plan)
 * ```
 *
 * ## Requirement Types
 *
 * Requirements are classified into two main categories:
 * - **Functional**: What the system should do (features, behaviors)
 * - **Non-Functional**: How the system should perform (quality attributes)
 */
import "../../common/base.tsp";
import "../../common/enums/requirement.tsp";
import "./research.tsp";

/**
 * Requirement Entity
 *
 * Represents a user or inferred requirement attached to a feature. Requirements
 * capture what needs to be built and may have associated research to clarify
 * technical approaches or validate feasibility.
 *
 * ## Properties
 *
 * | Property    | Type             | Required | Description                              |
 * |-------------|------------------|----------|------------------------------------------|
 * | id          | UUID             | Yes      | Unique identifier (from BaseEntity)      |
 * | slug        | string           | Yes      | URL-friendly short identifier            |
 * | userQuery   | string           | Yes      | Original user query that created this    |
 * | type        | RequirementType  | Yes      | Functional or NonFunctional              |
 * | researches  | Research[]       | Yes      | Research conducted for this requirement  |
 * | createdAt   | utcDateTime      | Yes      | When created (from BaseEntity)           |
 * | updatedAt   | utcDateTime      | Yes      | When last updated (from BaseEntity)      |
 *
 * ## Example
 *
 * ```json
 * {
 *   "id": "req-550e8400-e29b-41d4-a716-446655440000",
 *   "slug": "oauth-authentication",
 *   "userQuery": "I need users to be able to log in with Google",
 *   "type": "Functional",
 *   "researches": [
 *     {
 *       "topic": "Google OAuth 2.0 implementation patterns",
 *       "state": "Finished",
 *       "summary": "Recommended using passport.js with google-oauth20 strategy..."
 *     }
 *   ]
 * }
 * ```
 *
 * ## Slug Generation
 *
 * The slug is generated from the user query or requirement description:
 * - Lowercase
 * - Spaces replaced with hyphens
 * - Special characters removed
 * - Truncated to reasonable length
 */
@doc("A user or inferred requirement attached to a feature")
model Requirement extends BaseEntity {
  /**
   * URL-friendly short identifier for the requirement.
   * Derived from the requirement description or user query,
   * useful for display and referencing in conversation.
   */
  @doc("URL-friendly short identifier for the requirement")
  slug: string;

  /**
   * The original user query that generated this requirement.
   * Preserves the exact wording from the user to maintain
   * traceability and context for the requirement.
   */
  @doc("The original user query that generated this requirement")
  userQuery: string;

  /**
   * Classification type of the requirement.
   * Distinguishes between functional requirements (what the system does)
   * and non-functional requirements (how the system performs).
   */
  @doc("Classification type of the requirement (Functional or NonFunctional)")
  type: RequirementType;

  /**
   * Collection of research activities associated with this requirement.
   * Research helps clarify technical approaches, validate feasibility,
   * and gather information needed for implementation planning.
   */
  @doc("Research activities conducted to clarify or validate this requirement")
  researches: Research[];
}
