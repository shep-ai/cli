import { Annotation } from '@langchain/langgraph';

/**
 * State annotation for the feature-agent graph.
 *
 * Uses LangGraph's Annotation API to define state channels.
 * The `messages` channel uses a reducer to accumulate messages
 * from all nodes as the graph executes.
 */
export const FeatureAgentAnnotation = Annotation.Root({
  featureId: Annotation<string>,
  repositoryPath: Annotation<string>,
  specDir: Annotation<string>,
  currentNode: Annotation<string>,
  error: Annotation<string | null>({
    reducer: (prev, next) => (next !== undefined ? next : prev),
    default: () => null,
  }),
  messages: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

export type FeatureAgentState = typeof FeatureAgentAnnotation.State;
