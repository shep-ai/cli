/**
 * @module Shep.Domain.Entities.Artifact
 *
 * Defines the Artifact entity representing generated documents and files
 * attached to Features. Artifacts capture the documentation, specifications,
 * and other outputs produced during the SDLC process.
 *
 * ## Entity Relationships
 *
 * ```
 * +-----------+       1..*       +------------+
 * |  Feature  |----------------->|  Artifact  |
 * +-----------+                  +------------+
 *                                | id         |
 *                                | name       |
 *                                | type       |
 *                                | category   |----> ArtifactCategory (PRD, API, Design, Other)
 *                                | format     |----> ArtifactFormat (Markdown, Text, Yaml, Other)
 *                                | summary    |
 *                                | path       |
 *                                | state      |----> ArtifactState (Todo, Elaborating, Done)
 *                                +------------+
 * ```
 *
 * ## Artifact Categories
 *
 * ```
 * +--------+     +-------+     +--------+     +-------+
 * |  PRD   |     |  API  |     | Design |     | Other |
 * +--------+     +-------+     +--------+     +-------+
 *     |              |             |              |
 *     v              v             v              v
 * Product       API Specs    Architecture   Custom docs
 * Requirements  OpenAPI      Diagrams       and outputs
 * Documents     Schemas      Data Models
 * ```
 *
 * ## Artifact Lifecycle
 *
 * Artifacts progress through states as content is generated:
 *
 * ```
 * Todo ---------> Elaborating ---------> Done
 * (identified)   (content being       (content complete
 *                 generated)           and saved)
 * ```
 *
 * ## Storage
 *
 * Artifacts are stored in the repository-specific data directory:
 * `~/.shep/repos/<base64-encoded-repo-path>/docs/<artifact-path>`
 *
 * @see docs/concepts/feature-model.md - Feature model concepts
 * @see docs/architecture/data-storage.md - Storage architecture
 * @see domain/entities/feature.tsp - Parent entity containing artifacts
 * @see common/enums/artifact.tsp - ArtifactCategory and ArtifactFormat enums
 * @see common/enums/states.tsp - ArtifactState enum
 * @see common/base.tsp - BaseEntity definition
 */
import "../../common/base.tsp";
import "../../common/scalars.tsp";
import "../../common/enums/artifact.tsp";
import "../../common/enums/states.tsp";

/**
 * Artifact Entity
 *
 * Represents a generated document or file attached to a Feature. Artifacts
 * are produced by the AI system during various SDLC phases and serve as
 * the documented outputs of the development process.
 *
 * ## Properties
 *
 * | Property  | Type             | Description                                       |
 * |-----------|------------------|---------------------------------------------------|
 * | id        | UUID             | Unique identifier (inherited from BaseEntity)     |
 * | name      | string           | Human-readable name of the artifact               |
 * | type      | string           | Type description (e.g., "documentation", "code")  |
 * | category  | ArtifactCategory | Classification category (PRD, API, Design, Other) |
 * | format    | ArtifactFormat   | File format (Markdown, Text, Yaml, Other)         |
 * | summary   | string           | Brief summary of the artifact's content           |
 * | path      | string           | File system path where artifact is stored         |
 * | state     | ArtifactState    | Current state (Todo, Elaborating, Done)           |
 * | createdAt | utcDateTime      | When created (inherited)                          |
 * | updatedAt | utcDateTime      | When last modified (inherited)                    |
 *
 * ## Artifact Types by Category
 *
 * - **PRD**: Product Requirements Documents capturing user stories,
 *   acceptance criteria, and functional specifications
 * - **API**: API specifications including OpenAPI schemas, endpoint
 *   documentation, and integration guides
 * - **Design**: Technical design documents including architecture diagrams,
 *   data models, and system design decisions
 * - **Other**: Any documentation that does not fit predefined categories
 *
 * ## File Format Selection
 *
 * Format is chosen based on content type:
 * - **Markdown**: Rich documentation with formatting, code blocks
 * - **Text**: Simple unformatted content
 * - **YAML**: Structured data like configurations or specs
 * - **Other**: Binary or specialized formats
 *
 * @example
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "name": "User Authentication PRD",
 *   "type": "documentation",
 *   "category": "PRD",
 *   "format": "md",
 *   "summary": "Product requirements for user authentication including login, logout, and password reset flows",
 *   "path": "docs/prd/user-authentication.md",
 *   "state": "Done",
 *   "createdAt": "2024-01-15T10:30:00Z",
 *   "updatedAt": "2024-01-15T14:20:00Z"
 * }
 * ```
 *
 * @example
 * ```json
 * {
 *   "id": "660f9511-f3ac-52e5-b827-557766551111",
 *   "name": "Auth API Specification",
 *   "type": "api-spec",
 *   "category": "API",
 *   "format": "yaml",
 *   "summary": "OpenAPI 3.0 specification for authentication endpoints",
 *   "path": "docs/api/auth-openapi.yaml",
 *   "state": "Elaborating",
 *   "createdAt": "2024-01-15T11:00:00Z",
 *   "updatedAt": "2024-01-15T15:30:00Z"
 * }
 * ```
 *
 * @example
 * ```json
 * {
 *   "id": "770a0622-a4bd-63f6-c938-668877662222",
 *   "name": "Authentication System Design",
 *   "type": "design-doc",
 *   "category": "Design",
 *   "format": "md",
 *   "summary": "Technical design for JWT-based authentication with refresh tokens",
 *   "path": "docs/design/auth-system-design.md",
 *   "state": "Todo",
 *   "createdAt": "2024-01-15T11:30:00Z",
 *   "updatedAt": "2024-01-15T11:30:00Z"
 * }
 * ```
 */
