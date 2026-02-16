/**
 * @module Shep.Domain.ValueObjects.ToolInstallCommand
 *
 * Defines the ToolInstallCommand value object for tool installation execution.
 * This model represents an executable installation command with platform-specific
 * and timeout configuration.
 *
 * This is a value object (not an entity) - it does NOT extend BaseEntity.
 * It is embedded within parent entities and does not have independent identity.
 * ToolInstallCommand is typically embedded within a Tool entity or used
 * during installation execution.
 *
 * ## Usage
 *
 * Import this module to access tool install commands:
 *
 * ```typespec
 * import "./tool-install-command.tsp";
 *
 * model Tool {
 *   installCommand?: ToolInstallCommand;
 * }
 * ```
 */
/**
 * Represents an executable installation command for a tool.
 *
 * ToolInstallCommand is a value object that captures the command-line
 * instructions needed to install a tool, including the command array,
 * target platform, execution timeout, and tool identification.
 *
 * Note: This is a value object, NOT an entity. It does not extend
 * BaseEntity and has no independent lifecycle outside its parent.
 *
 * ## Properties
 *
 * | Property       | Type     | Required | Description                                      |
 * |----------------|----------|----------|--------------------------------------------------|
 * | command        | string[] | Yes      | Command array to execute (e.g., ["npm", "install"]) |
 * | platform       | string   | Yes      | Target platform (e.g., "linux", "darwin", "win32") |
 * | timeout        | int32    | Yes      | Command execution timeout in milliseconds        |
 * | toolName       | string   | Yes      | Name of the tool being installed                 |
 * | packageManager | string   | Yes      | Package manager used (e.g., "npm", "pip", "brew") |
 *
 * @example
 * ```json
 * {
 *   "command": ["npm", "install", "-g", "@shepai/cli"],
 *   "platform": "linux",
 *   "timeout": 300000,
 *   "toolName": "Claude Code",
 *   "packageManager": "npm"
 * }
 * ```
 */
@doc("Executable installation command for a tool")
model ToolInstallCommand {
  /**
   * Command array to execute
   * @example ["npm", "install", "-g", "@shepai/cli"]
   */
  @doc("Command array to execute")
  command: string[];

  /**
   * Target platform
   * @example "linux"
   */
  @doc("Target platform identifier")
  platform: string;

  /**
   * Command execution timeout in milliseconds
   * @example 300000
   */
  @doc("Execution timeout in milliseconds")
  timeout: int32;

  /**
   * Name of the tool being installed
   * @example "Claude Code"
   */
  @doc("Tool name")
  toolName: string;

  /**
   * Package manager used for installation
   * @example "npm"
   */
  @doc("Package manager identifier")
  packageManager: string;
}
