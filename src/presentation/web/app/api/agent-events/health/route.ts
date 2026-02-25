/**
 * SSE Health Check: GET /api/agent-events/health
 *
 * Diagnostic endpoint that verifies the SSE pipeline prerequisites:
 * - DI container is accessible from API routes
 * - Feature listing works
 * - Agent run repository works
 *
 * Use this in the browser to verify the SSE system is functional.
 */

import { resolve } from '@/lib/server-container';
import type { IAgentRunRepository } from '@shepai/core/application/ports/output/agents/agent-run-repository.interface';
import type { ListFeaturesUseCase } from '@shepai/core/application/use-cases/features/list-features.use-case';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Check 1: DI container accessible
  try {
    resolve<ListFeaturesUseCase>('ListFeaturesUseCase');
    checks.container = { ok: true };
  } catch (error) {
    checks.container = {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  // Check 2: Feature listing works
  try {
    const listFeatures = resolve<ListFeaturesUseCase>('ListFeaturesUseCase');
    const features = await listFeatures.execute();
    const withRuns = features.filter((f) => f.agentRunId).length;
    checks.features = {
      ok: true,
      detail: `${features.length} features (${withRuns} with agent runs)`,
    };
  } catch (error) {
    checks.features = {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  // Check 3: Agent run repository works
  try {
    const agentRunRepo = resolve<IAgentRunRepository>('IAgentRunRepository');
    const runs = await agentRunRepo.list();
    const active = runs.filter(
      (r) => r.status === 'running' || r.status === 'pending' || r.status === 'waiting_approval'
    ).length;
    checks.agentRuns = {
      ok: true,
      detail: `${runs.length} runs (${active} active)`,
    };
  } catch (error) {
    checks.agentRuns = {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return Response.json({ ok: allOk, checks }, { status: allOk ? 200 : 503 });
}
