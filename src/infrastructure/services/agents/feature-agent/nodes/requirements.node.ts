import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IAgentExecutor } from '@/application/ports/output/agent-executor.interface.js';
import { AgentFeature } from '@/domain/generated/output.js';
import type { FeatureAgentState } from '../state.js';

/**
 * Creates the requirements node that gathers and refines requirements
 * by delegating to the configured agent.
 */
export function createRequirementsNode(executor: IAgentExecutor) {
  return async (state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
    try {
      const specPath = join(state.specDir, 'spec.yaml');
      let specContent = '';
      try {
        specContent = readFileSync(specPath, 'utf-8');
      } catch {
        /* spec may not exist yet */
      }

      const prompt = [
        'Review and refine the requirements for this feature.',
        'Ensure success criteria are clear, measurable, and complete.',
        'Identify any gaps or ambiguities in the specification.',
        '',
        specContent ? `Current spec:\n${specContent}` : `Feature: ${state.featureId}`,
      ].join('\n');

      const options: Parameters<IAgentExecutor['execute']>[1] = {
        cwd: state.worktreePath || state.repositoryPath,
      };
      if (state.sessionId && executor.supportsFeature(AgentFeature.sessionResume)) {
        options.resumeSession = state.sessionId;
      }

      const result = await executor.execute(prompt, options);

      return {
        currentNode: 'requirements',
        sessionId: result.sessionId ?? state.sessionId,
        messages: [`[requirements] Requirements analysis complete (${result.result.length} chars)`],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        currentNode: 'requirements',
        error: message,
        messages: [`[requirements] Error: ${message}`],
      };
    }
  };
}
