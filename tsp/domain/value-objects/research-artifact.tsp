/**
 * @module Shep.Domain.ValueObjects.ResearchArtifact
 *
 * Defines the ResearchArtifact model representing a Research Analysis artifact.
 * This maps to the stored artifact corresponding to `research.yaml` in the YAML-first spec system.
 *
 * ## ResearchArtifact
 *
 * ResearchArtifact captures the stored artifact metadata for a research analysis file.
 * It extends the base Artifact model with fields specific to research artifacts.
 *
 * ## Usage
 *
 * ```typespec
 * import "../value-objects/research-artifact.tsp";
 *
 * // Use when storing/retrieving research artifacts
 * ```
 *
 * @see ../entities/artifact.tsp - Base Artifact model
 * @see ../entities/research-spec.tsp - ResearchSpec model (content source)
 */
/**
 * Represents a Research Analysis artifact (research.yaml stored as Artifact).
 *
 * ResearchArtifact extends the base Artifact model with metadata specific to
 * research and technical analysis documents. The artifact's category is typically
 * Design or Other, and format is usually YAML or Markdown.
 *
 * ## Properties
 *
 * | Property | Type | Description |
 * |----------|------|-------------|
 * | featureNumber | int32 | Feature number this research is associated with |
 * | decisionCount | int32 | Number of technology decisions documented |
 * | evaluatedTechnologies | string[] | List of technologies evaluated or compared |
 * | selectedTechnology | string | Primary technology selected from research |
 *
 * @example
 * ```json
 * {
 *   "id": "660f9511-f3ac-52e5-b827-557766551111",
 *   "name": "Repository Open Folder - Technical Research",
 *   "type": "research",
 *   "category": "Design",
 *   "format": "yaml",
 *   "summary": "Technical analysis of folder-opening implementation across platforms",
 *   "path": "specs/031-repo-open-folder-action/research.yaml",
 *   "state": "Done",
 *   "featureNumber": 31,
 *   "decisionCount": 2,
 *   "evaluatedTechnologies": ["Node.js child_process", "Electron IPC", "shell exec"],
 *   "selectedTechnology": "Node.js spawn with platform detection",
 *   "createdAt": "2024-01-15T11:00:00Z",
 *   "updatedAt": "2024-01-15T15:30:00Z"
 * }
 * ```
 */
@doc("Research Analysis artifact (research.yaml)")
model ResearchArtifact {
  @doc("Feature number this research is associated with")
  featureNumber: int32;

  @doc("Number of technology decisions documented")
  decisionCount: int32;

  @doc("Technologies evaluated or compared in this research")
  evaluatedTechnologies: string[];

  @doc("Primary technology selected from research")
  selectedTechnology: string;
}
