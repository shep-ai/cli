/**
 * @module Shep.Domain.ValueObjects.TasksArtifact
 *
 * Defines the TasksArtifact model representing a Task Breakdown artifact.
 * This maps to the stored artifact corresponding to `tasks.yaml` in the YAML-first spec system.
 *
 * @see ./base-spec-artifact.tsp - BaseSpecArtifact (common base)
 * @see ../entities/artifact.tsp - Base Artifact model
 */
import "./base-spec-artifact.tsp";

/**
 * Task Breakdown artifact (tasks.yaml stored as Artifact).
 *
 * Extends BaseSpecArtifact with task-specific summary metadata.
 */
@doc("Task Breakdown artifact (tasks.yaml)")
model TasksArtifact extends BaseSpecArtifact {
  @doc("Total number of tasks in this breakdown")
  taskCount: int32;

  @doc("Combined effort estimate (e.g., '3d', '2w')")
  totalEffortEstimate: string;

  @doc("Count of tasks by state (Todo, WIP, Done, Review)")
  taskStates: Record<string>;

  @doc("Number of inter-task dependencies")
  dependencyCount: int32;
}
