import { StateGraph, START, END, type BaseCheckpointSaver } from '@langchain/langgraph';
import { FeatureAgentAnnotation } from './state.js';
import { analyzeNode } from './nodes/analyze.node.js';
import { requirementsNode } from './nodes/requirements.node.js';
import { researchNode } from './nodes/research.node.js';
import { planNode } from './nodes/plan.node.js';
import { implementNode } from './nodes/implement.node.js';

// Re-export state types for consumers
export { FeatureAgentAnnotation, type FeatureAgentState } from './state.js';

/**
 * Factory function that creates and compiles the feature-agent LangGraph.
 *
 * The graph defines a linear SDLC workflow:
 *   analyze → requirements → research → plan → implement
 *
 * Each node reads from the spec directory and reports on artifact status.
 *
 * @param checkpointer - Optional checkpoint saver for state persistence
 * @returns A compiled LangGraph ready to be invoked
 */
export function createFeatureAgentGraph(checkpointer?: BaseCheckpointSaver) {
  const graph = new StateGraph(FeatureAgentAnnotation)
    .addNode('analyze', analyzeNode)
    .addNode('requirements', requirementsNode)
    .addNode('research', researchNode)
    .addNode('plan', planNode)
    .addNode('implement', implementNode)
    .addEdge(START, 'analyze')
    .addEdge('analyze', 'requirements')
    .addEdge('requirements', 'research')
    .addEdge('research', 'plan')
    .addEdge('plan', 'implement')
    .addEdge('implement', END);

  return graph.compile({ checkpointer });
}
