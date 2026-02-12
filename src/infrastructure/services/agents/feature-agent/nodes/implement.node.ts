import type { IAgentExecutor } from '@/application/ports/output/agent-executor.interface.js';
import { executeNode, readSpecFile } from './node-helpers.js';

/**
 * Creates the implement node that executes the implementation plan
 * by delegating to the configured agent.
 */
export function createImplementNode(executor: IAgentExecutor) {
  return executeNode('implement', executor, (state) => {
    const tasksContent = readSpecFile(state.specDir, 'tasks.yaml');
    const planContent = readSpecFile(state.specDir, 'plan.yaml');

    return [
      'Implement the feature following the plan and task breakdown.',
      'Follow TDD: write failing tests first, then implement, then refactor.',
      'Work through tasks in dependency order.',
      '',
      tasksContent ? `Tasks:\n${tasksContent}` : '',
      planContent ? `\nPlan:\n${planContent}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  });
}
