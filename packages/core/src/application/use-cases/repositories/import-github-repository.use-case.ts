/**
 * Import GitHub Repository Use Case
 *
 * Orchestrates importing a GitHub repository: validates the URL, checks auth,
 * detects duplicates by remoteUrl, clones via IGitHubRepositoryService,
 * delegates local registration to AddRepositoryUseCase, and updates the
 * repository record with the normalized remoteUrl.
 *
 * When the user lacks push access to the target repo, automatically forks it,
 * clones the fork, and sets the original as upstream.
 */

import { injectable, inject } from 'tsyringe';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Repository } from '../../../domain/generated/output.js';
import type {
  IGitHubRepositoryService,
  CloneOptions,
  ForkOptions,
} from '../../ports/output/services/github-repository-service.interface.js';
import type { IRepositoryRepository } from '../../ports/output/repositories/repository-repository.interface.js';
import { AddRepositoryUseCase } from './add-repository.use-case.js';

/** Minimal exec function type for running git commands. */
type ExecFn = (cmd: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

export interface ImportGitHubRepositoryInput {
  /** GitHub URL or shorthand (e.g. "owner/repo") */
  url: string;
  /** Override clone destination directory */
  dest?: string;
  /** Default base directory for clones (from settings) */
  defaultCloneDir?: string;
  /** Options for the clone subprocess (e.g. progress callback) */
  cloneOptions?: CloneOptions;
  /** Options for the fork subprocess (e.g. progress callback) */
  forkOptions?: ForkOptions;
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
    private readonly addRepositoryUseCase: AddRepositoryUseCase,
    @inject('ExecFunction')
    private readonly execFile: ExecFn
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

    // 3b. Check if we already have a fork of this repo (by upstream URL)
    const existingFork = await this.repositoryRepo.findByUpstreamUrl(normalizedUrl);
    if (existingFork) {
      return existingFork;
    }

    // 4. Check auth — throws GitHubAuthError if not authenticated
    await this.gitHubService.checkAuth();

    // 5. Check push access to determine if we need to fork
    const { hasPushAccess } = await this.gitHubService.checkPushAccess(parsed.nameWithOwner);

    if (hasPushAccess) {
      // Direct clone path — user has push access
      return this.cloneAndRegister(parsed.nameWithOwner, parsed.repo, normalizedUrl, input);
    }

    // 6. Auto-fork path — user lacks push access
    return this.forkCloneAndRegister(parsed.nameWithOwner, parsed.repo, normalizedUrl, input);
  }

  /**
   * Direct clone path: clone the original repo and register it.
   */
  private async cloneAndRegister(
    nameWithOwner: string,
    repoName: string,
    normalizedUrl: string,
    input: ImportGitHubRepositoryInput
  ): Promise<Repository> {
    const destination = this.resolveDestination(input, repoName);

    await this.gitHubService.cloneRepository(nameWithOwner, destination, input.cloneOptions);

    const repository = await this.addRepositoryUseCase.execute({
      path: destination,
      name: repoName,
    });

    await this.repositoryRepo.update(repository.id, {
      remoteUrl: normalizedUrl,
    });

    return { ...repository, remoteUrl: normalizedUrl };
  }

  /**
   * Fork + clone path: fork the repo, clone the fork, set upstream remote.
   */
  private async forkCloneAndRegister(
    originalNameWithOwner: string,
    repoName: string,
    normalizedOriginalUrl: string,
    input: ImportGitHubRepositoryInput
  ): Promise<Repository> {
    // Fork the repository (gh repo fork handles "already exists" gracefully)
    const forkResult = await this.gitHubService.forkRepository(
      originalNameWithOwner,
      input.forkOptions
    );

    const destination = this.resolveDestination(input, repoName);
    const normalizedForkUrl = normalizeRemoteUrl(forkResult.nameWithOwner);

    // Check if fork was already imported
    const existingFork = await this.repositoryRepo.findByRemoteUrl(normalizedForkUrl);
    if (existingFork) {
      return existingFork;
    }

    // Clone the fork
    await this.gitHubService.cloneRepository(
      forkResult.nameWithOwner,
      destination,
      input.cloneOptions
    );

    // Set upstream remote pointing to the original repo
    await this.execFile('git', [
      '-C',
      destination,
      'remote',
      'add',
      'upstream',
      `https://github.com/${originalNameWithOwner}`,
    ]);

    // Register the cloned fork
    const repository = await this.addRepositoryUseCase.execute({
      path: destination,
      name: repoName,
    });

    // Update with fork metadata
    await this.repositoryRepo.update(repository.id, {
      remoteUrl: normalizedForkUrl,
      isFork: true,
      upstreamUrl: normalizedOriginalUrl,
    });

    return {
      ...repository,
      remoteUrl: normalizedForkUrl,
      isFork: true,
      upstreamUrl: normalizedOriginalUrl,
    };
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
