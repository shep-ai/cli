/**
 * @module Shep.Domain.ValueObjects.FeatureArtifact
 *
 * Defines the FeatureArtifact model representing a Feature Status artifact.
 * This maps to the stored artifact corresponding to `feature.yaml` in the YAML-first spec system.
 *
 * @see ./base-spec-artifact.tsp - BaseSpecArtifact (common base)
 * @see ../entities/artifact.tsp - Base Artifact model
 */
import "./base-spec-artifact.tsp";

/**
 * Feature Status artifact (feature.yaml stored as Artifact).
 *
 * Extends BaseSpecArtifact with execution tracking metadata for the SDLC.
 */
@doc("Feature Status artifact (feature.yaml)")
model FeatureArtifact extends BaseSpecArtifact {
  @doc("URL-friendly slug for the feature")
  featureSlug: string;

  @doc("Current SDLC phase")
  currentPhase: string;

  @doc("Number of completed tasks")
  completedTasks: int32;

  @doc("Total number of tasks")
  totalTasks: int32;

  @doc("Last status update timestamp")
  lastUpdated: utcDateTime;

  @doc("Current feature branch name")
  branch: string;
}
