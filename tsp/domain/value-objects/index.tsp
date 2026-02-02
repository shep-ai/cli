/**
 * @module Shep.Domain.ValueObjects
 *
 * Index module that re-exports all value objects from the domain layer.
 *
 * Value objects are immutable types that describe characteristics of entities
 * but have no identity of their own. They are defined by their attributes
 * rather than by a unique identifier.
 *
 * ## Included Value Objects
 *
 * - **GanttTask**: Individual task for Gantt chart visualization
 * - **GanttViewData**: Container for complete Gantt chart data
 *
 * ## Usage
 *
 * Import this index to access all domain value objects:
 *
 * ```typespec
 * import "./value-objects/index.tsp";
 *
 * model Plan {
 *   workPlan?: GanttViewData;
 * }
 * ```
 */
import "./gantt.tsp";
