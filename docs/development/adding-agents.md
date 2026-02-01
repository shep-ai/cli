# Adding New Agent Nodes

Guide to extending Shep's LangGraph-based agent system with new nodes.

## Overview

Shep's agent system is built on LangGraph StateGraphs. Adding new capabilities involves:

1. Defining state fields for node inputs/outputs
2. Creating the node function
3. Adding the node to a graph
4. Connecting with edges
5. Writing tests (TDD)

## Prerequisites

Before adding a new node, understand:

- [LangGraph Agents Guide](../guides/langgraph-agents.md) - Core concepts
- [Agent System Architecture](../architecture/agent-system.md) - Full architecture
- [Context Layer](../architecture/context-layer.md) - Vector DB integration

## Step-by-Step Guide

### Step 1: Define State Fields

First, determine what state your node needs to read and write.

```typescript
// src/infrastructure/agents/langgraph/state.ts

import { Annotation } from '@langchain/langgraph';

// Add new fields to the state schema
export const FeatureState = Annotation.Root({
  // Existing fields...
  repoPath: Annotation<string>,
  repoAnalysis: Annotation<RepoAnalysis | null>,

  // NEW: Add your node's output field
  myNodeOutput: Annotation<MyOutputType | null>,

  // For arrays, use reducers
  myItems: Annotation<MyItem[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => []
  })
});

export type FeatureStateType = typeof FeatureState.State;
```

**State Field Guidelines:**

| Pattern | Use Case | Example |
|---------|----------|---------|
| Simple field | Single value output | `analysis: Annotation<Analysis \| null>` |
| Array with reducer | Accumulating items | `tasks: Annotation<Task[]>({ reducer: ... })` |
| Status/phase field | Tracking progress | `currentPhase: Annotation<SdlcLifecycle>` |
| Error field | Error handling | `error: Annotation<string \| null>` |

### Step 2: Create the Node Function

Create a new file for your node:

```typescript
// src/infrastructure/agents/langgraph/nodes/my-node.node.ts

import { ChatAnthropic } from '@langchain/anthropic';
import { FeatureStateType } from '../state';

const model = new ChatAnthropic({
  modelName: 'claude-sonnet-4-20250514'
});

/**
 * MyNode - Brief description of what this node does.
 *
 * Inputs (from state):
 * - repoAnalysis: Repository context
 * - requirements: Gathered requirements
 *
 * Outputs (state updates):
 * - myNodeOutput: The processed result
 * - currentPhase: Updated lifecycle phase
 */
export async function myNode(
  state: FeatureStateType
): Promise<Partial<FeatureStateType>> {
  // 1. Extract needed state
  const { repoAnalysis, requirements } = state;

  // 2. Validate inputs
  if (!repoAnalysis) {
    return {
      error: 'Repository analysis required before this step'
    };
  }

  // 3. Do the work
  const result = await processData(repoAnalysis, requirements);

  // 4. Return partial state update
  return {
    myNodeOutput: result,
    currentPhase: SdlcLifecycle.NextPhase
  };
}

// Helper functions (keep node function clean)
async function processData(
  analysis: RepoAnalysis,
  requirements: Requirement[]
): Promise<MyOutputType> {
  // Implementation
}
```

**Node Function Rules:**

1. **Pure inputs**: Only read from `state` parameter
2. **Partial outputs**: Return only changed fields
3. **No side effects**: Avoid modifying external state
4. **Error handling**: Return error in state, don't throw
5. **Document I/O**: Comment inputs and outputs

### Step 3: Add Node to Graph

Register your node in the appropriate graph:

```typescript
// src/infrastructure/agents/langgraph/graphs/feature.graph.ts

import { StateGraph, START, END } from '@langchain/langgraph';
import { FeatureState } from '../state';
import { analyzeNode, requirementsNode, planNode, implementNode } from '../nodes';
import { myNode } from '../nodes/my-node.node';  // NEW

export function createFeatureGraph() {
  return new StateGraph(FeatureState)
    .addNode('analyze', analyzeNode)
    .addNode('requirements', requirementsNode)
    .addNode('myNode', myNode)  // NEW
    .addNode('plan', planNode)
    .addNode('implement', implementNode)

    // Define flow (see Step 4)
    .addEdge(START, 'analyze')
    // ...
    .compile();
}
```

