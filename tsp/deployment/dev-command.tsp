/**
 * @module Shep.Deployment.DevCommand
 *
 * Defines the DevCommand value object for dev environment analysis results.
 *
 * DevCommand represents a single shell command that should be executed to
 * start a development environment. Multiple DevCommands form an ordered list
 * within a DevEnvironmentAnalysis, where the first command is the primary
 * command to execute.
 *
 * ## Usage
 *
 * Import this module to use DevCommand in analysis results:
 *
 * ```typespec
 * import "./dev-command.tsp";
 *
 * model DevEnvironmentAnalysis {
 *   commands: DevCommand[];
 * }
 * ```
 *
 * ## Design Notes
 *
 * DevCommand is a value object, NOT an entity. It does not extend BaseEntity
 * and has no independent identity. It is embedded within DevEnvironmentAnalysis
 * entities.
 */
/**
 * A shell command for starting a dev environment.
 *
 * DevCommand captures a single executable command along with a human-readable
 * description and an optional working directory for monorepo support. The first
 * command in an ordered list is the primary command that gets executed by
 * DeploymentService.
 *
 * Note: This is a value object, NOT an entity. It does not extend
 * BaseEntity and is embedded within DevEnvironmentAnalysis.
 *
 * @example
 * ```json
 * {
 *   "command": "npm run dev",
 *   "description": "Start Next.js development server",
 *   "workingDirectory": "packages/web"
 * }
 * ```
 *
 * @example
 * ```json
 * {
 *   "command": "python manage.py runserver",
 *   "description": "Start Django development server"
 * }
 * ```
 */
@doc("A shell command for starting a dev environment")
model DevCommand {
  @doc("The shell command to execute (e.g., 'npm run dev', 'python manage.py runserver')")
  command: string;

  @doc("Human-readable description of what this command does")
  description: string;

  @doc("Working directory relative to repo root for monorepo support (e.g., 'packages/web')")
  workingDirectory?: string;
}
