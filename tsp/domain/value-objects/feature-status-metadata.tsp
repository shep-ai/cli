/**
 * @module Shep.Domain.ValueObjects.FeatureStatusMetadata
 *
 * Defines value objects for the feature.yaml status tracking artifact.
 * These models represent the nested sections of feature.yaml which tracks
 * execution state, validation gates, task progress, and checkpoints.
 *
 * ## Design Notes
 *
 * These are value objects (not entities) — they do NOT extend BaseEntity.
 * They are embedded within the FeatureStatus entity and have no independent identity.
 *
 * ## Usage
 *
 * ```typespec
 * import "./feature-status-metadata.tsp";
 *
 * model FeatureStatus extends BaseEntity {
 *   status: FeatureStatusInfo;
 *   validation: FeatureValidation;
 * }
 * ```
 */
/**
 * Identity metadata for the feature being tracked.
 *
 * Corresponds to the `feature:` section in feature.yaml.
 */
@doc("Feature identity metadata in feature.yaml")
model FeatureIdentity {
  @doc("Feature ID slug (e.g., '012-autonomous-pr-review-loop')")
  id: string;

  @doc("Human-readable feature name")
  name: string;

  @doc("Feature number (e.g., 12)")
  number: int32;

  @doc("Git branch for this feature")
  branch: string;

  @doc("Current lifecycle phase (e.g., 'research', 'implementation', 'complete')")
  lifecycle: string;

  @doc("When the feature was created")
  createdAt: string;
}

/**
 * Progress counters for task completion.
 *
 * Corresponds to the `status.progress` section in feature.yaml.
 */
@doc("Task completion progress counters")
model FeatureStatusProgress {
  @doc("Number of completed tasks")
  completed: int32;

  @doc("Total number of tasks")
  total: int32;

  @doc("Completion percentage (0-100)")
  percentage: int32;
}

/**
 * Current execution status of the feature.
 *
 * Corresponds to the `status:` section in feature.yaml.
 */
@doc("Feature execution status")
model FeatureStatusInfo {
  @doc("Current SDLC phase")
  phase: string;

  @doc("Task completion progress")
  progress: FeatureStatusProgress;

  @doc("ID of the task currently being executed (null if none)")
  currentTask?: string;

  @doc("ISO timestamp of last status update")
  lastUpdated: string;

  @doc("Agent or skill that last updated the status")
  lastUpdatedBy: string;
}

/**
 * Validation gate tracking.
 *
 * Corresponds to the `validation:` section in feature.yaml.
 */
@doc("Validation gate results")
model FeatureValidation {
  @doc("ISO timestamp of last validation run (null if never run)")
  lastRun?: string;

  @doc("Names of validation gates that passed")
  gatesPassed: string[];

  @doc("Descriptions of auto-fixes that were applied")
  autoFixesApplied: string[];
}

/**
 * Task execution tracking.
 *
 * Corresponds to the `tasks:` section in feature.yaml.
 */
@doc("Task execution tracking state")
model FeatureTaskTracking {
  @doc("ID of the task currently being worked on (null if none)")
  current?: string;

  @doc("IDs of tasks blocked by unmet dependencies")
  blocked: string[];

  @doc("IDs of tasks that failed execution")
  failed: string[];
}

/**
 * A milestone checkpoint recording phase completion.
 *
 * Corresponds to entries in the `checkpoints:` array in feature.yaml.
 */
@doc("Milestone checkpoint for phase completion")
model FeatureCheckpoint {
  @doc("Phase name (e.g., 'feature-created', 'research-complete')")
  phase: string;

  @doc("ISO timestamp when this checkpoint was reached")
  completedAt: string;

  @doc("Agent or skill that completed this phase")
  completedBy: string;
}

/**
 * Error tracking state.
 *
 * Corresponds to the `errors:` section in feature.yaml.
 */
@doc("Error tracking for feature execution")
model FeatureErrors {
  @doc("Current error message (null if no active error)")
  current?: string;

  @doc("History of past error messages")
  history: string[];
}
