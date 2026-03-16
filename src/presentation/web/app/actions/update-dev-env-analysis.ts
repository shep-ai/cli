'use server';

import { isAbsolute } from 'node:path';
import { resolve } from '@/lib/server-container';
import { createDeploymentLogger } from '@shepai/core/infrastructure/services/deployment/deployment-logger';
import type { IRepoCacheKeyResolver } from '@shepai/core/application/ports/output/services/repo-cache-key-resolver.interface';
import type { IDevEnvAnalysisRepository } from '@shepai/core/application/ports/output/repositories/dev-env-analysis-repository.interface';
import type { DevEnvironmentAnalysis } from '@shepai/core/domain/generated/output';
import { AnalysisSource } from '@shepai/core/domain/generated/output';

const log = createDeploymentLogger('[updateDevEnvAnalysis]');

export async function updateDevEnvAnalysis(
  repositoryPath: string,
  updates: Partial<
    Omit<DevEnvironmentAnalysis, 'id' | 'cacheKey' | 'source' | 'createdAt' | 'updatedAt'>
  >
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
    const existing = await repository.findByCacheKey(cacheKey);

    if (!existing) {
      log.warn('no cached analysis found to update');
      return { success: false, error: 'No cached analysis found for this repository' };
    }

    const updated: DevEnvironmentAnalysis = {
      ...existing,
      ...updates,
      source: AnalysisSource.Manual,
      updatedAt: new Date(),
    };

    await repository.update(updated);
    log.info('analysis updated with source=Manual');

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update analysis';
    log.error(`error: ${message}`, error);
    return { success: false, error: message };
  }
}