### Step 4: Connect with Edges

Choose the appropriate edge type:

#### Direct Edge (Always A → B)

```typescript
// After analyze, always go to myNode
graph.addEdge('analyze', 'myNode');
graph.addEdge('myNode', 'requirements');
```

#### Conditional Edge (Dynamic Routing)

```typescript
// Choose next node based on state
graph.addConditionalEdges('myNode', (state) => {
  if (state.error) {
    return 'error_handler';
  }
  if (needsMoreWork(state)) {
    return 'myNode';  // Loop back
  }
  return 'next_step';
});
```

#### Branching Pattern

```typescript
graph.addConditionalEdges('decision_point', (state) => {
  switch (state.decisionType) {
    case 'typeA': return 'handleA';
    case 'typeB': return 'handleB';
    default: return 'handleDefault';
  }
});
```

### Step 5: Write Tests (TDD)

Follow Red-Green-Refactor:

#### Unit Test (Node Function)

```typescript
// tests/unit/agents/nodes/my-node.node.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myNode } from '@/infrastructure/agents/langgraph/nodes/my-node.node';

describe('myNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process analysis and return output', async () => {
    // Arrange
    const state = {
      repoPath: '/test/repo',
      repoAnalysis: { /* mock data */ },
      requirements: [{ id: '1', text: 'Requirement' }],
      myNodeOutput: null,
      currentPhase: SdlcLifecycle.Requirements
    };

    // Act
    const result = await myNode(state);

    // Assert
    expect(result.myNodeOutput).toBeDefined();
    expect(result.currentPhase).toBe(SdlcLifecycle.NextPhase);
  });

  it('should return error when analysis missing', async () => {
    const state = {
      repoPath: '/test/repo',
      repoAnalysis: null,  // Missing!
      requirements: [],
      myNodeOutput: null,
      currentPhase: SdlcLifecycle.Requirements
    };

    const result = await myNode(state);

    expect(result.error).toContain('Repository analysis required');
  });

  it('should handle empty requirements gracefully', async () => {
    const state = {
      repoPath: '/test/repo',
      repoAnalysis: { /* mock data */ },
      requirements: [],  // Empty
      myNodeOutput: null,
      currentPhase: SdlcLifecycle.Requirements
    };

    const result = await myNode(state);

    expect(result.myNodeOutput).toBeDefined();
    // Verify appropriate handling of empty input
  });
});
```

#### Integration Test (Graph Flow)

```typescript
// tests/integration/agents/graphs/feature.graph.test.ts

import { describe, it, expect } from 'vitest';
import { createFeatureGraph } from '@/infrastructure/agents/langgraph/graphs/feature.graph';

describe('FeatureGraph with myNode', () => {
  it('should execute myNode in correct order', async () => {
    const graph = createFeatureGraph();
    const executedNodes: string[] = [];

    // Stream to track node execution
    const stream = await graph.stream({
      repoPath: './test-fixtures/sample-repo',
      featureDescription: 'Test feature'
    });

    for await (const event of stream) {
      executedNodes.push(event.node);
    }

    // Verify myNode runs after analyze
    const analyzeIndex = executedNodes.indexOf('analyze');
    const myNodeIndex = executedNodes.indexOf('myNode');

    expect(myNodeIndex).toBeGreaterThan(analyzeIndex);
  });
});
```

## Adding Tools to Nodes

If your node needs external capabilities, create or use tools:

### Using Existing Tools

```typescript
import { contextQueryTool, fileSystemTool } from '../tools';

const modelWithTools = model.bindTools([
  contextQueryTool,
  fileSystemTool
]);

export async function myNode(state: FeatureStateType) {
  const response = await modelWithTools.invoke([
    { role: 'system', content: MY_NODE_PROMPT },
    { role: 'user', content: state.featureDescription }
  ]);

  // Handle tool calls if any
  const toolCalls = response.tool_calls || [];
  // Process results...
}
```

