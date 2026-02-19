/**
 * @module Shep.Domain.ValueObjects.ResearchArtifact
 *
 * Defines the ResearchArtifact model representing a Research Analysis artifact.
 * This maps to the stored artifact corresponding to `research.yaml` in the YAML-first spec system.
 *
 * @see ./base-spec-artifact.tsp - BaseSpecArtifact (common base)
 * @see ../entities/artifact.tsp - Base Artifact model
 */
import "./base-spec-artifact.tsp";

/**
 * Research Analysis artifact (research.yaml stored as Artifact).
 *
 * Extends BaseSpecArtifact with research-specific summary metadata.
 */
@doc("Research Analysis artifact (research.yaml)")
model ResearchArtifact extends BaseSpecArtifact {
  @doc("Number of technology decisions documented")
  decisionCount: int32;

  @doc("Technologies evaluated or compared in this research")
  evaluatedTechnologies: string[];

  @doc("Primary technology selected from research")
  selectedTechnology: string;
}