@doc("Generated document or file attached to a Feature")
model Artifact extends BaseEntity {
  /**
   * Human-readable name of the artifact.
   *
   * The name should clearly identify the artifact's purpose and content.
   * It appears in artifact lists, search results, and navigation elements.
   *
   * @example "User Authentication PRD"
   * @example "Auth API Specification"
   * @example "Database Schema Design"
   */
  @doc("Human-readable name identifying this artifact")
  name: string;

  /**
   * Type description of the artifact.
   *
   * A free-form string providing additional context about the artifact type
   * beyond the category. Common values include:
   * - "documentation" - General documentation
   * - "api-spec" - API specification files
   * - "design-doc" - Design documentation
   * - "code" - Generated code files
   *
   * @example "documentation"
   * @example "api-spec"
   * @example "design-doc"
   */
  @doc("Type description providing additional context (e.g., 'documentation', 'api-spec')")
  type: string;

  /**
   * Category classification of the artifact.
   *
   * Determines the primary purpose and typical content structure:
   * - PRD: Product Requirements Documents
   * - API: API specifications and documentation
   * - Design: Architecture and technical design
   * - Other: Custom or miscellaneous artifacts
   */
  @doc("Category classification (PRD, API, Design, or Other)")
  category: ArtifactCategory;

  /**
   * File format of the artifact content.
   *
   * Determines how the artifact should be parsed, rendered, and edited:
   * - Markdown: Rich text with formatting support
   * - Text: Plain text without formatting
   * - Yaml: Structured data format
   * - Other: Binary or specialized formats
   */
  @doc("File format for the artifact content")
  format: ArtifactFormat;

  /**
   * Brief summary describing the artifact's content and purpose.
   *
   * The summary provides a quick overview without needing to open the full
   * artifact. It should be concise (1-3 sentences) and highlight the key
   * information contained in the artifact.
   *
   * @example "Product requirements for user authentication including login, logout, and password reset flows"
   * @example "OpenAPI 3.0 specification for authentication endpoints"
   */
  @doc("Brief summary of the artifact's content and purpose")
  summary: string;

  /**
   * File system path where the artifact is stored.
   *
   * Relative to the repository's Shep data directory. The path follows
   * a structured convention based on artifact category:
   *
   * - PRD: `docs/prd/<name>.md`
   * - API: `docs/api/<name>.<format>`
   * - Design: `docs/design/<name>.md`
   * - Other: `docs/other/<name>.<format>`
   *
   * @example "docs/prd/user-authentication.md"
   * @example "docs/api/auth-openapi.yaml"
   */
  @doc("Relative file path where the artifact is stored")
  path: string;

  /**
   * Current state of the artifact in its generation lifecycle.
   *
   * Tracks the progress of artifact content generation:
   * - Todo: Artifact identified but not yet generated
   * - Elaborating: Content is being generated by the AI
   * - Done: Content generation complete and saved
   */
  @doc("Current state in the artifact generation lifecycle")
  state: ArtifactState;
}
