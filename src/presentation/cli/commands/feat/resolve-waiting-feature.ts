/**
 * Resolve Waiting Feature Helper
 *
 * Shared helper for feat review/approve/reject commands.
 * Given an optional feature ID and repo path, resolves the target
 * feature that is currently waiting for human approval.
 */

import type { Feature, AgentRun } from '@/domain/generated/output.js';
import { AgentRunStatus } from '@/domain/generated/output.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import { getCliI18n } from '../../i18n.js';

export interface ResolveWaitingFeatureOptions {
  featureId?: string;
  repoPath: string;
  featureRepo: IFeatureRepository;
  runRepo: IAgentRunRepository;
}

export interface ResolvedWaitingFeature {
  feature: Feature;
  run: AgentRun;
}

/**
 * Resolve the target feature waiting for approval.
 *
 * If featureId is provided, looks it up directly.
 * Otherwise, lists features for the repo and finds the single waiting one.
 *
 * @throws When feature not found, not waiting, or ambiguous (0 or 2+)
 */
export async function resolveWaitingFeature(
  options: ResolveWaitingFeatureOptions
): Promise<ResolvedWaitingFeature> {
  const { featureId, repoPath, featureRepo, runRepo } = options;

  if (featureId) {
    return resolveExplicit(featureId, featureRepo, runRepo);
  }
  return resolveAuto(repoPath, featureRepo, runRepo);
}

async function resolveExplicit(
  featureId: string,
  featureRepo: IFeatureRepository,
  runRepo: IAgentRunRepository
): Promise<ResolvedWaitingFeature> {
  const t = getCliI18n().t;
  const feature =
    (await featureRepo.findById(featureId)) ?? (await featureRepo.findByIdPrefix(featureId));
  if (!feature) {
    throw new Error(t('cli:commands.feat.resolveWaiting.featureNotFound', { id: featureId }));
  }

  if (!feature.agentRunId) {
    throw new Error(t('cli:commands.feat.resolveWaiting.noAgentRun', { name: feature.name }));
  }

  const run = await runRepo.findById(feature.agentRunId);
  if (!run || run.status !== AgentRunStatus.waitingApproval) {
    throw new Error(
      t('cli:commands.feat.resolveWaiting.notWaitingForApproval', {
        name: feature.name,
        status: run?.status ?? 'unknown',
      })
    );
  }

  return { feature, run };
}

async function resolveAuto(
  repoPath: string,
  featureRepo: IFeatureRepository,
  runRepo: IAgentRunRepository
): Promise<ResolvedWaitingFeature> {
  const features = await featureRepo.list({ repositoryPath: repoPath });

  const waiting: ResolvedWaitingFeature[] = [];

  for (const feature of features) {
    if (!feature.agentRunId) continue;
    const run = await runRepo.findById(feature.agentRunId);
    if (run && run.status === AgentRunStatus.waitingApproval) {
      waiting.push({ feature, run });
    }
  }

  if (waiting.length === 0) {
    const t = getCliI18n().t;
    throw new Error(t('cli:commands.feat.resolveWaiting.noFeaturesWaiting'));
  }

  if (waiting.length > 1) {
    const t = getCliI18n().t;
    const names = waiting.map((w) => `  - ${w.feature.name} (${w.feature.id.slice(0, 8)})`);
    throw new Error(
      `${t('cli:commands.feat.resolveWaiting.multipleFeaturesWaiting')}\n${names.join('\n')}`
    );
  }

  return waiting[0];
}
