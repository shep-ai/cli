/**
 * @module Shep.Agents.ApprovalGates
 *
 * Configuration for human-in-the-loop approval gates.
 * Controls which agent phases pause for human review.
 * This is a value object — embedded in AgentRun, not persisted independently.
 */
@doc("Configuration for human-in-the-loop approval gates")
model ApprovalGates {
  @doc("Skip human review after requirements phase")
  allowPrd: boolean;

  @doc("Skip human review after plan phase")
  allowPlan: boolean;

  @doc("Skip human review after merge phase")
  allowMerge: boolean;
}
