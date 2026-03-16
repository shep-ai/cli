'use server';

import { isAbsolute } from 'node:path';
import { resolve } from '@/lib/server-container';
import { createDeploymentLogger } from '@shepai/core/infrastructure/services/deployment/deployment-logger';
import type { IRepoCacheKeyResolver } from '@shepai/core/application/ports/output/services/repo-cache-key-resolver.interface';
import type { IDevEnvAnalysisRepository } from '@shepai/core/application/ports/output/repositories/dev-env-analysis-repository.interface';
import type {
  IDevEnvironmentAnalyzer,
  AnalysisMode,
} from '@shepai/core/application/ports/output/services/dev-environment-analyzer.interface';
import type { DevEnvironmentAnalysis } from '@shepai/core/domain/generated/output';

const log = createDeploymentLogger('[analyzeRepository]');

export async function analyzeRepository(
  repositoryPath: string,
  mode?: AnalysisMode
): Promise<
  { success: true; analysis: DevEnvironmentAnalysis } | { success: false; error: string }
> {
  log.info(`called — repositoryPath="${repositoryPath}", mode=${mode ?? 'auto'}`);

  if (!repositoryPath || !isAbsolute(repositoryPath)) {
    log.warn('rejected — not an absolute path');
    return { success: false, error: 'repositoryPath must be an absolute path' };
  }

  try {
    const cacheKeyResolver = resolve<IRepoCacheKeyResolver>('IRepoCacheKeyResolver');
    const cacheKey = await cacheKeyResolver.resolve(repositoryPath);
    log.info(`resolved cacheKey="${cacheKey}"`);

    const repository = resolve<IDevEnvAnalysisRepository>('IDevEnvAnalysisRepository');
    const cached = await repository.findByCacheKey(cacheKey);

    if (cached) {
      log.info('cache hit — returning cached analysis');
      return { success: true, analysis: cached };
    }

    log.info('cache miss — running analysis');
    const analyzer = resolve<IDevEnvironmentAnalyzer>('IDevEnvironmentAnalyzer');

    const resolvedMode = mode ?? analyzer.autoDetectMode(repositoryPath);
    log.info(`analysis mode: ${resolvedMode}`);

    const analysis = await analyzer.analyze(repositoryPath, resolvedMode);
    analysis.cacheKey = cacheKey;

    await repository.save(analysis);
    log.info('analysis saved to cache');

    return { success: true, analysis };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to analyze repository';
    log.error(`error: ${message}`, error);
    return { success: false, error: message };
  }
}
