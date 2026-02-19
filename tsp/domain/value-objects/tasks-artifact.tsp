/**
 * @module Shep.Domain.ValueObjects.TasksArtifact
 *
 * Defines the TasksArtifact model representing a Task Breakdown artifact.
 * This maps to the stored artifact corresponding to `tasks.yaml` in the YAML-first spec system.
 *
 * ## TasksArtifact
 *
 * TasksArtifact captures the stored artifact metadata for a task breakdown file.
 * It extends the base Artifact model with fields specific to task breakdown artifacts.
 *
 * ## Usage
 *
 * ```typespec
 * import "../value-objects/tasks-artifact.tsp";
 *
 * // Use when storing/retrieving task breakdown artifacts
 * ```
 *
 * @see ../entities/artifact.tsp - Base Artifact model
 * @see ../entities/tasks-spec.tsp - TasksSpec model (content source)
 */
/**
 * Represents a Task Breakdown artifact (tasks.yaml stored as Artifact).
 *
 * TasksArtifact extends the base Artifact model with metadata specific to
 * task breakdown and execution tracking documents. The artifact's category is typically
 * Other or Design, and format is usually YAML or Markdown.
 *
 * ## Properties
 *
 * | Property | Type | Description |
 * |----------|------|-------------|
 * | featureNumber | int32 | Feature number this task breakdown is for |
 * | taskCount | int32 | Total number of tasks in this breakdown |
 * | totalEffortEstimate | string | Combined effort estimate (e.g., "3d", "2w") |
 * | taskStates | map<string, int32> | Count of tasks by state (Todo, WIP, Done, Review) |
 * | dependencyCount | int32 | Number of inter-task dependencies |
 *
 * @example
 * ```json
 * {
 *   "id": "880b1733-b5ce-74g7-d949-779988773333",
 *   "name": "Repository Open Folder - Task Breakdown",
 *   "type": "tasks",
 *   "category": "Other",
 *   "format": "yaml",
 *   "summary": "Detailed task list with TDD phases for implementation",
 *   "path": "specs/031-repo-open-folder-action/tasks.yaml",
 *   "state": "Done",
 *   "featureNumber": 31,
 *   "taskCount": 8,
 *   "totalEffortEstimate": "1d",
 *   "taskStates": { "Todo": 2, "WIP": 1, "Done": 5, "Review": 0 },
 *   "dependencyCount": 3,
 *   "createdAt": "2024-01-15T12:00:00Z",
 *   "updatedAt": "2024-01-15T17:15:00Z"
 * }
 * ```
 */
@doc("Task Breakdown artifact (tasks.yaml)")
model TasksArtifact {
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
