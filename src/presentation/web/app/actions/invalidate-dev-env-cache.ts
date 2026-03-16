'use server';

import { isAbsolute } from 'node:path';
import { resolve } from '@/lib/server-container';
import { createDeploymentLogger } from '@shepai/core/infrastructure/services/deployment/deployment-logger';
import type { IRepoCacheKeyResolver } from '@shepai/core/application/ports/output/services/repo-cache-key-resolver.interface';
import type { IDevEnvAnalysisRepository } from '@shepai/core/application/ports/output/repositories/dev-env-analysis-repository.interface';

const log = createDeploymentLogger('[invalidateDevEnvCache]');

export async function invalidateDevEnvCache(
  repositoryPath: string
): Promise<{ success: boolean; error?: string }> {
  log.info(`called — repositoryPath="${repositoryPath}"`);

  if (!repositoryPath || !isAbsolute(repositoryPath)) {
    log.warn('rejected — not an absolute path');
    return { success: false, error: 'repositoryPath must be an absolute path' };
  }

  try {
    const cacheKeyResolver = resolve<IRepoCacheKeyResolver>('IRepoCacheKeyResolver');
    const cacheKey = await cacheKeyResolver.resolve(repositoryPath);
    log.info(`resolved cacheKey="${cacheKey}"`);

    const repository = resolve<IDevEnvAnalysisRepository>('IDevEnvAnalysisRepository');
    await repository.deleteByCacheKey(cacheKey);
    log.info('cache entry deleted');

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to invalidate cache';
    log.error(`error: ${message}`, error);
    return { success: false, error: message };
  }
}
