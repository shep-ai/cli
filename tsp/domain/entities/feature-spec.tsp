/**
 * @module Shep.Domain.Entities.FeatureSpec
 *
 * Defines the FeatureSpec entity representing a feature specification artifact.
 * This maps to the `spec.yaml` file in the YAML-first spec system.
 *
 * ## Feature Specification
 *
 * FeatureSpec captures the requirements and scope definition for a feature:
 * - What problem it solves
 * - Success criteria
 * - Affected areas
 * - Size estimate
 *
 * ## Usage
 *
 * ```typespec
 * import "./feature-spec.tsp";
 *
 * // Feature spec is typically read from spec.yaml
 * ```
 */
import "./spec-artifact-base.tsp";
import "../../common/enums/index.tsp";

/**
 * Represents a feature specification artifact (spec.yaml).
 *
 * FeatureSpec extends SpecArtifactBase with feature-specific metadata
 * including the spec number, git branch, lifecycle phase, and size estimate.
 */
@doc("Feature specification artifact defining requirements and scope")
model FeatureSpec extends SpecArtifactBase {
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
}
