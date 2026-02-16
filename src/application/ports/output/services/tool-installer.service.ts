/**
 * Tool Installer Service Interface
 *
 * Output port for tool installation operations.
 * Implementations check tool availability and execute installations.
 */

import type {
  ToolInstallationStatus,
  ToolInstallCommand,
} from '../../../../domain/generated/output.js';

/**
 * Service interface for tool installation management.
 */
export interface IToolInstallerService {
  /**
   * Check if a tool is available on the system (PATH check).
   *
   * @param toolName - Name of the tool to check
   * @returns ToolInstallationStatus with availability information
   */
  checkAvailability(toolName: string): Promise<ToolInstallationStatus>;

  /**
   * Get the install command metadata for a tool on the current platform.
   *
   * @param toolName - Name of the tool to get install command for
   * @returns ToolInstallCommand with installation details, or null if not available
   */
  getInstallCommand(toolName: string): ToolInstallCommand | null;

  /**
   * Execute installation of a tool with live output streaming.
   *
   * @param toolName - Name of the tool to install
   * @param onOutput - Optional callback for streaming installation output
   * @returns ToolInstallationStatus with result of installation
   */
  executeInstall(
    toolName: string,
    onOutput?: (data: string) => void
  ): Promise<ToolInstallationStatus>;
}
