/**
 * StartCodeServerUseCase
 *
 * Orchestrates starting a code-server instance for a feature worktree:
 * validates the feature exists, checks code-server is installed,
 * computes the worktree path, and delegates to ICodeServerManagerService
 * for process spawning. Idle timeout is managed by the service layer
 * (reads from settings DB directly).
 */

import { injectable, inject } from 'tsyringe';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IToolInstallerService } from '../../ports/output/services/tool-installer.service.js';
import type { ICodeServerManagerService } from '../../ports/output/services/code-server-manager-service.interface.js';
import { computeWorktreePath } from '../../../infrastructure/services/ide-launchers/compute-worktree-path.js';

export interface StartCodeServerInput {
  featureId: string;
  repositoryPath: string;
  branch: string;
}

export interface StartCodeServerResult {
  url: string;
  port: number;
}

@injectable()
export class StartCodeServerUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepository: IFeatureRepository,
    @inject('IToolInstallerService')
    private readonly toolInstallerService: IToolInstallerService,
    @inject('ICodeServerManagerService')
    private readonly codeServerManager: ICodeServerManagerService
  ) {}

  async execute(input: StartCodeServerInput): Promise<StartCodeServerResult> {
    const { featureId, repositoryPath, branch } = input;

    // Validate feature exists
    const feature = await this.featureRepository.findById(featureId);
    if (!feature) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    // Check code-server is installed
    const availability = await this.toolInstallerService.checkAvailability('code-server');
    if (availability.status !== 'available') {
      throw new Error(
        'code-server is not installed. Install it from the Tools page or run: brew install code-server'
      );
    }

    // Compute worktree path
    const worktreePath = computeWorktreePath(repositoryPath, branch);

    // Delegate to manager service
    const result = await this.codeServerManager.start(featureId, worktreePath);

    return {
      url: result.url,
      port: result.port,
    };
  }
}
