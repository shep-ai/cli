/**
 * @module Shep.Domain.ValueObjects.PlanArtifact
 *
 * Defines the PlanArtifact model representing an Implementation Plan artifact.
 * This maps to the stored artifact corresponding to `plan.yaml` in the YAML-first spec system.
 *
 * @see ./base-spec-artifact.tsp - BaseSpecArtifact (common base)
 * @see ../entities/artifact.tsp - Base Artifact model
 */
import "./base-spec-artifact.tsp";

/**
 * Implementation Plan artifact (plan.yaml stored as Artifact).
 *
 * Extends BaseSpecArtifact with plan-specific summary metadata.
 */
@doc("Implementation Plan artifact (plan.yaml)")
model PlanArtifact extends BaseSpecArtifact {
  @doc("Number of implementation phases")
  phaseCount: int32;

  @doc("Number of new files to be created")
  filesToCreateCount: int32;

  @doc("Number of existing files to be modified")
  filesToModifyCount: int32;

  @doc("Test-Driven Development strategy outlined in this plan")
  tddApproach: string;
}
