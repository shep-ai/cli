/**
 * Fast Feature Agent Graph Factory
 *
 * Creates a LangGraph StateGraph with nodes: fast-implement → collect_evidence → merge.
 * This is the fast-mode alternative to createFeatureAgentGraph() which has
 * 15+ nodes. The merge node and its CI watch/fix loop are reused via
 * composition from the full graph's createMergeNode(). The evidence node
 * captures proof of completion (screenshots, test output) just like the full graph.
 *
 * Uses the same FeatureAgentAnnotation state shape as the full graph,
 * enabling checkpointing, resume, and identical worker lifecycle handling.
 */

import { StateGraph, START, END, type BaseCheckpointSaver } from '@langchain/langgraph';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import { FeatureAgentAnnotation, type FeatureAgentState } from './state.js';
import { createFastImplementNode } from './nodes/fast-implement.node.js';
import { createEvidenceNode } from './nodes/evidence.node.js';
import { createMergeNode, type MergeNodeDeps } from './nodes/merge/merge.node.js';

// Re-export for consumers
export { FeatureAgentAnnotation, type FeatureAgentState } from './state.js';

/**
 * Dependencies needed to build the fast feature agent graph.
 * Same shape as FeatureAgentGraphDeps for consistency.
 */
export interface FastFeatureAgentGraphDeps {
  executor: IAgentExecutor;
  mergeNodeDeps?: Omit<MergeNodeDeps, 'executor'>;
}

/**
 * Conditional edge: route back to fast-implement on merge rejection,
 * otherwise proceed to END.
 *
 * Mirrors the routeReexecution() pattern from feature-agent-graph.ts.
 */
function routeReexecution(
  selfNode: string,
  nextNode: string
): (state: FeatureAgentState) => string {
  return (state: FeatureAgentState): string => {
    if (state._needsReexecution) return selfNode;
    return nextNode;
  };
}

/**
 * Factory function that creates and compiles the fast-mode feature agent graph.
 *
 * The graph defines a minimal workflow:
 *   START → fast-implement → collect_evidence → merge → conditional(reexecute or END)
 *
 * When merge is rejected, routeReexecution routes back to fast-implement
 * for a fresh implementation pass.
 *
 * @param depsOrExecutor - Graph dependencies or a legacy executor
 * @param checkpointer - Optional checkpoint saver for state persistence
 * @returns A compiled LangGraph ready to be invoked
 */
export function createFastFeatureAgentGraph(
  depsOrExecutor: FastFeatureAgentGraphDeps | IAgentExecutor,
  checkpointer?: BaseCheckpointSaver
) {
  // Support legacy signature: createFastFeatureAgentGraph(executor, checkpointer)
  const deps: FastFeatureAgentGraphDeps =
    'execute' in depsOrExecutor ? { executor: depsOrExecutor } : depsOrExecutor;
  const { executor } = deps;

  const graph = new StateGraph(FeatureAgentAnnotation)
    .addNode('fast-implement', createFastImplementNode(executor))
    .addNode('collect_evidence', createEvidenceNode(executor));

  // --- Evidence node: always wired after fast-implement ---
  graph.addEdge(START, 'fast-implement').addEdge('fast-implement', 'collect_evidence');

  // Wire merge node when deps are provided
  if (deps.mergeNodeDeps) {
    const mergeNodeDeps: MergeNodeDeps = {
      executor,
      ...deps.mergeNodeDeps,
    };
    graph
      .addNode('merge', createMergeNode(mergeNodeDeps))
      .addEdge('collect_evidence', 'merge')
      .addConditionalEdges('merge', routeReexecution('fast-implement', END));
  } else {
    // Without merge deps, evidence goes directly to END
    graph.addEdge('collect_evidence', END);
  }

  return graph.compile({ checkpointer });
}
