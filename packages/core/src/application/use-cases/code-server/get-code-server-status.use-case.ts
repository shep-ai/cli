/**
 * GetCodeServerStatusUseCase
 *
 * Queries the current status of a code-server instance for a given feature ID.
 * Delegates to ICodeServerManagerService.getStatus() which handles PID liveness
 * checks and auto-reconciliation of stale state.
 */

import { injectable, inject } from 'tsyringe';
import type { ICodeServerManagerService } from '../../ports/output/services/code-server-manager-service.interface.js';
import { CodeServerInstanceStatus } from '../../../domain/generated/output.js';

export interface GetCodeServerStatusInput {
  featureId: string;
}

export interface CodeServerStatusResult {
  status: 'running' | 'stopped';
  url?: string;
  port?: number;
}

@injectable()
export class GetCodeServerStatusUseCase {
  constructor(
    @inject('ICodeServerManagerService')
    private readonly codeServerManager: ICodeServerManagerService
  ) {}

  async execute(input: GetCodeServerStatusInput): Promise<CodeServerStatusResult | null> {
    const instance = await this.codeServerManager.getStatus(input.featureId);

    if (!instance) {
      return null;
    }

    if (instance.status === CodeServerInstanceStatus.Running) {
      return {
        status: 'running',
        url: `http://127.0.0.1:${instance.port}`,
        port: instance.port,
      };
    }

    return {
      status: 'stopped',
    };
  }
}
