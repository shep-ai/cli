/**
 * @module Shep.Domain.ValueObjects.PlanArtifact
 *
 * Defines the PlanArtifact model representing an Implementation Plan artifact.
 * This maps to the stored artifact corresponding to `plan.yaml` in the YAML-first spec system.
 *
 * ## PlanArtifact
 *
 * PlanArtifact captures the stored artifact metadata for an implementation plan file.
 * It extends the base Artifact model with fields specific to technical plan artifacts.
 *
 * ## Usage
 *
 * ```typespec
 * import "../value-objects/plan-artifact.tsp";
 *
 * // Use when storing/retrieving implementation plan artifacts
 * ```
 *
 * @see ../entities/artifact.tsp - Base Artifact model
 * @see ../entities/plan-spec.tsp - PlanSpec model (content source)
 */
/**
 * Represents an Implementation Plan artifact (plan.yaml stored as Artifact).
 *
 * PlanArtifact extends the base Artifact model with metadata specific to
 * implementation plan documents. The artifact's category is typically Design,
 * and format is usually YAML or Markdown.
 *
 * ## Properties
 *
 * | Property | Type | Description |
 * |----------|------|-------------|
 * | featureNumber | int32 | Feature number this plan is for |
 * | phaseCount | int32 | Number of implementation phases |
 * | filesToCreateCount | int32 | Number of new files to be created |
 * | filesToModifyCount | int32 | Number of existing files to be modified |
 * | tddApproach | string | Test-Driven Development strategy outlined |
 *
 * @example
 * ```json
 * {
 *   "id": "770a0622-a4bd-63f6-c938-668877662222",
 *   "name": "Repository Open Folder - Implementation Plan",
 *   "type": "technical-plan",
 *   "category": "Design",
 *   "format": "yaml",
 *   "summary": "Implementation strategy with TDD phases for folder-opening feature",
 *   "path": "specs/031-repo-open-folder-action/plan.yaml",
 *   "state": "Done",
 *   "featureNumber": 31,
 *   "phaseCount": 4,
 *   "filesToCreateCount": 2,
 *   "filesToModifyCount": 6,
 *   "tddApproach": "RED-GREEN-REFACTOR for API route and component updates",
 *   "createdAt": "2024-01-15T11:30:00Z",
 *   "updatedAt": "2024-01-15T16:45:00Z"
 * }
 * ```
 */
@doc("Implementation Plan artifact (plan.yaml)")
model PlanArtifact {
  @doc("Feature number this plan is for")
  featureNumber: int32;

  @doc("Number of implementation phases")
  phaseCount: int32;

  @doc("Number of new files to be created")
  filesToCreateCount: int32;

  @doc("Number of existing files to be modified")
  filesToModifyCount: int32;

  @doc("Test-Driven Development strategy outlined in this plan")
  tddApproach: string;
}
