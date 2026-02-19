/**
 * @module Shep.Domain.Entities.TechnicalPlanArtifact
 *
 * Defines the TechnicalPlanArtifact entity representing a technical implementation plan.
 * This maps to the `plan.yaml` file in the YAML-first spec system.
 *
 * ## Technical Plan Artifact
 *
 * TechnicalPlanArtifact captures the implementation strategy without explicit task breakdown:
 * - Architecture overview
 * - Phased implementation approach
 * - Files to create or modify
 * - Risk mitigation
 */
import "./spec-artifact-base.tsp";
import "../value-objects/spec-metadata.tsp";

/**
 * Represents a technical implementation plan artifact (plan.yaml).
 *
 * TechnicalPlanArtifact extends SpecArtifactBase with implementation phases
 * and file change tracking. Phases group related work and indicate parallel
 * execution opportunities.
 */
@doc("Technical implementation plan artifact defining strategy and file changes")
model TechnicalPlanArtifact extends SpecArtifactBase {
  @doc("Structured implementation phases")
  phases: PlanPhase[];

  @doc("New files planned to be created")
  filesToCreate: string[];

  @doc("Existing files planned to be modified")
  filesToModify: string[];
}
