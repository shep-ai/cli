/**
 * Poll Upstream PR Use Case
 *
 * Checks the status of an upstream PR for features in AwaitingUpstream state.
 * When the upstream PR is merged, transitions the feature to Maintain.
 * When closed without merge, updates the PR status but keeps AwaitingUpstream.
 */

import { injectable, inject } from 'tsyringe';
import { SdlcLifecycle, PrStatus } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IGitForkService } from '../../ports/output/services/git-fork-service.interface.js';

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
    private readonly featureRepo: IFeatureRepository,
    @inject('IGitForkService')
    private readonly forkService: IGitForkService
  ) {}

  async execute(input: PollUpstreamPrInput): Promise<PollUpstreamPrOutput> {
    const feature = await this.featureRepo.findById(input.featureId);
    if (!feature) {
      return { status: 'open', transitioned: false };
    }

    if (feature.lifecycle !== SdlcLifecycle.AwaitingUpstream) {
      return { status: 'open', transitioned: false };
    }

    const pr = feature.pr;
    if (!pr?.upstreamPrUrl || !pr?.upstreamPrNumber) {
      return { status: 'open', transitioned: false };
    }

    // Extract upstream repo from the PR URL
    // Format: https://github.com/owner/repo/pull/123
    const urlMatch = pr.upstreamPrUrl.match(/github\.com\/([^/]+\/[^/]+)\/pull/);
    if (!urlMatch) {
      return { status: 'open', transitioned: false };
    }
    const upstreamRepo = urlMatch[1];

    const prStatus = await this.forkService.getUpstreamPrStatus(upstreamRepo, pr.upstreamPrNumber);

    if (prStatus === PrStatus.Merged) {
      // Transition to Maintain
      await this.featureRepo.update({
        ...feature,
        lifecycle: SdlcLifecycle.Maintain,
        pr: {
          ...pr,
          upstreamPrStatus: PrStatus.Merged,
        },
        updatedAt: new Date(),
      });
      return { status: 'merged', transitioned: true };
    }

    if (prStatus === PrStatus.Closed) {
      // Keep AwaitingUpstream but update status
      await this.featureRepo.update({
        ...feature,
        pr: {
          ...pr,
          upstreamPrStatus: PrStatus.Closed,
        },
        updatedAt: new Date(),
      });
      return { status: 'closed', transitioned: false };
    }

    // Still open — no-op
    return { status: 'open', transitioned: false };
  }
}
