/**
 * @module Shep.Domain.ValueObjects.TasksArtifact
 *
 * Defines the TasksArtifact model representing a Task Breakdown artifact.
 * This maps to the stored artifact corresponding to `tasks.yaml` in the YAML-first spec system.
 *
 * @see ../entities/artifact.tsp - Base Artifact model
 * @see ../entities/tasks-spec.tsp - TasksSpec model (content source)
 */
import "../entities/artifact.tsp";

/**
 * Task Breakdown artifact (tasks.yaml stored as Artifact).
 *
 * Extends Artifact with task-specific summary metadata.
 */
@doc("Task Breakdown artifact (tasks.yaml)")
model TasksArtifact extends Artifact {
  @doc("Feature number this task breakdown is for")
  featureNumber: int32;

  @doc("Total number of tasks in this breakdown")
  taskCount: int32;

  @doc("Combined effort estimate (e.g., '3d', '2w')")
  totalEffortEstimate: string;

  @doc("Count of tasks by state (Todo, WIP, Done, Review)")
  taskStates: Record<string>;

  @doc("Number of inter-task dependencies")
  dependencyCount: int32;
}
