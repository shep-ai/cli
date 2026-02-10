/**
 * @module Shep.Domain.ValueObjects.SpecMetadata
 *
 * Defines value objects for spec artifact metadata in the Shep AI platform.
 * These models represent structured metadata for feature specifications, research,
 * plans, and task breakdowns in the YAML-first spec system.
 *
 * ## Design Notes
 *
 * These are value objects (not entities) - they do NOT extend BaseEntity.
 * They are embedded within parent spec artifact entities (FeatureSpec, ResearchSpec,
 * PlanSpec, TasksSpec) and do not have independent identity.
 *
 * ## Usage
 *
 * Import this module to access spec metadata value objects:
 *
 * ```typespec
 * import "./spec-metadata.tsp";
 *
 * model FeatureSpec extends SpecArtifactBase {
 *   openQuestions: OpenQuestion[];
 * }
 * ```
 */
import "../../common/scalars.tsp";
import "../../common/enums/index.tsp";

/**
 * Represents an open question within a spec document.
 *
 * OpenQuestion captures questions that need resolution before implementation
 * can proceed. The validation gate checks that all open questions are resolved
 * (resolved: true) before allowing implementation to start.
 */
@doc("Open question that may need resolution before implementation")
model OpenQuestion {
  @doc("The question text that needs to be answered")
  question: string;

  @doc("Whether this question has been resolved (false = blocking)")
  resolved: boolean;

  @doc("The answer or resolution to this question (present if resolved)")
  answer?: string;
}

/**
 * Represents a technology decision documented in research.
 *
 * TechDecision captures structured information about technology choices
 * made during the research phase, including what was chosen, what was
 * rejected, and the rationale for the decision.
 */
@doc("Technology or approach decision with rationale")
model TechDecision {
  @doc("Title or name of the decision being made")
  title: string;

  @doc("The chosen technology, library, or approach")
  chosen: string;

  @doc("Alternative options that were considered but rejected")
  rejected: string[];

  @doc("Rationale explaining why the chosen option was selected")
  rationale: string;
}

/**
 * Represents an implementation phase within a plan.
 *
 * PlanPhase groups related tasks into a logical implementation phase,
 * with optional parallel execution support for independent tasks.
 */
@doc("Implementation phase grouping related tasks")
model PlanPhase {
  @doc("Unique identifier for this phase (e.g., 'phase-1')")
  id: string;

  @doc("Display name of the phase")
  name: string;

  @doc("Whether tasks in this phase can be executed in parallel")
  parallel: boolean;

  @doc("IDs of SpecTasks that belong to this phase")
  taskIds: string[];
}

/**
 * Represents the TDD (Test-Driven Development) cycle for a task.
 *
 * TddCycle captures the three phases of TDD: RED (write failing tests),
 * GREEN (implement to pass tests), and REFACTOR (improve while keeping
 * tests green).
 */
@doc("Test-Driven Development cycle phases for a task")
model TddCycle {
  @doc("RED phase: tests to write FIRST (before implementation)")
  red: string[];

  @doc("GREEN phase: minimal implementation to pass tests")
  green: string[];

  @doc("REFACTOR phase: code improvements while keeping tests green")
  refactor: string[];
}

/**
 * Represents a task within a spec's task breakdown.
 *
 * SpecTask is distinct from the domain Task entity - it represents a
 * task as documented in the tasks.yaml spec file, not a runtime task
 * entity in the system.
 */
@doc("Task definition within a spec's task breakdown")
model SpecTask {
  @doc("Unique identifier for this task (e.g., 'task-1')")
  id: string;

  @doc("Task title or name")
  title: string;

  @doc("Detailed description of what this task accomplishes")
  description: string;

  @doc("Current state of the task")
  state: TaskState;

  @doc("IDs of other SpecTasks that must complete before this task starts")
  dependencies: string[];

  @doc("List of acceptance criteria that define task completion")
  acceptanceCriteria: string[];

  @doc("TDD cycle definition for this task (if applicable)")
  tdd?: TddCycle;

  @doc("Estimated effort (e.g., '2 hours', '1 day')")
  estimatedEffort: string;
}
