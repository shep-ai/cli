/**
 * List GitHub Organizations Use Case
 *
 * Checks GitHub CLI auth, then fetches the organizations the authenticated user belongs to.
 * Decouples presentation from the IGitHubRepositoryService infrastructure.
 */

import { injectable, inject } from 'tsyringe';
import type {
  IGitHubRepositoryService,
  GitHubOrganization,
} from '../../ports/output/services/github-repository-service.interface.js';

@injectable()
export class ListGitHubOrganizationsUseCase {
  constructor(
    @inject('IGitHubRepositoryService')
    private readonly gitHubService: IGitHubRepositoryService
  ) {}

  async execute(): Promise<GitHubOrganization[]> {
    await this.gitHubService.checkAuth();
    return this.gitHubService.listOrganizations();
  }
}
