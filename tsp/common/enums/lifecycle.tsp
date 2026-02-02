/**
 * @module Shep.Common.Enums.Lifecycle
 *
 * Defines the Software Development Lifecycle (SDLC) stages that features
 * progress through in the Shep AI platform.
 *
 * State Transition Flow:
 * ```
 * Requirements --> Research --> Implementation --> Review --> Deploy & QA --> Maintain
 *      |              |              |              |              |
 *      v              v              v              v              v
 *   (gather)      (analyze)      (code)       (validate)     (release)      (support)
 * ```
 *
 * Features always start in Requirements and progress forward. Backward
 * transitions may occur during Review if issues are found.
 */
/**
 * Represents the stages of the Software Development Lifecycle.
 * Each feature progresses through these stages from inception to maintenance.
 */
@doc("Software Development Lifecycle stages for feature progression")
enum SdlcLifecycle {
  /**
   * Initial stage where user requirements are gathered through
   * conversational interaction with the AI assistant.
   */
  @doc("Gathering and documenting user requirements")
  Requirements,

  /**
   * Analysis stage where the codebase is analyzed, dependencies
   * are identified, and technical feasibility is assessed.
   */
  @doc("Analyzing codebase and researching implementation approaches")
  Research,

  /**
   * Active development stage where code changes are being
   * implemented according to the approved plan.
   */
  @doc("Executing code changes based on the approved plan")
  Implementation,

  /**
   * Validation stage where implemented changes are reviewed
   * for correctness, quality, and alignment with requirements.
   */
  @doc("Reviewing implemented changes for quality and correctness")
  Review,

  /**
   * Release stage where approved changes are deployed to
   * target environments and quality assurance is performed.
   */
  @doc("Deploying changes and performing quality assurance")
  DeployAndQA: "Deploy & QA",

  /**
   * Ongoing support stage where the feature is monitored,
   * bugs are addressed, and improvements are made.
   */
  @doc("Ongoing maintenance and support of deployed features")
  Maintain,
}
