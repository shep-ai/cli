/**
 * Poll Upstream PR Use Case
 *
 * Checks the status of an upstream PR (fork-and-PR flow) and transitions
 * the feature to Maintain when the PR is merged.
 *
 * Business Rules:
 * - Only operates on features in the AwaitingUpstream lifecycle
 * - Requires upstream PR data (upstreamPrUrl + upstreamPrNumber) on feature.pr
 * - If merged: transitions lifecycle to Maintain, sets upstreamPrStatus to Merged
 * - If closed: keeps lifecycle as AwaitingUpstream, sets upstreamPrStatus to Closed
 * - If open: no-op, no update persisted
 */

import { injectable, inject } from 'tsyringe';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IGitForkService } from '../../ports/output/services/git-fork-service.interface.js';
import { SdlcLifecycle, PrStatus } from '../../../domain/generated/output.js';

export interface PollUpstreamPrInput {
  featureId: string;
}

export interface PollUpstreamPrOutput {
  status: 'open' | 'merged' | 'closed';
  transitioned: boolean;
}

@injectable()
export class PollUpstreamPrUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepo: Pick<IFeatureRepository, 'findById' | 'update'>,
    @inject('IGitForkService')
    private readonly forkService: Pick<IGitForkService, 'getUpstreamPrStatus'>
  ) {}

  async execute(input: PollUpstreamPrInput): Promise<PollUpstreamPrOutput> {
    const feature = await this.featureRepo.findById(input.featureId);

    // Guard: feature must be in AwaitingUpstream lifecycle
    if (!feature || feature.lifecycle !== SdlcLifecycle.AwaitingUpstream) {
      return { status: 'open', transitioned: false };
    }

    // Guard: feature must have upstream PR data
    if (!feature.pr?.upstreamPrUrl || feature.pr.upstreamPrNumber == null) {
      return { status: 'open', transitioned: false };
    }

    // Parse owner/repo from upstream PR URL
    // Expected format: https://github.com/{owner}/{repo}/pull/{number}
    const upstreamRepo = parseUpstreamRepo(feature.pr.upstreamPrUrl);
    if (!upstreamRepo) {
      return { status: 'open', transitioned: false };
    }

    const prStatus = await this.forkService.getUpstreamPrStatus(
      upstreamRepo,
      feature.pr.upstreamPrNumber
    );

    if (prStatus.state === 'open') {
      return { status: 'open', transitioned: false };
    }

    if (prStatus.state === 'merged') {
      const updated = {
        ...feature,
        lifecycle: SdlcLifecycle.Maintain,
        pr: {
          ...feature.pr,
          upstreamPrStatus: PrStatus.Merged,
        },
        updatedAt: new Date(),
      };
      await this.featureRepo.update(updated);
      return { status: 'merged', transitioned: true };
    }

    // state === 'closed'
    const updated = {
      ...feature,
      pr: {
        ...feature.pr,
        upstreamPrStatus: PrStatus.Closed,
      },
      updatedAt: new Date(),
    };
    await this.featureRepo.update(updated);
    return { status: 'closed', transitioned: false };
  }
}

/**
 * Parses the upstream owner/repo string from a GitHub PR URL.
 * E.g. "https://github.com/owner/repo/pull/7" → "owner/repo"
 */
function parseUpstreamRepo(upstreamPrUrl: string): string | null {
  try {
    const url = new URL(upstreamPrUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    // parts: ['owner', 'repo', 'pull', '7']
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}
