# Agent System Architecture

Multi-stage workflow orchestration using LangGraph StateGraphs with Claude integration.

## Overview

Shep implements a **state-based workflow system** using [LangGraph](https://www.langchain.com/langgraph) for multi-stage feature development. Rather than traditional agent objects, nodes are **pure async functions** that process and update state.

```
┌─────────────────────────────────────────┐
│     FeatureWorkflow (StateGraph)        │
├─────────────────────────────────────────┤
│                                         │
│  [Analyze] ──→ [Gather Req] ──→ [Plan] │
│                     ↓                   │
│                 (loop until             │
│                  clear)                 │
│                     │                   │
│                     ↓                   │
│              [Implement] ──→ [END]     │
│                                         │
│  State: typed, immutable updates        │
│  Tools: context_query, file_system,     │
│         code_exec                       │
│                                         │
└─────────────────────────────────────────┘
```

## Design Principles

1. **State-Driven**: All workflow state flows through a typed schema
2. **Pure Functions**: Nodes are deterministic, side-effect-free async functions
3. **Explicit Edges**: Flow control via direct or conditional edges (no hidden routing)
4. **Tool-Based**: Agents invoke tools to interact with the system (query context, read files, execute code)
5. **Type Safe**: TypeScript Annotations with Zod validation for tool parameters
6. **Observable**: Full execution history via checkpoints

## Core Concepts

### StateGraph

Typed workflow definition using LangChain's StateGraph:

```typescript
import { Annotation } from '@langchain/langgraph';

export const FeatureState = Annotation.Root({
  repoPath: Annotation<string>,
  repoAnalysis: Annotation<RepoAnalysis | null>,
  requirements: Annotation<Requirement[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  plan: Annotation<Plan | null>,
  tasks: Annotation<Task[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

export type FeatureStateType = typeof FeatureState.State;
```

### Nodes

Functions that process and update state:

```typescript
export async function analyzeNode(state: FeatureStateType): Promise<Partial<FeatureStateType>> {
  const analysis = await analyzeRepository(state.repoPath);
  return { repoAnalysis: analysis };
}

export async function requirementsNode(
  state: FeatureStateType
): Promise<Partial<FeatureStateType>> {
  const model = new ChatAnthropic({ modelName: 'claude-sonnet-4-20250514' });
  const modelWithTools = model.bindTools([contextQueryTool, fileSystemTool]);

  const response = await modelWithTools.invoke([
    { role: 'system', content: 'Gather requirements...' },
    ...state.messages,
  ]);

  return { messages: [response] };
}
```

### Edges

Connections defining workflow progression:

```typescript
// Direct edge: always go from A to B
graph.addEdge('analyze', 'requirements');

// Conditional edge: choose based on state
graph.addConditionalEdges('requirements', (state) => {
  if (allRequirementsClear(state)) return 'plan';
  return 'requirements'; // Loop back for clarification
});
```

### Tools

External capabilities agents can invoke:

```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const contextQueryTool = tool(
  async ({ query, type, limit }) => {
    const vectorStore = getVectorStore();
    const embedding = await embed(query);
    const results = await vectorStore.searchAssets(embedding, { limit });
    return JSON.stringify(results);
  },
  {
    name: 'context_query',
    description: 'Search the codebase knowledge graph for relevant code/components',
    schema: z.object({
      query: z.string().describe('Natural language query'),
      type: z.string().optional().describe('Asset type filter'),
      limit: z.number().default(10),
    }),
  }
);
```

## Workflow Stages

| Stage            | Node               | Responsibility                                               |
| ---------------- | ------------------ | ------------------------------------------------------------ |
| **Analyze**      | `analyzeNode`      | Parse codebase structure, patterns, tech stack               |
| **Requirements** | `requirementsNode` | Gather requirements via conversation, validate clarity       |
| **Plan**         | `planNode`         | Decompose into tasks, create artifacts (PRD, RFC, Tech Plan) |
| **Implement**    | `implementNode`    | Execute tasks respecting dependency graph                    |

## Practical Example

See [docs/guides/langgraph-agents.md](../guides/langgraph-agents.md) for working examples.

For implementation details, see [docs/development/adding-agents.md](../development/adding-agents.md).

---

## Maintaining This Document

**Update when:**

- StateGraph structure changes
- New workflow stages added
- Node functions added or modified
- Tool schemas change

**Related docs:**

- [AGENTS.md](../../AGENTS.md) - Detailed LangGraph implementation
- [../guides/langgraph-agents.md](../guides/langgraph-agents.md) - Working with LangGraph
- [../development/adding-agents.md](../development/adding-agents.md) - Adding new nodes
- [../context-layer.md](./context-layer.md) - Vector DB & asset graph
