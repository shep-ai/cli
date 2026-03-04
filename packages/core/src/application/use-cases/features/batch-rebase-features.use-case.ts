/**
 * Batch Rebase Features Use Case
 *
 * Orchestrates batch-updating feature branches with the latest remote default branch.
 * Iterates over all (or filtered) features, performs merge or rebase on each,
 * and returns per-feature status results.
 *
 * Business Rules:
 * - Fetches origin once before processing
 * - Requires at least one configured remote
 * - Skips features with dirty worktrees or missing branches
 * - On conflict, aborts the operation and continues to next feature
 * - Creates temporary worktrees for features without permanent ones
 * - Does not push to remote (local-only operations)
 */

import { injectable, inject } from 'tsyringe';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Feature } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IGitPrService } from '../../ports/output/services/git-pr-service.interface.js';
import {
  GitPrError,
  GitPrErrorCode,
} from '../../ports/output/services/git-pr-service.interface.js';
import type { IWorktreeService } from '../../ports/output/services/worktree-service.interface.js';
import type { SdlcLifecycle } from '../../../domain/generated/output.js';

export interface BatchRebaseOptions {
  repositoryPath: string;
  strategy: 'merge' | 'rebase';
  lifecycle?: SdlcLifecycle;
  featureIds?: string[];
  onProgress?: (info: { index: number; total: number; name: string }) => void;
}

export interface BatchRebaseResult {
  featureId: string;
  featureName: string;
  branch: string;
  status: 'success' | 'skipped' | 'failed';
  reason?: string;
}

interface PendingFeature {
  featureId: string;
  featureName: string;
  branch: string;
  worktreePath?: string;
  status: 'pending';
}

type ResolvedFeatureEntry = BatchRebaseResult | PendingFeature;

@injectable()
export class BatchRebaseFeaturesUseCase {
  constructor(
    @inject('IFeatureRepository') private readonly featureRepo: IFeatureRepository,
    @inject('IGitPrService') private readonly gitPrService: IGitPrService,
    @inject('IWorktreeService') private readonly worktreeService: IWorktreeService
  ) {}

  async execute(options: BatchRebaseOptions): Promise<BatchRebaseResult[]> {
    const { repositoryPath, strategy, onProgress } = options;

    // Pre-check: repo must have a remote
    const hasRemote = await this.gitPrService.hasRemote(repositoryPath);
    if (!hasRemote) {
      throw new Error('No remote configured. Cannot fetch and update branches.');
    }

    // Fetch latest remote refs once
    await this.gitPrService.fetchOrigin(repositoryPath);

    // Detect default branch
    const defaultBranch = await this.gitPrService.getDefaultBranch(repositoryPath);
    const mergeSource = `origin/${defaultBranch}`;

    // Discover features
    const features = await this.resolveFeatures(options);

    // Process each feature
    const results: BatchRebaseResult[] = [];

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];

      onProgress?.({ index: i, total: features.length, name: feature.featureName });

      if (feature.status !== 'pending') {
        // Already resolved (e.g., skipped due to featureId not found)
        results.push(feature);
        continue;
      }

      const result = await this.processFeature(
        feature.featureId,
        feature.featureName,
        feature.branch,
        feature.worktreePath,
        repositoryPath,
        mergeSource,
        strategy
      );
      results.push(result);
    }

    return results;
  }

  private async resolveFeatures(options: BatchRebaseOptions): Promise<ResolvedFeatureEntry[]> {
    const { repositoryPath, featureIds, lifecycle } = options;

    if (featureIds && featureIds.length > 0) {
      const resolved: ResolvedFeatureEntry[] = [];
      for (const id of featureIds) {
        const feature = await this.featureRepo.findByIdPrefix(id);
        if (!feature) {
          resolved.push({
            featureId: id,
            featureName: id,
            branch: '',
            status: 'skipped',
            reason: 'feature not found',
          });
        } else {
          resolved.push({
            featureId: feature.id,
            featureName: feature.name,
            branch: feature.branch,
            worktreePath: feature.worktreePath,
            status: 'pending',
          });
        }
      }
      return resolved;
    }

    // List features with filters
    const features = await this.featureRepo.list({
      repositoryPath,
      ...(lifecycle ? { lifecycle } : {}),
    });

    return features.map(
      (f: Feature): PendingFeature => ({
        featureId: f.id,
        featureName: f.name,
        branch: f.branch,
        worktreePath: f.worktreePath,
        status: 'pending',
      })
    );
  }

  private async processFeature(
    featureId: string,
    featureName: string,
    branch: string,
    worktreePath: string | undefined,
    repositoryPath: string,
    mergeSource: string,
    strategy: 'merge' | 'rebase'
  ): Promise<BatchRebaseResult> {
    // Resolve working directory
    let cwd: string;
    let tempWorktreeCreated = false;
    let tempWorktreePath: string | undefined;

    try {
      // Check branch existence
      const branchFound = await this.worktreeService.branchExists(repositoryPath, branch);
      if (!branchFound) {
        return { featureId, featureName, branch, status: 'skipped', reason: 'branch not found' };
      }

      // Resolve working directory
      if (worktreePath) {
        cwd = worktreePath;
      } else {
        // Check if a worktree already exists for this branch
        const worktreeExists = await this.worktreeService.exists(repositoryPath, branch);
        if (worktreeExists) {
          cwd = this.worktreeService.getWorktreePath(repositoryPath, branch);
        } else {
          // Create a temporary worktree
          tempWorktreePath = path.join(os.tmpdir(), `shep-rebase-${branch.replace(/\//g, '-')}`);
          const info = await this.worktreeService.create(repositoryPath, branch, tempWorktreePath);
          cwd = info.path;
          tempWorktreeCreated = true;
        }
      }

      // Check for uncommitted changes
      const isDirty = await this.gitPrService.hasUncommittedChanges(cwd);
      if (isDirty) {
        return { featureId, featureName, branch, status: 'skipped', reason: 'uncommitted changes' };
      }

      // Perform merge or rebase
      if (strategy === 'rebase') {
        await this.gitPrService.rebaseBranch(cwd, mergeSource);
      } else {
        await this.gitPrService.mergeLocalBranch(cwd, mergeSource);
      }

      return { featureId, featureName, branch, status: 'success' };
    } catch (error) {
      // Handle merge/rebase conflicts
      if (error instanceof GitPrError && error.code === GitPrErrorCode.MERGE_CONFLICT) {
        const reason = strategy === 'rebase' ? 'rebase conflicts' : 'merge conflicts';
        try {
          if (strategy === 'rebase') {
            await this.gitPrService.rebaseAbort(cwd!);
          } else {
            await this.gitPrService.mergeAbort(cwd!);
          }
        } catch {
          // Abort itself failed — nothing more we can do
        }
        return { featureId, featureName, branch, status: 'failed', reason };
      }

      // Unexpected error
      const reason = error instanceof Error ? error.message : String(error);
      return { featureId, featureName, branch, status: 'failed', reason };
    } finally {
      // Clean up temporary worktree
      if (tempWorktreeCreated && tempWorktreePath) {
        try {
          await this.worktreeService.remove(tempWorktreePath);
        } catch {
          // Cleanup failure is non-fatal
        }
      }
    }
  }
}
