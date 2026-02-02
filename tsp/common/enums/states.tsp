/**
 * @module Shep.Common.Enums.States
 *
 * Defines state enums for various entities in the Shep AI platform.
 * Each state enum represents the lifecycle states of a specific entity type.
 */
/**
 * Plan State Transition Flow:
 * ```
 * Requirements --> ClarificationRequired --> Ready
 *      |                  ^                    |
 *      |                  |                    |
 *      +------------------+                    |
 *      (needs clarification)                   v
 *                                         (approved)
 * ```
 */
@doc("States for plan entities during the planning phase")
enum PlanState {
  /**
   * Plan is being created based on gathered requirements.
   * This is the initial state when a plan is first generated.
   */
  @doc("Plan is being created from requirements")
  Requirements,

  /**
   * Plan requires additional clarification from the user
   * before it can proceed to the ready state.
   */
  @doc("Additional user clarification needed before proceeding")
  ClarificationRequired,

  /**
   * Plan has been fully specified and approved,
   * ready for execution.
   */
  @doc("Plan is complete and ready for execution")
  Ready,
}

/**
 * Task State Transition Flow:
 * ```
 * Todo --> WIP --> Done
 *           |       |
 *           v       v
 *        Review <---+
 *           |
 *           v
 *     (back to WIP if issues found)
 * ```
 */
@doc("States for task entities during execution")
enum TaskState {
  /**
   * Task has been created but work has not yet started.
   * This is the initial state for all tasks.
   */
  @doc("Task created but not yet started")
  Todo,

  /**
   * Task is actively being worked on.
   * Only one task should typically be WIP at a time.
   */
  @doc("Task is currently being worked on")
  WIP: "Work in Progress",

  /**
   * Task work has been completed and is ready for review
   * or has passed review.
   */
  @doc("Task work has been completed")
  Done,

  /**
   * Task is under review. May transition back to WIP
   * if issues are found, or to Done if approved.
   */
  @doc("Task is being reviewed for quality and correctness")
  Review,
}

/**
 * Artifact State Transition Flow:
 * ```
 * Todo --> Elaborating --> Done
 *              |            ^
 *              +------------+
 *           (content generation)
 * ```
 */
@doc("States for artifact entities during generation")
enum ArtifactState {
  /**
   * Artifact has been identified but content generation
   * has not yet started.
   */
  @doc("Artifact identified but not yet generated")
  Todo,

  /**
   * Artifact content is being generated or refined
   * by the AI system.
   */
  @doc("Artifact content is being generated")
  Elaborating,

  /**
   * Artifact content has been fully generated and
   * is ready for use.
   */
  @doc("Artifact generation is complete")
  Done,
}

/**
 * Research State Transition Flow:
 * ```
 * NotStarted --> Running --> Finished
 *                   |           ^
 *                   +-----------+
 *               (analysis complete)
 * ```
 */
@doc("States for research activities during analysis")
enum ResearchState {
  /**
   * Research has been queued but analysis has not
   * yet begun.
   */
  @doc("Research queued but not yet started")
  NotStarted,

  /**
   * Research is actively being conducted, including
   * codebase analysis and dependency discovery.
   */
  @doc("Research analysis is in progress")
  Running,

  /**
   * Research has been completed and findings are
   * available for use in planning.
   */
  @doc("Research analysis has been completed")
  Finished,
}

/**
 * Feature Agent State Transition Flow:
 * ```
 * GatheringRequirements --> ClarificationsRequired --> DoingResearch
 *          ^                        |                       |
 *          |                        v                       v
 *          +------------------------+               AwaitingReview
 *                                                          |
 *                                                          v
 *                                                  ExecutingWorkPlan
 *                                                          |
 *                                                          v
 *                                                        Ready
 * ```
 */
@doc("States for the feature agent orchestrating the SDLC workflow")
enum FeatureAgentState {
  /**
   * Agent is actively collecting requirements from
   * the user through conversational interaction.
   */
  @doc("Agent is collecting requirements from the user")
  GatheringRequirements,

  /**
   * Agent has identified ambiguities or gaps in
   * requirements that need user clarification.
   */
  @doc("Agent needs clarification from the user")
  ClarificationsRequired,

  /**
   * Agent is analyzing the codebase and researching
   * implementation approaches.
   */
  @doc("Agent is analyzing codebase and researching approaches")
  DoingResearch,

  /**
   * Agent has completed planning and is waiting for
   * user review and approval before execution.
   */
  @doc("Agent is waiting for user review of the plan")
  AwaitingReview,

  /**
   * Agent is actively executing the approved work plan,
   * implementing code changes.
   */
  @doc("Agent is executing the approved work plan")
  ExecutingWorkPlan,

  /**
   * Agent has completed all work and the feature is
   * ready for deployment or further action.
   */
  @doc("Agent has completed all work for the feature")
  Ready,
}
