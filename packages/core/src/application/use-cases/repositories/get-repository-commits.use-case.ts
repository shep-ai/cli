/**
 * Get Repository Commits Use Case
 *
 * Returns the commit history for a branch in a repository.
 * Automatically detects the current branch and default branch.
 */

import { injectable, inject } from 'tsyringe';
import type {
  IGitPrService,
  CommitInfo,
} from '../../ports/output/services/git-pr-service.interface.js';

export interface RepositoryCommitsResult {
  commits: CommitInfo[];
  currentBranch: string;
  defaultBranch: string;
}

@injectable()
export class GetRepositoryCommitsUseCase {
  constructor(
    @inject('IGitPrService')
    private readonly gitPrService: IGitPrService
  ) {}

  async execute(
    repositoryPath: string,
    branch?: string,
    limit = 50
  ): Promise<RepositoryCommitsResult> {
    const [currentBranch, defaultBranch] = await Promise.all([
      this.gitPrService.getCurrentBranch(repositoryPath),
      this.gitPrService.getDefaultBranch(repositoryPath).catch(() => 'main'),
    ]);

    const targetBranch = branch ?? currentBranch;
    const commits = await this.gitPrService.getCommitHistory(repositoryPath, targetBranch, limit);

    return { commits, currentBranch, defaultBranch };
  }
}
