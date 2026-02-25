/**
 * @module Shep.Domain.Entities.ResearchArtifact
 *
 * Defines the ResearchArtifact entity representing a technical research document.
 * This maps to the `research.yaml` file in the YAML-first spec system.
 *
 * ## Research Artifact
 *
 * ResearchArtifact captures technical analysis and decisions made during the
 * research phase:
 * - Technology choices and rationale
 * - Library evaluations
 * - Architecture decisions
 * - Trade-off analysis
 */
import "./spec-artifact-base.tsp";
import "../value-objects/spec-metadata.tsp";

/**
 * Represents a research artifact (research.yaml).
 *
 * ResearchArtifact extends SpecArtifactBase with structured technology decisions.
 * The decisions array captures each significant technical choice with rationale.
 */
@doc("Research artifact documenting technical analysis and decisions")
model ResearchArtifact extends SpecArtifactBase {
  @doc("Structured technology decisions with rationale")
  decisions: TechDecision[];
}
