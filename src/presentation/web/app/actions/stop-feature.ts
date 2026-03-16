'use server';

import { resolve } from '@/lib/server-container';
import type { StopAgentRunUseCase } from '@shepai/core/application/use-cases/agents/stop-agent-run.use-case';
import type { IAgentRunRepository } from '@shepai/core/application/ports/output/agents/agent-run-repository.interface';

export async function stopFeature(
  featureId: string
): Promise<{ stopped: boolean; error?: string }> {
  if (!featureId.trim()) {
    return { stopped: false, error: 'Feature id is required' };
  }

  try {
    // Find the active agent run for this feature
    const runRepo = resolve<IAgentRunRepository>('IAgentRunRepository');
    const allRuns = await runRepo.list();
    const activeRun = allRuns.find(
      (r) =>
        r.featureId === featureId &&
        r.status !== 'completed' &&
        r.status !== 'failed' &&
        r.status !== 'interrupted' &&
        r.status !== 'cancelled'
    );

    if (!activeRun) {
      return { stopped: false, error: 'No active agent run found for this feature' };
    }

    const useCase = resolve<StopAgentRunUseCase>('StopAgentRunUseCase');
    const result = await useCase.execute(activeRun.id);

    if (!result.stopped) {
      return { stopped: false, error: result.reason };
    }
    return { stopped: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to stop agent';
    return { stopped: false, error: message };
  }
}
