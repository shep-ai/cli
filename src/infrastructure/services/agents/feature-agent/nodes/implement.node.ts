import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { FeatureAgentState } from '../state.js';
import { createNodeLogger } from './node-helpers.js';
import { reportNodeStart } from '../heartbeat.js';
import { getImplementPlaceholderJoke } from './prompts/implement.prompt.js';

/**
 * Creates the implement node — PLACEHOLDER.
 *
 * Implementation execution is not yet wired up.
 * Returns a programming joke to clearly signal this is a placeholder
 * while keeping the graph pipeline intact.
 */
export function createImplementNode(_executor: IAgentExecutor) {
  const log = createNodeLogger('implement');

  return async (_state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
    log.info('Starting... (placeholder — implementation not yet wired)');
    reportNodeStart('implement');

    const joke = getImplementPlaceholderJoke();
    log.info(`Placeholder complete. ${joke}`);

    return {
      currentNode: 'implement',
      messages: [`[implement] Placeholder — ${joke}`],
    };
  };
}
