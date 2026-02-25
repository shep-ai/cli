/**
 * @module Shep.Domain.Entities.SpecArtifactBase
 *
 * Defines the base entity for all spec artifact types in the YAML-first spec system.
 * All spec artifacts (FeatureArtifact, ResearchArtifact, TechnicalPlanArtifact,
 * TasksArtifact) extend this base model to inherit common metadata fields.
 *
 * ## Spec Artifact System
 *
 * The Shep AI platform uses YAML-based spec artifacts as the source of truth for
 * feature development. Each artifact type extends SpecArtifactBase with additional
 * type-specific fields while sharing common metadata.
 *
 * ## Design Philosophy
 *
 * The base model uses a **content + metadata** hybrid approach:
 * - **content**: Raw Markdown body (the human-written spec content)
 * - **metadata fields**: Structured attributes for machine-readable queries
 *
 * This design preserves Markdown's expressiveness while enabling programmatic
 * validation and cross-spec analysis.
 *
 * ## Usage
 *
 * Extend this base for concrete spec artifact entities:
 *
 * ```typespec
 * import "./spec-artifact-base.tsp";
 *
 * model FeatureArtifact extends SpecArtifactBase {
 *   number: int32;
 *   branch: string;
 *   // ... additional feature-specific fields
 * }
 * ```
 */
import "../../common/base.tsp";
import "../value-objects/spec-metadata.tsp";

/**
 * Base entity for all spec artifact types.
 *
 * SpecArtifactBase provides common fields shared across all spec artifact types:
 * feature specifications, research documents, implementation plans, and task
 * breakdowns. Each concrete artifact extends this base with type-specific fields.
 *
 * ## Shared Fields
 *
 * All spec artifacts include:
 * - Identity and timestamps (from BaseEntity)
 * - Content (raw Markdown body)
 * - Metadata (name, summary, technologies, links, questions)
 *
 * ## Content Field
 *
 * The `content` field contains the raw Markdown body of the spec. This IS the
 * spec - all human-written content lives here. Markdown generation simply outputs
 * YAML front matter + this content field.
 *
 * ## Open Questions
 *
 * The `openQuestions` array enables validation gates to check if all questions
 * have been resolved before implementation proceeds. Questions with `resolved: false`
 * block implementation.
 */
@doc("Base entity for spec artifacts with common metadata fields")
model SpecArtifactBase extends BaseEntity {
  @doc("Artifact title / feature name")
  name: string;

  @doc("Short description of the artifact's purpose")
  summary: string;

  @doc("Raw Markdown body containing the human-written spec content")
  content: string;

  @doc("Key technologies mentioned or evaluated in this artifact")
  technologies: string[];

  @doc("References to other spec IDs (e.g., '008-agent-configuration')")
  relatedFeatures: string[];

  @doc("URLs to external documentation, references, or comparisons")
  relatedLinks: string[];

  @doc("Structured open questions for validation gate checks")
  openQuestions: OpenQuestion[];
}
