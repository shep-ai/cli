'use server';

import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { resolve } from '@/lib/server-container';
import { createDeploymentLogger } from '@shepai/core/infrastructure/services/deployment/deployment-logger';
import type { IDeploymentService } from '@shepai/core/application/ports/output/services/deployment-service.interface';
import type { IRepoCacheKeyResolver } from '@shepai/core/application/ports/output/services/repo-cache-key-resolver.interface';
import type { IDevEnvAnalysisRepository } from '@shepai/core/application/ports/output/repositories/dev-env-analysis-repository.interface';
import { DeploymentState } from '@shepai/core/domain/generated/output';

const log = createDeploymentLogger('[deployRepository]');

export async function deployRepository(
  repositoryPath: string
): Promise<{ success: boolean; error?: string; state?: DeploymentState }> {
  log.info(`called — repositoryPath="${repositoryPath}"`);

  if (!repositoryPath || !isAbsolute(repositoryPath)) {
    log.warn('rejected — not an absolute path');
    return { success: false, error: 'repositoryPath must be an absolute path' };
  }

  try {
    if (!existsSync(repositoryPath)) {
      log.warn(`directory does not exist: "${repositoryPath}"`);
      return { success: false, error: `Directory does not exist: ${repositoryPath}` };
    }

    const deploymentService = resolve<IDeploymentService>('IDeploymentService');

    // Try to use cached analysis for startWithAnalysis
    try {
      const cacheKeyResolver = resolve<IRepoCacheKeyResolver>('IRepoCacheKeyResolver');
      const cacheKey = await cacheKeyResolver.resolve(repositoryPath);
      const analysisRepo = resolve<IDevEnvAnalysisRepository>('IDevEnvAnalysisRepository');
      const cached = await analysisRepo.findByCacheKey(cacheKey);

      if (cached) {
        if (!cached.canStart) {
          log.info(`cached analysis says not startable: ${cached.reason}`);
          return { success: true, state: DeploymentState.NotStartable };
        }
        log.info('using cached analysis for deployment');
        deploymentService.startWithAnalysis(repositoryPath, repositoryPath, cached);
        log.info('startWithAnalysis() returned successfully — state=Booting');
        return { success: true, state: DeploymentState.Booting };
      }
    } catch (cacheError) {
      log.warn('cache lookup failed, falling back to direct start', cacheError);
    }

    // Fallback: no cached analysis, use existing direct start
    log.info('no cached analysis, calling deploymentService.start()');
    deploymentService.start(repositoryPath, repositoryPath);

    log.info('start() returned successfully — state=Booting');
    return { success: true, state: DeploymentState.Booting };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deploy repository';
    log.error(`error: ${message}`, error);
    return { success: false, error: message };
  }
}
