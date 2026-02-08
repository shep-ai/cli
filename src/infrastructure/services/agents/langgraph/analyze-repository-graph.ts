import { Annotation, StateGraph, START, END, type BaseCheckpointSaver } from '@langchain/langgraph';
import type { IAgentExecutor } from '@/application/ports/output/agent-executor.interface.js';
import { AgentFeature } from '@/domain/generated/output.js';
import { buildAnalyzePrompt } from './prompts/analyze-repository.prompt.js';

/**
 * State annotation for the analyze-repository graph.
 *
 * Uses LangGraph's Annotation API to define state channels with
 * last-value semantics (default behavior — each update replaces the value).
 */
export const AnalyzeRepositoryState = Annotation.Root({
  repositoryPath: Annotation<string>,
  analysisMarkdown: Annotation<string>,
  sessionId: Annotation<string | undefined>,
  error: Annotation<string | undefined>,
});

export type AnalyzeRepositoryStateType = typeof AnalyzeRepositoryState.State;

/**
 * Creates the analyze node function that calls the agent-agnostic executor.
 *
 * The node receives the current state, builds a prompt from the repository path,
 * and delegates execution to the injected IAgentExecutor. Session resume is
 * attempted if the executor supports it and a sessionId exists in state.
 */
function createAnalyzeNode(executor: IAgentExecutor) {
  return async (
    state: typeof AnalyzeRepositoryState.State
  ): Promise<Partial<typeof AnalyzeRepositoryState.State>> => {
    const prompt = buildAnalyzePrompt(state.repositoryPath);

    const options: Parameters<IAgentExecutor['execute']>[1] = {
      cwd: state.repositoryPath,
    };
    if (state.sessionId && executor.supportsFeature(AgentFeature.sessionResume)) {
      options.resumeSession = state.sessionId;
    }

    const result = await executor.execute(prompt, options);

    return {
      analysisMarkdown: result.result,
      sessionId: result.sessionId ?? state.sessionId,
    };
  };
}

/**
 * Factory function that creates and compiles the analyze-repository LangGraph.
 *
 * The graph has a single node (`analyze`) that calls the provided IAgentExecutor
 * to generate a repository analysis document. An optional checkpointer enables
 * persistence of graph state across invocations.
 *
 * @param executor - The agent executor to delegate prompt execution to
 * @param checkpointer - Optional checkpoint saver for state persistence
 * @returns A compiled LangGraph ready to be invoked
 */
export function createAnalyzeRepositoryGraph(
  executor: IAgentExecutor,
  checkpointer?: BaseCheckpointSaver
) {
  const graph = new StateGraph(AnalyzeRepositoryState)
    .addNode('analyze', createAnalyzeNode(executor))
    .addEdge(START, 'analyze')
    .addEdge('analyze', END);

  return graph.compile({ checkpointer });
}
