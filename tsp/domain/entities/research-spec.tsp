/**
 * @module Shep.Domain.Entities.ResearchSpec
 *
 * Defines the ResearchSpec entity representing a research artifact.
 * This maps to the `research.yaml` file in the YAML-first spec system.
 *
 * ## Research Artifact
 *
 * ResearchSpec captures technical analysis and decisions made during the
 * research phase:
 * - Technology choices and rationale
 * - Library evaluations
 * - Architecture decisions
 * - Trade-off analysis
 *
 * ## Usage
 *
 * ```typespec
 * import "./research-spec.tsp";
 *
 * // Research spec is typically read from research.yaml
 * ```
 */
import "./spec-artifact-base.tsp";
import "../value-objects/spec-metadata.tsp";

/**
 * Represents a research artifact (research.yaml).
 *
 * ResearchSpec extends SpecArtifactBase with structured technology decisions.
 * The decisions array captures each significant technical choice with rationale.
 */
@doc("Research artifact documenting technical analysis and decisions")
model ResearchSpec extends SpecArtifactBase {
  @doc("Structured technology decisions with rationale")
  decisions: TechDecision[];
}
