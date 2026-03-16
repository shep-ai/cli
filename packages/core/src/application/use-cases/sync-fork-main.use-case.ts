/**
 * Sync Fork Main Use Case
 *
 * Syncs the local main branch with upstream/main for fork repositories.
 * For non-fork repos, returns a no-op result with an informational reason.
 */

import { injectable, inject } from 'tsyringe';
import type { IGitPrService } from '../ports/output/services/git-pr-service.interface.js';

export interface SyncForkMainResult {
  synced: boolean;
  reason?: string;
  upstreamUrl?: string;
}

@injectable()
export class SyncForkMainUseCase {
  constructor(
    @inject('IGitPrService')
    private readonly gitPrService: IGitPrService
  ) {}

  async execute(cwd: string): Promise<SyncForkMainResult> {
    const { isFork, upstreamUrl } = await this.gitPrService.isFork(cwd);

    if (!isFork) {
      return { synced: false, reason: 'not-a-fork' };
    }

    await this.gitPrService.ensureUpstreamRemote(cwd, upstreamUrl!);
    await this.gitPrService.syncForkMain(cwd);

    return { synced: true, upstreamUrl };
  }
}
