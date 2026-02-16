/**
 * @module Shep.Domain.ValueObjects.ToolInstallationStatus
 *
 * Defines value objects for tool installation status and suggestions.
 * These models represent the current state of a tool's installation and
 * provide recommendations for how to install or fix a tool.
 *
 * These are value objects (not entities) - they do NOT extend BaseEntity.
 * They are embedded within parent entities and do not have independent identity.
 * ToolInstallationStatus is typically embedded within a Tool entity or
 * returned as part of an installation check response.
 *
 * ## Usage
 *
 * Import this module to access tool installation status:
 *
 * ```typespec
 * import "./tool-installation-status.tsp";
 *
 * model Tool {
 *   installationStatus?: ToolInstallationStatus;
 * }
 * ```
 */
import "../../common/enums/tool.tsp";

/**
 * Represents a single installation suggestion for a tool.
 *
 * InstallationSuggestion is a value object that captures step-by-step
 * instructions for installing or fixing a tool installation, including
 * the package manager command, documentation reference, and optional notes.
 *
 * Note: This is a value object, NOT an entity. It does not extend
 * BaseEntity and has no independent lifecycle outside its parent.
 *
 * ## Properties
 *
 * | Property           | Type   | Required | Description                                    |
 * |--------------------|--------|----------|------------------------------------------------|
 * | packageManager     | string | Yes      | Package manager or installation method name    |
 * | command            | string | Yes      | Installation command to run                    |
 * | documentationUrl   | string | Yes      | URL to official installation documentation     |
 * | notes              | string | No       | Additional notes or platform-specific info     |
 *
 * @example
 * ```json
 * {
 *   "packageManager": "homebrew",
 *   "command": "brew install visual-studio-code",
 *   "documentationUrl": "https://code.visualstudio.com/docs/setup/mac",
 *   "notes": "Requires Xcode Command Line Tools on macOS"
 * }
 * ```
 */
@doc("Single installation suggestion for a tool")
model InstallationSuggestion {
  /**
   * Package manager or installation method name
   * @example "homebrew"
   */
  @doc("Package manager or installation method")
  packageManager: string;

  /**
   * Installation command to run
   * @example "brew install visual-studio-code"
   */
  @doc("Installation command")
  command: string;

  /**
   * URL to official installation documentation
   * @example "https://code.visualstudio.com/docs/setup/mac"
   */
  @doc("Official documentation URL")
  documentationUrl: string;

  /**
   * Optional additional notes or platform-specific information
   * @example "Requires Xcode Command Line Tools on macOS"
   */
  @doc("Additional notes for installation")
  notes?: string;
}

/**
 * Represents the current installation status of a tool.
 *
 * ToolInstallationStatus is a value object that captures the current state
 * of a tool's installation on the system, including whether it's available,
 * missing, or has an error, along with suggestions for resolution.
 *
 * Note: This is a value object, NOT an entity. It does not extend
 * BaseEntity and has no independent lifecycle outside its parent.
 *
 * ## Properties
 *
 * | Property      | Type                       | Required | Description                            |
 * |---------------|----------------------------|----------|----------------------------------------|
 * | status        | "available" \| "missing" \| "error" | Yes | Current installation status    |
 * | toolName      | string                     | Yes      | Name of the tool                       |
 * | errorMessage  | string                     | No       | Error message if status is "error"     |
 * | suggestions   | InstallationSuggestion[]   | No       | Installation suggestions               |
 *
 * @example
 * ```json
 * {
 *   "status": "missing",
 *   "toolName": "Visual Studio Code",
 *   "errorMessage": null,
 *   "suggestions": [
 *     {
 *       "packageManager": "homebrew",
 *       "command": "brew install visual-studio-code",
 *       "documentationUrl": "https://code.visualstudio.com/docs/setup/mac"
 *     }
 *   ]
 * }
 * ```
 */
@doc("Installation status and suggestions for a tool")
model ToolInstallationStatus {
  /**
   * Current installation status
   * @example "available"
   */
  @doc("Current installation status")
  status: "available" | "missing" | "error";

  /**
   * Name of the tool
   * @example "Visual Studio Code"
   */
  @doc("Tool name")
  toolName: string;

  /**
   * Error message if installation has an error
   * @example "Failed to execute install command"
   */
  @doc("Error message if status is error")
  errorMessage?: string;

  /**
   * Array of installation suggestions
   * @example [{"packageManager": "homebrew", "command": "brew install visual-studio-code", "documentationUrl": "https://code.visualstudio.com/docs/setup/mac"}]
   */
  @doc("Installation suggestions")
  suggestions?: InstallationSuggestion[];
}
