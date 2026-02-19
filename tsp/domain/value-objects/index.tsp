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
 * - **OpenQuestion**: Open question within a spec requiring resolution
 * - **TechDecision**: Technology decision with rationale
 * - **PlanPhase**: Implementation phase grouping tasks
 * - **TddCycle**: Test-Driven Development cycle phases
 * - **SpecTask**: Task definition within spec's task breakdown
 *
 * ## Included Artifact Models
 *
 * - **SpecArtifact**: Feature Specification artifact (spec.yaml)
 * - **ResearchArtifact**: Research Analysis artifact (research.yaml)
 * - **PlanArtifact**: Implementation Plan artifact (plan.yaml)
 * - **TasksArtifact**: Task Breakdown artifact (tasks.yaml)
 * - **FeatureArtifact**: Feature Status artifact (feature.yaml)
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
import "./spec-metadata.tsp";
import "./tool-installation-status.tsp";
import "./tool-install-command.tsp";
import "./pull-request.tsp";
import "./spec-artifact.tsp";
import "./research-artifact.tsp";
import "./plan-artifact.tsp";
import "./tasks-artifact.tsp";
import "./feature-artifact.tsp";
