/**
 * @module Shep.Domain.Entities.TasksArtifact
 *
 * Defines the TasksArtifact entity representing a task breakdown artifact.
 * This maps to the `tasks.yaml` file in the YAML-first spec system.
 *
 * ## Tasks Artifact
 *
 * TasksArtifact captures the detailed task list for implementation:
 * - Individual tasks with acceptance criteria
 * - TDD phases (RED-GREEN-REFACTOR) for each task
 * - Task dependencies
 * - Effort estimates
 */
import "./spec-artifact-base.tsp";
import "../value-objects/spec-metadata.tsp";

/**
 * Represents a task breakdown artifact (tasks.yaml).
 *
 * TasksArtifact extends SpecArtifactBase with a structured task list and overall
 * effort estimate. Each task includes acceptance criteria, TDD phases, and
 * dependency tracking.
 */
@doc("Task breakdown artifact defining implementation tasks grouped into phases")
model TasksArtifact extends SpecArtifactBase {
  @doc("Structured task list with acceptance criteria and TDD phases")
  tasks: SpecTask[];

  @doc("Overall effort estimate for all tasks combined")
  totalEstimate: string;
}
