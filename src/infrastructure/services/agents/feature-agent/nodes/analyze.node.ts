import type { IAgentExecutor } from '@/application/ports/output/agent-executor.interface.js';
import { executeNode, readSpecFile } from './node-helpers.js';

/**
 * Creates the analyze node that delegates repository analysis to the executor.
 *
 * Reads spec.yaml for context, then calls the configured agent (e.g. Claude Code)
 * to analyze the repository structure and codebase.
 */
export function createAnalyzeNode(executor: IAgentExecutor) {
  return executeNode('analyze', executor, (state) => {
    const specContent = readSpecFile(state.specDir, 'spec.yaml');

    return [
      'Analyze this repository and provide a summary of:',
      '- Project structure and architecture',
      '- Key technologies and frameworks used',
      '- Existing patterns and conventions',
      '- Areas relevant to the feature being developed',
      '',
      specContent ? `Feature spec:\n${specContent}` : `Feature: ${state.featureId}`,
    ].join('\n');
  });
}
