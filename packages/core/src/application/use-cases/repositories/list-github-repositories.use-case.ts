/**
 * List GitHub Repositories Use Case
 *
 * Checks GitHub CLI auth, then fetches the authenticated user's repositories.
 * Decouples presentation from the IGitHubRepositoryService infrastructure.
 */

import { injectable, inject } from 'tsyringe';
import type {
  IGitHubRepositoryService,
  GitHubRepo,
  ListUserRepositoriesOptions,
} from '../../ports/output/services/github-repository-service.interface.js';

@injectable()
export class ListGitHubRepositoriesUseCase {
  constructor(
    @inject('IGitHubRepositoryService')
    private readonly gitHubService: IGitHubRepositoryService
  ) {}

  async execute(options?: ListUserRepositoriesOptions): Promise<GitHubRepo[]> {
    await this.gitHubService.checkAuth();
    return this.gitHubService.listUserRepositories(options);
  }
}
