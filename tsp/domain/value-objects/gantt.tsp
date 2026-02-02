/**
 * @module Shep.Domain.ValueObjects.Gantt
 *
 * Defines value objects for Gantt chart visualization in the Shep AI platform.
 * These models represent scheduling and progress data for work plan visualization.
 *
 * Gantt charts provide a visual timeline of tasks, their durations, dependencies,
 * and completion progress. This module defines the data structures needed to
 * render Gantt chart views in the UI.
 *
 * ## Usage
 *
 * Import this module to access Gantt visualization data:
 *
 * ```typespec
 * import "./gantt.tsp";
 *
 * model Plan {
 *   workPlan?: GanttViewData;
 * }
 * ```
 *
 * ## Design Notes
 *
 * These are value objects (not entities) - they do NOT extend BaseEntity.
 * They are embedded within parent entities and do not have independent identity.
 * GanttViewData is typically embedded within a Plan entity.
 */
import "../../common/scalars.tsp";

/**
 * Represents a single task within a Gantt chart visualization.
 *
 * GanttTask is a value object that captures the scheduling metadata
 * for displaying a task in a Gantt chart, including its time bounds,
 * dependencies on other tasks, and current completion progress.
 *
 * Note: This is a value object, NOT an entity. It does not extend
 * BaseEntity and has no independent lifecycle outside its parent.
 */
@doc("Individual task representation within a Gantt chart visualization")
model GanttTask {
  @doc("Unique identifier for the Gantt task")
  id: UUID;

  @doc("Display name of the task shown in the Gantt chart")
  name: string;

  @doc("Scheduled start time for the task")
  start: utcDateTime;

  @doc("Scheduled end time for the task")
  end: utcDateTime;

  @doc("IDs of tasks that this task depends on (must complete before this task can start)")
  dependencies: UUID[];

  @doc("Completion progress as a fraction (0.0 = not started, 1.0 = complete)")
  progress: float32;
}

/**
 * Container for Gantt chart visualization data.
 *
 * GanttViewData aggregates all the information needed to render a complete
 * Gantt chart, including the list of tasks and the overall time bounds
 * for the visualization viewport.
 *
 * Note: This is a value object, NOT an entity. It does not extend
 * BaseEntity and is typically embedded within a Plan entity.
 */
@doc("Container for Gantt chart visualization data including tasks and time bounds")
model GanttViewData {
  @doc("Collection of tasks to display in the Gantt chart")
  tasks: GanttTask[];

  @doc("Start date of the overall work plan (left boundary of the chart)")
  startDate: utcDateTime;

  @doc("End date of the overall work plan (right boundary of the chart)")
  endDate: utcDateTime;
}
