/**
 * @module Shep.Domain.Entities.Feature
 *
 * Defines the Feature entity - the AGGREGATE ROOT of the Shep AI domain model.
 * A Feature represents a complete unit of work that progresses through the
 * Software Development Lifecycle (SDLC) from requirements to deployment.
 *
 * ## Aggregate Root Pattern
 *
 * As the aggregate root, Feature serves as the primary entry point for accessing
 * and managing related domain entities. All operations on child entities
 * (Plan, Messages, Artifacts) should go through the Feature aggregate to
 * ensure consistency and enforce business rules.
 *
 * ## Entity Relationships
 *
 * ```
 * +------------------------------------------------------------------+
 * |                         FEATURE (Aggregate Root)                  |
 * +------------------------------------------------------------------+
 * | id: UUID                                                          |
 * | name: string                                                      |
 * | slug: string                                                      |
 * | description: string                                               |
 * | repositoryPath: string                                            |
 * | branch: string                                                    |
 * | lifecycle: SdlcLifecycle                                          |
 * +------------------------------------------------------------------+
 *            |                    |                    |
 *            | 1..*               | 0..1               | 0..*
 *            v                    v                    v
 *     +------------+        +---------+        +------------+
 *     |  Message   |        |  Plan   |        |  Artifact  |
 *     +------------+        +---------+        +------------+
 *     | role       |        | overview|        | name       |
 *     | content    |        | tasks   |        | category   |
 *     | options    |        | state   |        | path       |
 *     +------------+        +---------+        +------------+
 *                                 |
 *                                 | 1..*
 *                                 v
 *                           +-----------+
 *                           |   Task    |
 *                           +-----------+
 *                           | state     |
 *                           | branch    |
 *                           +-----------+
 *                                 |
 *                                 | 1..*
 *                                 v
 *                          +-------------+
 *                          | ActionItem  |
 *                          +-------------+
 *                          | name        |
 *                          | description |
 *                          | criteria    |
 *                          +-------------+
 * ```
 *
 * ## SDLC Lifecycle Stages
 *
 * Features progress through the following stages:
 *
 * ```
 * Requirements --> Research --> Implementation --> Review --> Deploy & QA --> Maintain
 *      |              |              |              |              |             |
 *      v              v              v              v              v             v
 *   (gather)      (analyze)      (code)       (validate)     (release)     (support)
 * ```
 *
 * ## Repository Structure
 *
 * Each Feature is associated with a repository and stores its data in:
 * `~/.shep/repos/<base64-encoded-repo-path>/`
 *
 * ```
 * ~/.shep/repos/<encoded-path>/
 * +-- data                    # SQLite database
 * +-- docs/
 *     +-- prd/                # PRD artifacts
 *     +-- api/                # API specifications
 *     +-- design/             # Design documents
 *     +-- other/              # Other artifacts
 * ```
 *
 * ## Usage
 *
 * ```typespec
 * import "./feature.tsp";
 *
 * // Creating a new feature
 * const feature: Feature = {
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   name: "User Authentication",
 *   slug: "user-authentication",
 *   description: "Implement OAuth 2.0 authentication flow",
 *   repositoryPath: "/home/user/my-project",
 *   branch: "feature/user-authentication",
 *   lifecycle: SdlcLifecycle.Requirements,
 *   messages: [],
 *   relatedArtifacts: []
 * };
 * ```
 *
 * @see docs/concepts/feature-model.md - Feature model concepts and design
 * @see docs/architecture/data-storage.md - Data storage architecture
 * @see domain/entities/plan.tsp - Plan entity for implementation details
 * @see domain/entities/message.tsp - Message entity for conversations
 * @see domain/entities/artifact.tsp - Artifact entity for generated documents
 * @see common/enums/lifecycle.tsp - SdlcLifecycle enum definition
 * @see common/base.tsp - BaseEntity definition
 */
