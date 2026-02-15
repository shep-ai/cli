/**
 * @module Shep.Common.Enums.AgentConfig
 *
 * Defines enums for agent configuration in the Shep AI platform.
 * These enums control which AI coding tool powers Shep's operations
 * and how authentication is handled for each tool.
 *
 * ## Supported Agents
 *
 * Claude Code and Cursor are fully supported. Other agents
 * (Gemini CLI, Aider, Continue) are listed for future
 * extensibility and appear as "Coming Soon" in the TUI wizard.
 */
/**
 * The AI coding agent tool used by Shep for all LLM-powered operations.
 *
 * ```
 * claude-code  ← Currently supported
 * cursor       ← Currently supported
 * gemini-cli   ← Coming Soon
 * aider        ← Coming Soon
 * continue     ← Coming Soon
 * ```
 */
@doc("AI coding agent tool selection")
enum AgentType {
  /**
   * Anthropic's Claude Code CLI tool.
   * The only currently supported agent.
   */
  @doc("Claude Code CLI by Anthropic")
  ClaudeCode: "claude-code",

  /**
   * Google's Gemini CLI tool.
   * Not yet supported — listed for future extensibility.
   */
  @doc("Gemini CLI by Google (coming soon)")
  GeminiCli: "gemini-cli",

  /**
   * Aider AI coding assistant.
   * Not yet supported — listed for future extensibility.
   */
  @doc("Aider AI coding assistant (coming soon)")
  Aider: "aider",

  /**
   * Continue IDE extension.
   * Not yet supported — listed for future extensibility.
   */
  @doc("Continue IDE extension (coming soon)")
  Continue: "continue",

  /**
   * Cursor AI coding agent.
   * Supported — uses the `agent` binary for CLI execution.
   */
  @doc("Cursor AI coding agent")
  Cursor: "cursor",
}

/**
 * Authentication method for the selected agent.
 *
 * ```
 * session  ← Use agent's existing auth (default)
 * token    ← Provide API token stored in settings DB
 * ```
 */
@doc("Authentication method for the AI agent")
enum AgentAuthMethod {
  /**
   * Use the agent's existing authentication session.
   * The agent manages its own auth (e.g., Claude Code OAuth).
   */
  @doc("Use agent's existing auth session")
  Session: "session",

  /**
   * Use an API token stored in the Shep settings database.
   * Token is set via the TUI wizard or --token CLI flag.
   */
  @doc("Use API token stored in settings")
  Token: "token",
}
