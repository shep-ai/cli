/**
 * @module Shep.Domain.Entities.FeatureStatus
 *
 * Defines the FeatureStatus entity representing the feature.yaml status artifact.
 * This tracks execution state, validation gates, task progress, and checkpoints
 * throughout the SDLC lifecycle.
 *
 * ## Feature Status Artifact
 *
 * Unlike the other spec artifacts (spec.yaml, research.yaml, plan.yaml, tasks.yaml)
 * which follow the SpecArtifactBase content+metadata pattern, feature.yaml is a
 * pure status tracking document with a unique nested structure.
 *
 * ## Usage
 *
 * ```typespec
 * import "./feature-status.tsp";
 *
 * // Feature status is read from feature.yaml
 * ```
 */
import "../../common/base.tsp";
import "../value-objects/feature-status-metadata.tsp";

/**
 * Represents the feature.yaml status tracking artifact.
 *
 * FeatureStatus tracks the runtime execution state of a feature through the
 * SDLC lifecycle. It is continuously updated by agents and skills during
 * implementation.
 */
@doc("Feature status tracking artifact (feature.yaml)")
model FeatureStatus extends BaseEntity {
  @doc("Feature identity metadata")
  feature: FeatureIdentity;

  @doc("Current execution status and progress")
  status: FeatureStatusInfo;

  @doc("PR URL if a pull request has been created")
  prUrl?: string;

  @doc("ISO timestamp when the feature was merged")
  mergedAt?: string;

  @doc("Validation gate results")
  validation: FeatureValidation;

  @doc("Task execution tracking")
  tasks: FeatureTaskTracking;

  @doc("Milestone checkpoints recording phase completions")
  checkpoints: FeatureCheckpoint[];

  @doc("Error tracking state")
  errors: FeatureErrors;
}
