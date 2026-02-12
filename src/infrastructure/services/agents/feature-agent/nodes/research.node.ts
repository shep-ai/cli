import type { IAgentExecutor } from '@/application/ports/output/agent-executor.interface.js';
import { executeNode, readSpecFile } from './node-helpers.js';

/**
 * Creates the research node that performs technical research
 * by delegating to the configured agent.
 */
export function createResearchNode(executor: IAgentExecutor) {
  return executeNode('research', executor, (state) => {
    const specContent = readSpecFile(state.specDir, 'spec.yaml');
    const existingResearch = readSpecFile(state.specDir, 'research.yaml');

    return [
      'Research the technical approach for implementing this feature.',
      'Evaluate libraries, patterns, and architectural decisions needed.',
      'Document your findings and recommendations.',
      '',
      specContent ? `Feature spec:\n${specContent}` : `Feature: ${state.featureId}`,
      existingResearch ? `\nExisting research:\n${existingResearch}` : '',
    ].join('\n');
  });
}
