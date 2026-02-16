import type { IAgentExecutor } from '../../../../../application/ports/output/agents/agent-executor.interface.js';
import { executeNode } from './node-helpers.js';
import { buildAnalyzePrompt } from './prompts/analyze.prompt.js';

/**
 * Creates the analyze node that explores the repository and writes
 * codebase analysis, complexity estimate, and affected areas to spec.yaml.
 */
export function createAnalyzeNode(executor: IAgentExecutor) {
  return executeNode('analyze', executor, buildAnalyzePrompt);
}
