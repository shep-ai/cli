/**
 * @module Shep.Agents.AgentDefinition
 *
 * Registry metadata for a LangGraph agent workflow.
 * Not persisted to database — used for in-memory registration only.
 *
 * Note: graphFactory is a TypeScript function reference that creates
 * the StateGraph instance. Not modeled in TypeSpec because it's
 * runtime-only infrastructure code.
 */
@doc("Agent workflow registration metadata")
model AgentDefinition {
  @doc("Unique agent workflow name (e.g., analyze-repository)")
  name: string;

  @doc("Human-readable description of what this agent does")
  description: string;
}
