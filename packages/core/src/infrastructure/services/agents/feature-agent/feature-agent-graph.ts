import { StateGraph, START, END, type BaseCheckpointSaver } from '@langchain/langgraph';
import type { IAgentExecutor } from '../../../../application/ports/output/agents/agent-executor.interface.js';
import { FeatureAgentAnnotation } from './state.js';
import { createAnalyzeNode } from './nodes/analyze.node.js';
import { createRequirementsNode } from './nodes/requirements.node.js';
import { createResearchNode } from './nodes/research.node.js';
import { createPlanNode } from './nodes/plan.node.js';
import { createImplementNode } from './nodes/implement.node.js';

// Re-export state types for consumers
export { FeatureAgentAnnotation, type FeatureAgentState } from './state.js';

/**
 * Factory function that creates and compiles the feature-agent LangGraph.
 *
 * The graph defines a linear SDLC workflow:
 *   analyze → requirements → research → plan → implement
 *
 * Each node delegates work to the injected IAgentExecutor (e.g. Claude Code).
 *
 * @param executor - The agent executor to delegate prompt execution to
 * @param checkpointer - Optional checkpoint saver for state persistence
 * @returns A compiled LangGraph ready to be invoked
 */
export function createFeatureAgentGraph(
  executor: IAgentExecutor,
  checkpointer?: BaseCheckpointSaver
) {
  const graph = new StateGraph(FeatureAgentAnnotation)
    .addNode('analyze', createAnalyzeNode(executor))
    .addNode('requirements', createRequirementsNode(executor))
    .addNode('research', createResearchNode(executor))
    .addNode('plan', createPlanNode(executor))
    .addNode('implement', createImplementNode(executor))
    .addEdge(START, 'analyze')
    .addEdge('analyze', 'requirements')
    .addEdge('requirements', 'research')
    .addEdge('research', 'plan')
    .addEdge('plan', 'implement')
    .addEdge('implement', END);

  return graph.compile({ checkpointer });
}
