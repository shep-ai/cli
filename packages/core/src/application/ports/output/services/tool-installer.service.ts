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

export interface AvailableTerminalEntry {
  id: string;
  name: string;
  available: boolean;
}

export interface TerminalOpenConfig {
  /** Platform-resolved openDirectory command string, still containing {dir} placeholder */
  openDirectory: string;
  /** Whether to spawn with shell: true */
  shell: boolean;
}

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

  /**
   * List all terminal emulators supported on the current platform with availability status.
   * Uses tool metadata loaded in the Node.js context (not bundled by Next.js),
   * so this must be called via the DI container from server actions.
   *
   * @returns Array of terminal entries with id, name, and availability
   */
  listAvailableTerminals(): Promise<AvailableTerminalEntry[]>;

  /**
   * Get the open-directory configuration for a terminal by its tool ID.
   * Returns the platform-resolved openDirectory command and shell preference.
   * Safe to call from Next.js server actions via DI (no import.meta.url dependency).
   *
   * @param terminalId - Tool ID (e.g. 'warp', 'iterm2', 'system-terminal')
   * @returns Config with openDirectory command and shell flag, or null if not found
   */
  getTerminalOpenConfig(terminalId: string): TerminalOpenConfig | null;
}
