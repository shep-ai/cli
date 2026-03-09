'use server';

import { resolve } from '@/lib/server-container';
import type { IPhaseTimingRepository } from '@shepai/core/application/ports/output/agents/phase-timing-repository.interface';

export interface PhaseTimingData {
  agentRunId: string;
  phase: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  waitingApprovalAt?: string;
  approvalWaitMs?: number;
}

type GetPhaseTimingsResult = { timings: PhaseTimingData[] } | { error: string };

export async function getFeaturePhaseTimings(featureId: string): Promise<GetPhaseTimingsResult> {
  if (!featureId.trim()) {
    return { error: 'Feature id is required' };
  }

  try {
    const repo = resolve<IPhaseTimingRepository>('IPhaseTimingRepository');
    const phaseTimings = await repo.findByFeatureId(featureId);

    const timings: PhaseTimingData[] = phaseTimings.map((t) => ({
      agentRunId: t.agentRunId,
      phase: t.phase,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      durationMs: t.durationMs != null ? Number(t.durationMs) : undefined,
      waitingApprovalAt: t.waitingApprovalAt,
      approvalWaitMs: t.approvalWaitMs != null ? Number(t.approvalWaitMs) : undefined,
    }));

    return { timings };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load phase timings';
    return { error: message };
  }
}