### Creating a New Tool

```typescript
// src/infrastructure/agents/langgraph/tools/my-tool.tool.ts

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const myTool = tool(
  async ({ param1, param2 }) => {
    // Tool implementation
    const result = await doSomething(param1, param2);
    return JSON.stringify(result);
  },
  {
    name: 'my_tool',
    description: 'Clear description of what this tool does and when to use it',
    schema: z.object({
      param1: z.string().describe('Description of param1'),
      param2: z.number().optional().describe('Optional numeric parameter')
    })
  }
);
```

**Tool Guidelines:**

- Return JSON strings for complex data
- Use Zod for parameter validation
- Write clear descriptions (LLM uses them)
- Handle errors gracefully
- Keep tools focused (single responsibility)

## Common Patterns

### Looping Node

```typescript
export async function gatheringNode(state: FeatureStateType) {
  const newItems = await gatherMore(state);

  return {
    items: newItems,  // Reducer appends to existing
    gatheringComplete: newItems.length === 0
  };
}

// In graph:
graph.addConditionalEdges('gathering', (state) =>
  state.gatheringComplete ? 'next' : 'gathering'
);
```

### Human-in-the-Loop

```typescript
import { interrupt } from '@langchain/langgraph';

export async function approvalNode(state: FeatureStateType) {
  // Pause for human approval
  const approved = await interrupt({
    type: 'approval_required',
    message: 'Please review the plan',
    data: state.plan
  });

  if (!approved) {
    return { error: 'Plan rejected by user' };
  }

  return { approved: true };
}
```

### Error Recovery

```typescript
export async function safeNode(state: FeatureStateType) {
  try {
    const result = await riskyOperation(state);
    return { result, error: null };
  } catch (error) {
    // Don't throw - return error in state
    return {
      result: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      currentPhase: SdlcLifecycle.Error
    };
  }
}

// Add error handler node
graph.addNode('error_handler', errorHandlerNode);
graph.addConditionalEdges('safeNode', (state) =>
  state.error ? 'error_handler' : 'next'
);
```

### Parallel Execution

```typescript
export async function parallelNode(state: FeatureStateType) {
  // Run multiple tasks concurrently
  const [result1, result2, result3] = await Promise.all([
    processTypeA(state),
    processTypeB(state),
    processTypeC(state)
  ]);

  return {
    resultsA: result1,
    resultsB: result2,
    resultsC: result3
  };
}
```

## File Organization

```
src/infrastructure/agents/langgraph/
├── state.ts                    # State schema (modify for new fields)
├── nodes/
│   ├── index.ts               # Export all nodes
│   ├── analyze.node.ts
│   ├── requirements.node.ts
│   ├── plan.node.ts
│   ├── implement.node.ts
│   └── my-node.node.ts        # NEW: Your node
├── graphs/
│   ├── feature.graph.ts       # Main workflow graph
│   └── supervisor.graph.ts    # Multi-agent graph
└── tools/
    ├── index.ts               # Export all tools
    ├── context-query.tool.ts
    ├── file-system.tool.ts
    ├── code-exec.tool.ts
    └── my-tool.tool.ts        # NEW: Your tool
```

## Checklist

Before submitting your new node:

- [ ] State fields defined with appropriate types
- [ ] Node function created with clear I/O documentation
- [ ] Node added to graph with correct edges
- [ ] Unit tests written (TDD - wrote tests first)
- [ ] Integration tests verify graph flow
- [ ] Error cases handled gracefully
- [ ] Tools created if needed (with Zod schemas)
- [ ] Exports updated in index.ts files
- [ ] Documentation updated (AGENTS.md if significant)

---

## Maintaining This Document

**Update when:**
- New patterns emerge
- LangGraph API changes
- Common issues are discovered
- Testing strategies evolve

**Related docs:**
- [AGENTS.md](../../AGENTS.md) - Agent reference
- [langgraph-agents.md](../guides/langgraph-agents.md) - Working with agents
- [context-layer.md](../architecture/context-layer.md) - Vector DB integration
- [tdd-guide.md](./tdd-guide.md) - TDD workflow
