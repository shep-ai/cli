/**
 * @module Shep.Common.Enums.Lifecycle
 *
 * Defines the Software Development Lifecycle (SDLC) stages that features
 * progress through in the Shep AI platform.
 *
 * State Transition Flow:
 * ```
 * Started → Analyze → Requirements → Research → Planning → Implementation → Review → Maintain
 *    |          |           |             |           |            |            |          |
 *    v          v           v             v           v            v            v          v
 * (init)    (scan)     (gather)      (analyze)   (plan)       (code)      (merge)   (done)
 * ```
 *
 * Features always start in Started and progress forward. The Review phase
 * represents implementation complete, awaiting merge approval. Maintain is
 * the terminal state where the agent becomes permanently inactive.
 */
/**
 * Represents the stages of the Software Development Lifecycle.
 * Each feature progresses through these stages from inception to maintenance.
 */
@doc("Software Development Lifecycle stages for feature progression")
enum SdlcLifecycle {
  /**
   * Initial state when a feature is first created.
   * No analysis or work has begun yet.
   */
  @doc("Initial state when feature is first created")
  Started,

  /**
   * Codebase analysis stage where the repository is scanned,
   * dependencies are identified, and architecture is discovered.
   */
  @doc("Analyzing codebase structure and architecture")
  Analyze,

  /**
   * Requirements gathering stage where user requirements are gathered
   * through conversational interaction with the AI assistant.
   */
  @doc("Gathering and documenting user requirements")
  Requirements,

  /**
   * Technical research stage where the codebase is analyzed,
   * dependencies are identified, and technical feasibility is assessed.
   */
  @doc("Analyzing codebase and researching implementation approaches")
  Research,

  /**
   * Planning stage where the implementation plan is created with
   * task breakdown, dependencies, and TDD cycles. This stage has
   * its own approval gate (--allow-plan).
   */
  @doc("Creating implementation plan with task breakdown")
  Planning,

  /**
   * Active development stage where code changes are being
   * implemented according to the approved plan.
   */
  @doc("Executing code changes based on the approved plan")
  Implementation,

  /**
   * Post-implementation stage where code is pushed, PR may exist,
   * and the feature is awaiting user merge approval. This is NOT
   * a code review phase — it's a "ready to merge" approval gate.
   */
  @doc("Implementation complete, awaiting merge approval")
  Review,

  /**
   * Terminal state. The feature is merged/deployed and the agent
   * becomes permanently inactive. Features remain in Maintain forever.
   * No backward transitions are allowed from this state.
   */
  @doc("Terminal state — feature merged, agent permanently inactive")
  Maintain,

  /**
   * Blocked state. The feature is waiting for its parent feature to
   * satisfy a lifecycle gate before agent execution can begin.
   * No agent is spawned and no lifecycle transitions occur while blocked.
   */
  @doc("Waiting for parent feature to satisfy a lifecycle gate — agent not yet spawned")
  Blocked,
}
