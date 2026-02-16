/**
 * Show Agent Run Use Case
 *
 * Retrieves a single agent run by ID with process liveness check.
 *
 * Business Rules:
 * - Tries exact ID match first, then prefix match via list()
 * - Throws if the agent run does not exist
 * - Checks process liveness for runs that have a pid
 */

import { injectable, inject } from 'tsyringe';
import type { AgentRun } from '../../../domain/generated/output.js';
import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';
import type { IFeatureAgentProcessService } from '../../ports/output/agents/feature-agent-process.interface.js';

export interface ShowAgentRunResult {
  run: AgentRun;
  isAlive: boolean;
}

@injectable()
export class ShowAgentRunUseCase {
  constructor(
    @inject('IAgentRunRepository')
    private readonly runRepo: IAgentRunRepository,
    @inject('IFeatureAgentProcessService')
    private readonly processService: IFeatureAgentProcessService
  ) {}

  async execute(runId: string): Promise<ShowAgentRunResult> {
    // Try exact match first
    let run = await this.runRepo.findById(runId);

    // Fall back to prefix match
    if (!run) {
      const allRuns = await this.runRepo.list();
      run = allRuns.find((r) => r.id.startsWith(runId)) ?? null;
    }

    if (!run) {
      throw new Error(`Agent run not found: "${runId}"`);
    }

    const isAlive = run.pid != null ? this.processService.isAlive(run.pid) : false;

    return { run, isAlive };
  }
}
