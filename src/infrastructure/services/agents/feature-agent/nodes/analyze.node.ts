import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IAgentExecutor } from '@/application/ports/output/agent-executor.interface.js';
import { AgentFeature } from '@/domain/generated/output.js';
import type { FeatureAgentState } from '../state.js';

/**
 * Creates the analyze node that delegates repository analysis to the executor.
 *
 * Reads spec.yaml for context, then calls the configured agent (e.g. Claude Code)
 * to analyze the repository structure and codebase.
 */
export function createAnalyzeNode(executor: IAgentExecutor) {
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
        'Analyze this repository and provide a summary of:',
        '- Project structure and architecture',
        '- Key technologies and frameworks used',
        '- Existing patterns and conventions',
        '- Areas relevant to the feature being developed',
        '',
        specContent ? `Feature spec:\n${specContent}` : `Feature: ${state.featureId}`,
      ].join('\n');

      const options: Parameters<IAgentExecutor['execute']>[1] = {
        cwd: state.worktreePath || state.repositoryPath,
      };
      if (state.sessionId && executor.supportsFeature(AgentFeature.sessionResume)) {
        options.resumeSession = state.sessionId;
      }

      const result = await executor.execute(prompt, options);

      return {
        currentNode: 'analyze',
        sessionId: result.sessionId ?? state.sessionId,
        messages: [`[analyze] Repository analysis complete (${result.result.length} chars)`],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        currentNode: 'analyze',
        error: message,
        messages: [`[analyze] Error: ${message}`],
      };
    }
  };
}
