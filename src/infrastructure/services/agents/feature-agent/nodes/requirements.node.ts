import type { IAgentExecutor } from '@/application/ports/output/agent-executor.interface.js';
import { executeNode, readSpecFile } from './node-helpers.js';

/**
 * Creates the requirements node that gathers and refines requirements
 * by delegating to the configured agent.
 */
export function createRequirementsNode(executor: IAgentExecutor) {
  return executeNode('requirements', executor, (state) => {
    const specContent = readSpecFile(state.specDir, 'spec.yaml');

    return [
      'Review and refine the requirements for this feature.',
      'Ensure success criteria are clear, measurable, and complete.',
      'Identify any gaps or ambiguities in the specification.',
      '',
      specContent ? `Current spec:\n${specContent}` : `Feature: ${state.featureId}`,
    ].join('\n');
  });
}
