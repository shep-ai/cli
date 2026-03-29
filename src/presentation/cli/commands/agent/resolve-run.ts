/**
 * Shared helper: resolve an agent run by exact or prefix ID.
 */

import { container } from '@/infrastructure/di/container.js';
import { GetAgentRunUseCase } from '@/application/use-cases/agents/get-agent-run.use-case.js';
import { ListAgentRunsUseCase } from '@/application/use-cases/agents/list-agent-runs.use-case.js';
import type { AgentRun } from '@/domain/generated/output.js';
import { getCliI18n } from '../../i18n.js';

export async function resolveAgentRun(id: string): Promise<{ run: AgentRun } | { error: string }> {
  const t = getCliI18n().t;
  const getUseCase = container.resolve(GetAgentRunUseCase);

  // Try exact match first
  const exact = await getUseCase.execute(id);
  if (exact) return { run: exact };

  // Try prefix match
  if (id.length < 36) {
    const listUseCase = container.resolve(ListAgentRunsUseCase);
    const allRuns = await listUseCase.execute();
    const matches = allRuns.filter((r) => r.id.startsWith(id));

    if (matches.length === 1) return { run: matches[0] };
    if (matches.length > 1) {
      return {
        error: t('cli:commands.agent.resolve.multipleMatch', {
          id,
          matches: matches.map((m) => m.id.substring(0, 8)).join(', '),
        }),
      };
    }
  }

  return { error: t('cli:commands.agent.resolve.notFound', { id }) };
}
