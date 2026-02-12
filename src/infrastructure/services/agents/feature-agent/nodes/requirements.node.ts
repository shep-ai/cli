import type { IAgentExecutor } from '@/application/ports/output/agent-executor.interface.js';
import { executeNode } from './node-helpers.js';
import { buildRequirementsPrompt } from './prompts/requirements.prompt.js';

/**
 * Creates the requirements node that builds comprehensive requirements
 * with product questions and AI-recommended defaults, writing to spec.yaml.
 */
export function createRequirementsNode(executor: IAgentExecutor) {
  return executeNode('requirements', executor, buildRequirementsPrompt);
}
