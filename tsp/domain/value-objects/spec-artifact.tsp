/**
 * @module Shep.Domain.ValueObjects.SpecArtifact
 *
 * Defines the SpecArtifact model representing a Feature Specification artifact.
 * This maps to the stored artifact corresponding to `spec.yaml` in the YAML-first spec system.
 *
 * ## SpecArtifact
 *
 * SpecArtifact captures the stored artifact metadata for a feature specification file.
 * It extends the base Artifact model with fields specific to feature specification artifacts.
 *
 * ## Usage
 *
 * ```typespec
 * import "../value-objects/spec-artifact.tsp";
 *
 * // Use when storing/retrieving feature spec artifacts
 * ```
 *
 * @see ../entities/artifact.tsp - Base Artifact model
 * @see ../entities/feature-spec.tsp - FeatureSpec model (content source)
 */
/**
 * Represents a Feature Specification artifact (spec.yaml stored as Artifact).
 *
 * SpecArtifact extends the base Artifact model with metadata specific to
 * feature specification documents. The artifact's category is always PRD,
 * and the format is typically YAML or Markdown.
 *
 * ## Properties
 *
 * | Property | Type    | Description |
 * |----------|---------|-------------|
 * | featureNumber | int32 | Feature number referenced in the spec (e.g., 011) |
 * | branch | string | Git branch associated with this feature spec |
 * | oneLiner | string | One-line summary of the feature |
 * | phase | SdlcLifecycle | Current SDLC phase of the feature |
 * | sizeEstimate | string | Size estimate (XS, S, M, L, XL) |
 *
 * @example
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "name": "Repository Open Folder Action",
 *   "type": "spec",
 *   "category": "PRD",
 *   "format": "yaml",
 *   "summary": "Add an Open Folder action button to the repository node",
 *   "path": "specs/031-repo-open-folder-action/spec.yaml",
 *   "state": "Done",
 *   "featureNumber": 31,
 *   "branch": "feat/031-repo-open-folder-action",
 *   "oneLiner": "Add an Open Folder action button to the repository node",
 *   "phase": "Requirements",
 *   "sizeEstimate": "S",
 *   "createdAt": "2024-01-15T10:30:00Z",
 *   "updatedAt": "2024-01-15T14:20:00Z"
 * }
 * ```
 */
@doc("Feature Specification artifact (spec.yaml)")
model SpecArtifact {
  @doc("Feature number referenced in the spec (e.g., 011)")
  featureNumber: int32;

  @doc("Git branch associated with this feature spec")
  branch: string;

  @doc("One-line summary of the feature")
  oneLiner: string;

  @doc("Current SDLC phase of the feature")
  phase: string;

  @doc("Size estimate: XS, S, M, L, or XL")
  sizeEstimate: string;
}
