/**
 * Import GitHub Repository Use Case
 *
 * Orchestrates importing a GitHub repository: validates the URL, checks auth,
 * detects duplicates by remoteUrl, clones via IGitHubRepositoryService,
 * delegates local registration to AddRepositoryUseCase, and updates the
 * repository record with the normalized remoteUrl.
 */

import { injectable, inject } from 'tsyringe';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Repository } from '../../../domain/generated/output.js';
import type {
  IGitHubRepositoryService,
  CloneOptions,
} from '../../ports/output/services/github-repository-service.interface.js';
import type { IRepositoryRepository } from '../../ports/output/repositories/repository-repository.interface.js';
import { AddRepositoryUseCase } from './add-repository.use-case.js';

export interface ImportGitHubRepositoryInput {
  /** GitHub URL or shorthand (e.g. "owner/repo") */
  url: string;
  /** Override clone destination directory */
  dest?: string;
  /** Default base directory for clones (from settings) */
  defaultCloneDir?: string;
  /** Options for the clone subprocess (e.g. progress callback) */
  cloneOptions?: CloneOptions;
}

/**
 * Normalizes a GitHub remote URL for storage and duplicate detection.
 * Lowercases and strips trailing .git suffix.
 */
function normalizeRemoteUrl(nameWithOwner: string): string {
  return `https://github.com/${nameWithOwner.toLowerCase()}`;
}

@injectable()
export class ImportGitHubRepositoryUseCase {
  constructor(
    @inject('IGitHubRepositoryService')
    private readonly gitHubService: IGitHubRepositoryService,
    @inject('IRepositoryRepository')
    private readonly repositoryRepo: IRepositoryRepository,
    @inject(AddRepositoryUseCase)
    private readonly addRepositoryUseCase: AddRepositoryUseCase
  ) {}

  async execute(input: ImportGitHubRepositoryInput): Promise<Repository> {
    // 1. Validate URL — throws GitHubUrlParseError for invalid formats
    const parsed = this.gitHubService.parseGitHubUrl(input.url);

    // 2. Normalize the remote URL for storage and duplicate detection
    const normalizedUrl = normalizeRemoteUrl(parsed.nameWithOwner);

    // 3. Check for duplicate by remoteUrl — skip clone if already tracked
    const existing = await this.repositoryRepo.findByRemoteUrl(normalizedUrl);
    if (existing) {
      return existing;
    }

    // 4. Check auth — throws GitHubAuthError if not authenticated
    await this.gitHubService.checkAuth();

    // 5. Resolve clone destination
    const destination = this.resolveDestination(input, parsed.repo);

    // 6. Clone the repository
    await this.gitHubService.cloneRepository(parsed.nameWithOwner, destination, input.cloneOptions);

    // 7. Register the cloned repo via AddRepositoryUseCase
    const repository = await this.addRepositoryUseCase.execute({
      path: destination,
      name: parsed.repo,
    });

    // 8. Update with normalized remoteUrl
    await this.repositoryRepo.update(repository.id, {
      remoteUrl: normalizedUrl,
    });

    return { ...repository, remoteUrl: normalizedUrl };
  }

  private resolveDestination(input: ImportGitHubRepositoryInput, repoName: string): string {
    if (input.dest) {
      return input.dest;
    }

    let baseDir = input.defaultCloneDir ?? join(homedir(), 'repos');
    if (baseDir.startsWith('~/')) {
      baseDir = join(homedir(), baseDir.slice(2));
    }
    return join(baseDir, repoName);
  }
}
