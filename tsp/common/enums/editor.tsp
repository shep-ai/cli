/**
 * @module Shep.Common.Enums.Editor
 *
 * Defines the EditorType enum for supported IDE/editor selections.
 * Controls which code editor Shep uses to open worktrees and files.
 */
/**
 * Supported IDE/editor types.
 *
 * Each value corresponds to the editor's identifier used in launcher
 * registry lookups and settings persistence.
 */
@doc("Supported IDE/editor type")
enum EditorType {
  @doc("Visual Studio Code")
  VsCode: "vscode",

  @doc("Cursor AI Editor")
  Cursor: "cursor",

  @doc("Windsurf Editor")
  Windsurf: "windsurf",

  @doc("Zed Editor")
  Zed: "zed",

  @doc("Google Antigravity IDE")
  Antigravity: "antigravity",
}
