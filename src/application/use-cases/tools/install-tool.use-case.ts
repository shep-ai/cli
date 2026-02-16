/**
 * InstallToolUseCase
 *
 * Executes the installation of a tool with live output streaming support.
 * Returns detailed status information about the installation result.
 */

import { injectable, inject } from 'tsyringe';
import type { ToolInstallationStatus } from '../../../domain/generated/output.js';
import type { IToolInstallerService } from '../../ports/output/services/index.js';

@injectable()
export class InstallToolUseCase {
  constructor(
    @inject('IToolInstallerService')
    private readonly toolInstallerService: IToolInstallerService
  ) {}

  /**
   * Executes installation of a tool with optional output streaming.
   *
   * @param toolName - Name of the tool to install
   * @param onOutput - Optional callback for streaming installation output
   * @returns Status information about the installation result
   */
  async execute(
    toolName: string,
    onOutput?: (data: string) => void
  ): Promise<ToolInstallationStatus> {
    return this.toolInstallerService.executeInstall(toolName, onOutput);
  }
}
