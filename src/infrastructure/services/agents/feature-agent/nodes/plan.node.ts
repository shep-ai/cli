import type { IAgentExecutor } from '@/application/ports/output/agent-executor.interface.js';
import { executeNode, readSpecFile } from './node-helpers.js';

/**
 * Creates the plan node that generates an implementation plan
 * by delegating to the configured agent.
 */
export function createPlanNode(executor: IAgentExecutor) {
  return executeNode('plan', executor, (state) => {
    const specContent = readSpecFile(state.specDir, 'spec.yaml');
    const researchContent = readSpecFile(state.specDir, 'research.yaml');

    return [
      'Create a detailed implementation plan for this feature.',
      'Break the work into tasks with clear acceptance criteria.',
      'Follow TDD: define RED-GREEN-REFACTOR cycles for each task.',
      '',
      specContent ? `Feature spec:\n${specContent}` : `Feature: ${state.featureId}`,
      researchContent ? `\nResearch findings:\n${researchContent}` : '',
    ].join('\n');
  });
}
