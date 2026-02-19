/**
 * @module Shep.Domain.ValueObjects.SpecArtifact
 *
 * Defines the SpecArtifact model representing a Feature Specification artifact.
 * This maps to the stored artifact corresponding to `spec.yaml` in the YAML-first spec system.
 *
 * @see ../entities/artifact.tsp - Base Artifact model
 * @see ../entities/feature-spec.tsp - FeatureSpec model (content source)
 */
import "../entities/artifact.tsp";

/**
 * Feature Specification artifact (spec.yaml stored as Artifact).
 *
 * Extends Artifact with spec-specific metadata. Category is always PRD,
 * format is typically YAML.
 */
@doc("Feature Specification artifact (spec.yaml)")
model SpecArtifact extends Artifact {
  @doc("Feature number referenced in the spec (e.g., 031)")
  featureNumber: int32;

  @doc("Git branch associated with this feature spec")
  branch: string;

  @doc("One-line summary of the feature")
  oneLiner: string;

  @doc("Current SDLC phase of the feature")
  phase: string;

  @doc("Size estimate: XS, S, M, L, or XL")
  sizeEstimate: string;
}
