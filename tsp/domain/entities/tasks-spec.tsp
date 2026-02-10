/**
 * @module Shep.Domain.Entities.TasksSpec
 *
 * Defines the TasksSpec entity representing a task breakdown artifact.
 * This maps to the `tasks.yaml` file in the YAML-first spec system.
 *
 * ## Task Breakdown
 *
 * TasksSpec captures the detailed task list for implementation:
 * - Individual tasks with acceptance criteria
 * - TDD phases (RED-GREEN-REFACTOR) for each task
 * - Task dependencies
 * - Effort estimates
 *
 * ## Usage
 *
 * ```typespec
 * import "./tasks-spec.tsp";
 *
 * // Tasks spec is typically read from tasks.yaml
 * ```
 */
import "./spec-artifact-base.tsp";
import "../value-objects/spec-metadata.tsp";

/**
 * Represents a task breakdown artifact (tasks.yaml).
 *
 * TasksSpec extends SpecArtifactBase with a structured task list and overall
 * effort estimate. Each task includes acceptance criteria, TDD phases, and
 * dependency tracking.
 */
@doc("Task breakdown artifact defining implementation tasks")
model TasksSpec extends SpecArtifactBase {
  @doc("Structured task list with acceptance criteria and TDD phases")
  tasks: SpecTask[];

  @doc("Overall effort estimate for all tasks combined")
  totalEstimate: string;
}
