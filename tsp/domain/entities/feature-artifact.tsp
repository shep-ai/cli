/**
 * @module Shep.Domain.Entities.FeatureArtifact
 *
 * Defines the FeatureArtifact entity representing a feature specification artifact (PRD).
 * This maps to the `spec.yaml` file in the YAML-first spec system.
 *
 * ## Feature Artifact (PRD)
 *
 * FeatureArtifact captures the requirements and scope definition for a feature:
 * - What problem it solves
 * - Success criteria
 * - Affected areas
 * - Size estimate
 */
import "./spec-artifact-base.tsp";
import "../../common/enums/index.tsp";

/**
 * Represents a feature specification artifact (spec.yaml) — the PRD.
 *
 * FeatureArtifact extends SpecArtifactBase with feature-specific metadata
 * including the spec number, git branch, lifecycle phase, and size estimate.
 */
@doc("Feature specification artifact (PRD) defining requirements and scope")
model FeatureArtifact extends SpecArtifactBase {
  @doc("Spec number (e.g., 11 for spec 011)")
  number: int32;

  @doc("Git branch name for this feature (e.g., 'feat/011-feature-name')")
  branch: string;

  @doc("One-line description of the feature")
  oneLiner: string;

  @doc("Current phase in the SDLC lifecycle")
  phase: SdlcLifecycle;

  @doc("Size estimate: XS, S, M, L, or XL")
  sizeEstimate: string;

  @doc("Rejection feedback history for PRD iterations (append-only)")
  rejectionFeedback?: RejectionFeedbackEntry[];
}