import "../../common/base.tsp";
import "../../common/scalars.tsp";
import "../../common/enums/lifecycle.tsp";
import "./message.tsp";
import "./plan.tsp";
import "./artifact.tsp";

/**
 * Feature Entity (Aggregate Root)
 *
 * The central domain entity tracking a piece of work through the SDLC lifecycle.
 * As the aggregate root, Feature encapsulates all related entities and serves
 * as the boundary for transactional consistency.
 *
 * ## Properties
 *
 * | Property         | Type           | Required | Description                                    |
 * |------------------|----------------|----------|------------------------------------------------|
 * | id               | UUID           | Yes      | Unique identifier (from BaseEntity)            |
 * | name             | string         | Yes      | Human-readable name of the feature             |
 * | slug             | string         | Yes      | URL-friendly identifier derived from name      |
 * | description      | string         | Yes      | Detailed description of the feature            |
 * | repositoryPath   | string         | Yes      | Absolute path to the repository                |
 * | branch           | string         | Yes      | Git branch associated with this feature        |
 * | lifecycle        | SdlcLifecycle  | Yes      | Current stage in the SDLC                      |
 * | messages         | Message[]      | Yes      | Conversation history with the AI               |
 * | plan             | Plan           | No       | Implementation plan (if one exists)            |
 * | relatedArtifacts | Artifact[]     | Yes      | Generated documents attached to the feature    |
 * | createdAt        | utcDateTime    | Yes      | When created (from BaseEntity)                 |
 * | updatedAt        | utcDateTime    | Yes      | When last updated (from BaseEntity)            |
 *
 * ## Aggregate Root Responsibilities
 *
 * As the aggregate root, Feature is responsible for:
 * 1. **Identity**: Providing a unique identifier for the aggregate
 * 2. **Consistency**: Maintaining invariants across all child entities
 * 3. **Access Control**: Serving as the entry point for all operations
 * 4. **Lifecycle Management**: Tracking state transitions through SDLC phases
 *
 * ## Invariants
 *
 * - A Feature MUST have at least one message (the initial user request)
 * - A Feature's `slug` MUST be unique within its repository
 * - A Feature's `lifecycle` can only progress forward (except during Review)
 * - A Feature's `plan` is only present after the Research phase
 *
 * @example
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "name": "User Authentication",
 *   "slug": "user-authentication",
 *   "description": "Implement OAuth 2.0 authentication with Google and GitHub providers, including login, logout, and session management",
 *   "repositoryPath": "/home/user/my-project",
 *   "branch": "feature/user-authentication",
 *   "lifecycle": "Requirements",
 *   "messages": [
 *     {
 *       "id": "msg-001",
 *       "role": "user",
 *       "content": "I want to add OAuth authentication to my app"
 *     },
 *     {
 *       "id": "msg-002",
 *       "role": "assistant",
 *       "content": "I'll help you add OAuth authentication. Which providers would you like to support?",
 *       "options": ["Google", "GitHub", "Both", "Other"]
 *     }
 *   ],
 *   "relatedArtifacts": [],
 *   "createdAt": "2024-01-15T10:30:00Z",
 *   "updatedAt": "2024-01-15T10:35:00Z"
 * }
 * ```
 *
 * @example
 * ```json
 * {
 *   "id": "660f9511-f3ac-52e5-b827-557766551111",
 *   "name": "Checkout Flow",
 *   "slug": "checkout-flow",
 *   "description": "E-commerce checkout flow with payment processing and order confirmation",
 *   "repositoryPath": "/home/user/ecommerce-app",
 *   "branch": "feature/checkout-flow",
 *   "lifecycle": "Implementation",
 *   "messages": [...],
 *   "plan": {
 *     "id": "plan-001",
 *     "overview": "Implement checkout flow with Stripe integration",
 *     "state": "Ready",
 *     "tasks": [...]
 *   },
 *   "relatedArtifacts": [
 *     {
 *       "id": "art-001",
 *       "name": "Checkout PRD",
 *       "category": "PRD",
 *       "state": "Done"
 *     }
 *   ],
 *   "createdAt": "2024-01-10T09:00:00Z",
 *   "updatedAt": "2024-01-18T16:45:00Z"
 * }
 * ```
 */
