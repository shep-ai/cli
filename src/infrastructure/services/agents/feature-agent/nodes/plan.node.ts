import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IAgentExecutor } from '@/application/ports/output/agent-executor.interface.js';
import { AgentFeature } from '@/domain/generated/output.js';
import type { FeatureAgentState } from '../state.js';

/**
 * Creates the plan node that generates an implementation plan
 * by delegating to the configured agent.
 */
export function createPlanNode(executor: IAgentExecutor) {
  return async (state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
    try {
      const specPath = join(state.specDir, 'spec.yaml');
      let specContent = '';
      try {
        specContent = readFileSync(specPath, 'utf-8');
      } catch {
        /* spec may not exist yet */
      }

      const researchPath = join(state.specDir, 'research.yaml');
      let researchContent = '';
      try {
        researchContent = readFileSync(researchPath, 'utf-8');
      } catch {
        /* research may not exist yet */
      }

      const prompt = [
        'Create a detailed implementation plan for this feature.',
        'Break the work into tasks with clear acceptance criteria.',
        'Follow TDD: define RED-GREEN-REFACTOR cycles for each task.',
        '',
        specContent ? `Feature spec:\n${specContent}` : `Feature: ${state.featureId}`,
        researchContent ? `\nResearch findings:\n${researchContent}` : '',
      ].join('\n');

      const options: Parameters<IAgentExecutor['execute']>[1] = {
        cwd: state.worktreePath || state.repositoryPath,
      };
      if (state.sessionId && executor.supportsFeature(AgentFeature.sessionResume)) {
        options.resumeSession = state.sessionId;
      }

      const result = await executor.execute(prompt, options);

      return {
        currentNode: 'plan',
        sessionId: result.sessionId ?? state.sessionId,
        messages: [`[plan] Implementation plan complete (${result.result.length} chars)`],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        currentNode: 'plan',
        error: message,
        messages: [`[plan] Error: ${message}`],
      };
    }
  };
}
