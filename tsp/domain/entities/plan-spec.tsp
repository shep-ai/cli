/**
 * @module Shep.Domain.Entities.PlanSpec
 *
 * Defines the PlanSpec entity representing an implementation plan artifact.
 * This maps to the `plan.yaml` file in the YAML-first spec system.
 *
 * ## Implementation Plan
 *
 * PlanSpec captures the implementation strategy:
 * - Architecture overview
 * - Phased implementation approach with TDD cycles
 * - Files to create or modify
 * - Testing strategy
 * - Risk mitigation
 *
 * ## Usage
 *
 * ```typespec
 * import "./plan-spec.tsp";
 *
 * // Plan spec is typically read from plan.yaml
 * ```
 */
import "./spec-artifact-base.tsp";
import "../value-objects/spec-metadata.tsp";

/**
 * Represents an implementation plan artifact (plan.yaml).
 *
 * PlanSpec extends SpecArtifactBase with implementation phases and file change
 * tracking. Phases group related tasks and indicate parallel execution opportunities.
 */
@doc("Implementation plan artifact defining strategy and file changes")
model PlanSpec extends SpecArtifactBase {
  @doc("Structured implementation phases with task groupings")
  phases: PlanPhase[];

  @doc("New files planned to be created")
  filesToCreate: string[];

  @doc("Existing files planned to be modified")
  filesToModify: string[];
}
