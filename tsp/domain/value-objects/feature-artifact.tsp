/**
 * @module Shep.Domain.ValueObjects.FeatureArtifact
 *
 * Defines the FeatureArtifact model representing a Feature Status artifact.
 * This maps to the stored artifact corresponding to `feature.yaml` in the YAML-first spec system.
 *
 * ## FeatureArtifact
 *
 * FeatureArtifact captures the stored artifact metadata for feature status tracking.
 * It extends the base Artifact model with fields specific to machine-readable feature
 * status and execution tracking.
 *
 * ## Usage
 *
 * ```typespec
 * import "../value-objects/feature-artifact.tsp";
 *
 * // Use when storing/retrieving feature status artifacts
 * ```
 *
 * @see ../entities/artifact.tsp - Base Artifact model
 * @see ../entities/feature.tsp - Feature entity (owner)
 */
/**
 * Represents a Feature Status artifact (feature.yaml stored as Artifact).
 *
 * FeatureArtifact extends the base Artifact model with metadata for tracking
 * the execution and completion status of a feature throughout the SDLC.
 * This is a machine-readable status file that tracks progress and state transitions.
 *
 * ## Properties
 *
 * | Property | Type | Description |
 * |----------|------|-------------|
 * | featureNumber | int32 | Feature number being tracked |
 * | featureSlug | string | URL-friendly slug for the feature |
 * | currentPhase | SdlcLifecycle | Current SDLC phase |
 * | completedTasks | int32 | Number of completed tasks |
 * | totalTasks | int32 | Total number of tasks |
 * | lastUpdated | utcDateTime | Last status update timestamp |
 * | branch | string | Current feature branch name |
 *
 * @example
 * ```json
 * {
 *   "id": "990c2844-c6df-85h8-ea5a-880a99884444",
 *   "name": "Repository Open Folder - Feature Status",
 *   "type": "status",
 *   "category": "Other",
 *   "format": "yaml",
 *   "summary": "Machine-readable status tracking for feature execution",
 *   "path": "specs/031-repo-open-folder-action/feature.yaml",
 *   "state": "Done",
 *   "featureNumber": 31,
 *   "featureSlug": "repo-open-folder-action",
 *   "currentPhase": "Implementation",
 *   "completedTasks": 7,
 *   "totalTasks": 8,
 *   "lastUpdated": "2024-01-15T17:45:00Z",
 *   "branch": "feat/031-repo-open-folder-action",
 *   "createdAt": "2024-01-15T10:30:00Z",
 *   "updatedAt": "2024-01-15T17:45:00Z"
 * }
 * ```
 */
@doc("Feature Status artifact (feature.yaml)")
model FeatureArtifact {
  @doc("Feature number being tracked")
  featureNumber: int32;

  @doc("URL-friendly slug for the feature")
  featureSlug: string;

  @doc("Current SDLC phase")
  currentPhase: string;

  @doc("Number of completed tasks")
  completedTasks: int32;

  @doc("Total number of tasks")
  totalTasks: int32;

  @doc("Last status update timestamp")
  lastUpdated: utcDateTime;

  @doc("Current feature branch name")
  branch: string;
}
