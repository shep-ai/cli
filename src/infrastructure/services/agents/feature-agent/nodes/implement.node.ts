import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IAgentExecutor } from '@/application/ports/output/agent-executor.interface.js';
import { AgentFeature } from '@/domain/generated/output.js';
import type { FeatureAgentState } from '../state.js';

/**
 * Creates the implement node that executes the implementation plan
 * by delegating to the configured agent.
 */
export function createImplementNode(executor: IAgentExecutor) {
  return async (state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
    try {
      const tasksPath = join(state.specDir, 'tasks.yaml');
      let tasksContent = '';
      try {
        tasksContent = readFileSync(tasksPath, 'utf-8');
      } catch {
        /* tasks may not exist yet */
      }

      const planPath = join(state.specDir, 'plan.yaml');
      let planContent = '';
      try {
        planContent = readFileSync(planPath, 'utf-8');
      } catch {
        /* plan may not exist yet */
      }

      const prompt = [
        'Implement the feature following the plan and task breakdown.',
        'Follow TDD: write failing tests first, then implement, then refactor.',
        'Work through tasks in dependency order.',
        '',
        tasksContent ? `Tasks:\n${tasksContent}` : '',
        planContent ? `\nPlan:\n${planContent}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const options: Parameters<IAgentExecutor['execute']>[1] = {
        cwd: state.worktreePath || state.repositoryPath,
      };
      if (state.sessionId && executor.supportsFeature(AgentFeature.sessionResume)) {
        options.resumeSession = state.sessionId;
      }

      const result = await executor.execute(prompt, options);

      return {
        currentNode: 'implement',
        sessionId: result.sessionId ?? state.sessionId,
        messages: [`[implement] Implementation complete (${result.result.length} chars)`],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        currentNode: 'implement',
        error: message,
        messages: [`[implement] Error: ${message}`],
      };
    }
  };
}
