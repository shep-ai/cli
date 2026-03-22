/**
 * Sync Repository Main Use Case
 *
 * Syncs a repository's local main branch with the remote.
 * Resolves the repository by ID, determines its path and default branch,
 * then delegates to IGitPrService.syncMain().
 */

import { injectable, inject } from 'tsyringe';
import type { IRepositoryRepository } from '../../ports/output/repositories/repository-repository.interface.js';
import type { IGitPrService } from '../../ports/output/services/git-pr-service.interface.js';

@injectable()
export class SyncRepositoryMainUseCase {
  constructor(
    @inject('IRepositoryRepository')
    private readonly repositoryRepo: IRepositoryRepository,
    @inject('IGitPrService')
    private readonly gitPrService: IGitPrService
  ) {}

  async execute(repoId: string): Promise<void> {
    const repository = await this.repositoryRepo.findById(repoId);
    if (!repository) {
      throw new Error(`Repository not found: "${repoId}"`);
    }

    const defaultBranch = await this.gitPrService.getDefaultBranch(repository.path);
    await this.gitPrService.syncMain(repository.path, defaultBranch);
  }
}
