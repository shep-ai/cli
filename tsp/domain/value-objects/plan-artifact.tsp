/**
 * @module Shep.Domain.ValueObjects.PlanArtifact
 *
 * Defines the PlanArtifact model representing an Implementation Plan artifact.
 * This maps to the stored artifact corresponding to `plan.yaml` in the YAML-first spec system.
 *
 * @see ../entities/artifact.tsp - Base Artifact model
 * @see ../entities/plan-spec.tsp - PlanSpec model (content source)
 */
import "../entities/artifact.tsp";

/**
 * Implementation Plan artifact (plan.yaml stored as Artifact).
 *
 * Extends Artifact with plan-specific summary metadata.
 */
@doc("Implementation Plan artifact (plan.yaml)")
model PlanArtifact extends Artifact {
  @doc("Feature number this plan is for")
  featureNumber: int32;

  @doc("Number of implementation phases")
  phaseCount: int32;

  @doc("Number of new files to be created")
  filesToCreateCount: int32;

  @doc("Number of existing files to be modified")
  filesToModifyCount: int32;

  @doc("Test-Driven Development strategy outlined in this plan")
  tddApproach: string;
}
