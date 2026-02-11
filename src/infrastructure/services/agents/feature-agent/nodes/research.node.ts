import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IAgentExecutor } from '@/application/ports/output/agent-executor.interface.js';
import { AgentFeature } from '@/domain/generated/output.js';
import type { FeatureAgentState } from '../state.js';

/**
 * Creates the research node that performs technical research
 * by delegating to the configured agent.
 */
export function createResearchNode(executor: IAgentExecutor) {
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
      let existingResearch = '';
      try {
        existingResearch = readFileSync(researchPath, 'utf-8');
      } catch {
        /* research may not exist yet */
      }

      const prompt = [
        'Research the technical approach for implementing this feature.',
        'Evaluate libraries, patterns, and architectural decisions needed.',
        'Document your findings and recommendations.',
        '',
        specContent ? `Feature spec:\n${specContent}` : `Feature: ${state.featureId}`,
        existingResearch ? `\nExisting research:\n${existingResearch}` : '',
      ].join('\n');

      const options: Parameters<IAgentExecutor['execute']>[1] = {
        cwd: state.worktreePath || state.repositoryPath,
      };
      if (state.sessionId && executor.supportsFeature(AgentFeature.sessionResume)) {
        options.resumeSession = state.sessionId;
      }

      const result = await executor.execute(prompt, options);

      return {
        currentNode: 'research',
        sessionId: result.sessionId ?? state.sessionId,
        messages: [`[research] Technical research complete (${result.result.length} chars)`],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        currentNode: 'research',
        error: message,
        messages: [`[research] Error: ${message}`],
      };
    }
  };
}
