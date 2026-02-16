/**
 * @module Shep.Common.Enums.Tool
 *
 * Defines the ToolType enum for supported IDE and CLI tools that Shep can install.
 * Includes both IDEs (VS Code, Cursor, Windsurf, Zed, Antigravity) and CLI agents
 * (Cursor CLI, Claude Code).
 */
/**
 * Supported IDE and CLI tool types for installation.
 *
 * Each value corresponds to the tool's identifier used in installation
 * registry lookups and settings persistence.
 */
@doc("Supported IDE and CLI tool type for installation")
enum ToolType {
  @doc("Visual Studio Code IDE")
  VsCode: "vscode",

  @doc("Cursor AI Editor")
  Cursor: "cursor",

  @doc("Windsurf Editor")
  Windsurf: "windsurf",

  @doc("Zed Editor")
  Zed: "zed",

  @doc("Google Antigravity IDE")
  Antigravity: "antigravity",

  @doc("Cursor CLI Agent")
  CursorCli: "cursor-cli",

  @doc("Claude Code CLI Agent")
  ClaudeCode: "claude-code",
}
