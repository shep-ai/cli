/**
 * @module Shep.Domain.ValueObjects.BaseSpecArtifact
 *
 * Defines the BaseSpecArtifact model — the common base for all spec-driven
 * artifact types (spec.yaml, research.yaml, plan.yaml, tasks.yaml, feature.yaml).
 *
 * All spec artifacts share a `featureNumber` linking them to a specific feature.
 *
 * @see ../entities/artifact.tsp - Base Artifact entity
 * @see ./spec-artifact.tsp - SpecArtifact (spec.yaml)
 * @see ./research-artifact.tsp - ResearchArtifact (research.yaml)
 * @see ./plan-artifact.tsp - PlanArtifact (plan.yaml)
 * @see ./tasks-artifact.tsp - TasksArtifact (tasks.yaml)
 * @see ./feature-artifact.tsp - FeatureArtifact (feature.yaml)
 */
import "../entities/artifact.tsp";

/**
 * Base model for all spec-driven artifacts.
 *
 * Extends Artifact with the shared `featureNumber` field that every
 * spec artifact requires to associate itself with a feature.
 */
@doc("Base for all spec-driven artifacts (spec, research, plan, tasks, feature)")
model BaseSpecArtifact extends Artifact {
  @doc("Feature number this artifact is associated with (e.g., 031)")
  featureNumber: int32;
}