@doc("Central entity tracking a piece of work through the SDLC lifecycle (Aggregate Root)")
model Feature extends BaseEntity {
  /**
   * Human-readable name of the feature.
   *
   * The name should be descriptive and clearly identify what the feature
   * accomplishes. It appears in dashboards, lists, and notifications.
   *
   * @example "User Authentication"
   * @example "Checkout Flow"
   * @example "Real-time Notifications"
   */
  @doc("Human-readable name identifying this feature")
  name: string;

  /**
   * URL-friendly slug derived from the name.
   *
   * The slug is auto-generated from the name by converting to lowercase,
   * replacing spaces with hyphens, and removing special characters.
   * Must be unique within the repository.
   *
   * Used for:
   * - Branch naming: `feature/<slug>`
   * - URL paths: `/features/<slug>`
   * - File naming: `<slug>.md`
   *
   * @example "user-authentication"
   * @example "checkout-flow"
   */
  @doc("URL-friendly identifier derived from name (unique within repository)")
  slug: string;

  /**
   * Detailed description of the feature and its purpose.
   *
   * Provides comprehensive context about what the feature does, why it's
   * needed, and any important constraints or considerations. This description
   * guides the AI in understanding the feature scope.
   *
   * @example "Implement OAuth 2.0 authentication with Google and GitHub providers"
   */
  @doc("Detailed description explaining the feature's purpose and scope")
  description: string;

  /**
   * Absolute path to the repository where this feature is being implemented.
   *
   * Used to:
   * - Locate the codebase for analysis
   * - Determine the Shep data storage location
   * - Execute git operations for the feature
   *
   * @example "/home/user/my-project"
   * @example "/Users/developer/workspace/api-server"
   */
  @doc("Absolute file system path to the repository")
  repositoryPath: string;

  /**
   * Git branch associated with this feature.
   *
   * Follows the convention `feature/<slug>` by default. All commits
   * related to this feature's implementation are made on this branch.
   * The branch is created when the feature transitions to Implementation.
   *
   * @example "feature/user-authentication"
   * @example "feature/checkout-flow"
   */
  @doc("Git branch name where this feature's work is performed")
  branch: string;

  /**
   * Current stage in the Software Development Lifecycle.
   *
   * Tracks the feature's progression through SDLC phases:
   * - Requirements: Gathering and documenting requirements
   * - Research: Analyzing codebase and researching approaches
   * - Implementation: Executing code changes
   * - Review: Validating implementation quality
   * - Deploy & QA: Deploying and performing quality assurance
   * - Maintain: Ongoing support and maintenance
   */
  @doc("Current stage in the SDLC lifecycle")
  lifecycle: SdlcLifecycle;

  /**
   * Conversation history and AI interactions for this feature.
   *
   * Contains all messages exchanged between the user and AI assistant
   * during the feature's lifecycle. Messages include questions, answers,
   * clarifications, and status updates. The message history provides
   * context for continued work on the feature.
   */
  @doc("Conversation history with the AI assistant")
  messages: Message[];

  /**
   * Implementation plan for this feature, if one exists.
   *
   * The plan is created during the Research phase and contains the
   * structured breakdown of work including requirements, tasks, and
   * artifacts. Optional because features in early lifecycle stages
   * (Requirements) do not yet have a plan.
   */
  @doc("Implementation plan containing tasks, artifacts, and requirements (optional)")
  plan?: Plan;

  /**
   * Documents and artifacts generated during feature development.
   *
   * Includes PRDs, API specifications, design documents, and other
   * deliverables produced by the AI system. Artifacts are stored in
   * the repository's Shep data directory and linked to the feature.
   */
  @doc("Generated documents and artifacts attached to this feature")
  relatedArtifacts: Artifact[];
}
