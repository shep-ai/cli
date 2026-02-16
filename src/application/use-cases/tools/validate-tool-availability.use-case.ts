/**
 * ValidateToolAvailabilityUseCase
 *
 * Validates if a tool is available on the system by checking its presence in PATH.
 * Returns detailed status information including installation suggestions if missing.
 */

import { injectable, inject } from 'tsyringe';
import type { ToolInstallationStatus } from '../../../domain/generated/output.js';
import type { IToolInstallerService } from '../../ports/output/services/index.js';

@injectable()
export class ValidateToolAvailabilityUseCase {
  constructor(
    @inject('IToolInstallerService')
    private readonly toolInstallerService: IToolInstallerService
  ) {}

  /**
   * Validates if a tool is available on the system.
   *
   * @param toolName - Name of the tool to validate
   * @returns Status information about the tool's availability
   */
  async execute(toolName: string): Promise<ToolInstallationStatus> {
    return this.toolInstallerService.checkAvailability(toolName);
  }
}
