/**
 * StopCodeServerUseCase
 *
 * Stops a running code-server instance for a given feature ID by delegating
 * to ICodeServerManagerService. The manager handles SIGTERM/SIGKILL shutdown
 * and SQLite state updates.
 */

import { injectable, inject } from 'tsyringe';
import type { ICodeServerManagerService } from '../../ports/output/services/code-server-manager-service.interface.js';

export interface StopCodeServerInput {
  featureId: string;
}

@injectable()
export class StopCodeServerUseCase {
  constructor(
    @inject('ICodeServerManagerService')
    private readonly codeServerManager: ICodeServerManagerService
  ) {}

  async execute(input: StopCodeServerInput): Promise<void> {
    await this.codeServerManager.stop(input.featureId);
  }
}
