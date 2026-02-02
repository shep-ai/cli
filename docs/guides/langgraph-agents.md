# Working with LangGraph Agents

Guide to understanding and extending Shep's LangGraph-based agent system.

## Overview

Shep uses [LangGraph](https://www.langchain.com/langgraph) for multi-agent orchestration. LangGraph provides:

- **StateGraph**: Type-safe workflow definitions
- **Nodes**: Functions that process and update state
- **Edges**: Connections between nodes (direct or conditional)
- **Tools**: External capabilities agents can invoke
- **Checkpoints**: Durable execution with persistence

## Quick Start

### Running a Workflow

```typescript
import { createFeatureGraph } from '@/infrastructure/agents/langgraph/graphs/feature.graph';

const workflow = createFeatureGraph();

const result = await workflow.invoke({
  repoPath: '/path/to/repo',
  featureDescription: 'Add user authentication with OAuth',
});

console.log(result.tasks); // Generated tasks
console.log(result.artifacts); // Generated PRD, RFC, etc.
```

### Streaming Execution

```typescript
const stream = await workflow.stream({
  repoPath: '/path/to/repo',
  featureDescription: 'Add dark mode toggle',
});

for await (const event of stream) {
  console.log('Node:', event.node);
  console.log('State update:', event.state);
}
```

## Core Concepts

### State

State is a typed object passed through the graph:

```typescript
import { Annotation } from '@langchain/langgraph';

export const FeatureState = Annotation.Root({
  // Primitive fields
  repoPath: Annotation<string>,
  featureId: Annotation<string>,

  // Object fields
  repoAnalysis: Annotation<RepoAnalysis | null>,
  plan: Annotation<Plan | null>,

  // Array fields with reducers (append-only)
  requirements: Annotation<Requirement[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // Messages for conversation history
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});
```

**Reducers**: Define how array fields are updated. Without a reducer, arrays are replaced. With a reducer, updates are merged.

### Nodes

Nodes are async functions that:

1. Receive current state
2. Process/transform it
3. Return partial state updates

```typescript
export async function analyzeNode(state: FeatureStateType): Promise<Partial<FeatureStateType>> {
  // Do work
  const analysis = await analyzeRepository(state.repoPath);

  // Return partial update (only changed fields)
  return {
    repoAnalysis: analysis,
    currentPhase: SdlcLifecycle.Requirements,
  };
}
```

### Edges

**Direct edges**: Always go from A to B

```typescript
graph.addEdge('analyze', 'requirements');
```

**Conditional edges**: Choose destination based on state

```typescript
graph.addConditionalEdges('requirements', (state) => {
  if (allRequirementsClear(state)) {
    return 'plan';
  }
  return 'requirements'; // Loop back
});
```

### Tools

Tools give agents external capabilities:

```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const myTool = tool(
  async (input) => {
    // Tool implementation
    return result;
  },
  {
    name: 'my_tool',
    description: 'What this tool does',
    schema: z.object({
      param1: z.string().describe('First parameter'),
      param2: z.number().optional(),
    }),
  }
);
```

## Building a Graph

### Step 1: Define State

```typescript
// state.ts
import { Annotation } from '@langchain/langgraph';

export const MyWorkflowState = Annotation.Root({
  input: Annotation<string>,
  intermediate: Annotation<string | null>,
  output: Annotation<string | null>,
});
```

### Step 2: Create Nodes

```typescript
// nodes/process.node.ts
export async function processNode(state: MyWorkflowStateType) {
  const processed = await doSomething(state.input);
  return { intermediate: processed };
}

// nodes/finalize.node.ts
export async function finalizeNode(state: MyWorkflowStateType) {
  const output = await finalize(state.intermediate);
  return { output };
}
```

### Step 3: Build Graph

```typescript
// graphs/my-workflow.graph.ts
import { StateGraph, START, END } from '@langchain/langgraph';
import { MyWorkflowState } from '../state';
import { processNode, finalizeNode } from '../nodes';

export function createMyWorkflowGraph() {
  return new StateGraph(MyWorkflowState)
    .addNode('process', processNode)
    .addNode('finalize', finalizeNode)
    .addEdge(START, 'process')
    .addEdge('process', 'finalize')
    .addEdge('finalize', END)
    .compile();
}
```

## Using Tools in Nodes

### Binding Tools to Model

```typescript
import { ChatAnthropic } from '@langchain/anthropic';
import { contextQueryTool, fileSystemTool } from '../tools';

const model = new ChatAnthropic({
  modelName: 'claude-sonnet-4-20250514',
});

const modelWithTools = model.bindTools([contextQueryTool, fileSystemTool]);
```

### Tool-Using Node

```typescript
export async function researchNode(state: FeatureStateType) {
  const response = await modelWithTools.invoke([
    { role: 'system', content: 'Research the codebase for relevant context.' },
    { role: 'user', content: state.featureDescription },
  ]);

  // Model may have called tools - extract results
  const toolCalls = response.tool_calls || [];

  return {
    messages: [response],
    context: extractContext(toolCalls),
  };
}
```

## Patterns

### Looping Until Condition

```typescript
graph.addConditionalEdges('gather', (state) => {
  if (isComplete(state)) {
    return 'next_step';
  }
  return 'gather'; // Loop back
});
```

### Human-in-the-Loop

```typescript
import { interrupt } from '@langchain/langgraph';

export async function approvalNode(state: FeatureStateType) {
  // Pause execution and wait for human approval
  const approved = await interrupt({
    type: 'approval_required',
    data: state.plan,
  });

  if (!approved) {
    throw new Error('Plan rejected');
  }

  return { approved: true };
}
```

### Supervisor Pattern

For complex multi-agent orchestration:

```typescript
async function supervisorNode(state: SupervisorStateType) {
  const response = await model.invoke([
    { role: 'system', content: SUPERVISOR_PROMPT },
    ...state.messages,
  ]);

  const decision = parseDecision(response.content);

  return new Command({
    goto: decision.nextAgent,
    update: { messages: [response] },
  });
}

export function createSupervisorGraph() {
  return new StateGraph(SupervisorState)
    .addNode('supervisor', supervisorNode)
    .addNode('researcher', researcherNode)
    .addNode('planner', plannerNode)
    .addNode('executor', executorNode)
    .addEdge(START, 'supervisor')
    .addConditionalEdges('supervisor', (state) => state.nextAgent)
    .addEdge('researcher', 'supervisor')
    .addEdge('planner', 'supervisor')
    .addEdge('executor', 'supervisor')
    .compile();
}
```

### Parallel Execution

```typescript
// Run multiple nodes in parallel
graph.addNode('parallel_tasks', async (state) => {
  const [result1, result2, result3] = await Promise.all([task1(state), task2(state), task3(state)]);

  return {
    results: [result1, result2, result3],
  };
});
```

## Testing Agents

### Unit Testing Nodes

```typescript
// tests/unit/agents/nodes/analyze.node.test.ts
import { describe, it, expect, vi } from 'vitest';
import { analyzeNode } from '@/infrastructure/agents/langgraph/nodes/analyze.node';

describe('analyzeNode', () => {
  it('should analyze repository and update state', async () => {
    const state = {
      repoPath: '/test/repo',
      repoAnalysis: null,
      currentPhase: SdlcLifecycle.Requirements,
    };

    const result = await analyzeNode(state);

    expect(result.repoAnalysis).toBeDefined();
    expect(result.currentPhase).toBe(SdlcLifecycle.Requirements);
  });
});
```

### Integration Testing Graphs

```typescript
// tests/integration/agents/graphs/feature.graph.test.ts
import { describe, it, expect } from 'vitest';
import { createFeatureGraph } from '@/infrastructure/agents/langgraph/graphs/feature.graph';

describe('FeatureGraph', () => {
  it('should complete full workflow', async () => {
    const graph = createFeatureGraph();

    const result = await graph.invoke({
      repoPath: './test-fixtures/sample-repo',
      featureDescription: 'Add logging',
    });

    expect(result.requirements.length).toBeGreaterThan(0);
    expect(result.plan).toBeDefined();
    expect(result.tasks.length).toBeGreaterThan(0);
  });
});
```

## Debugging

### Enable Verbose Logging

```typescript
const graph = createFeatureGraph();

// Enable tracing
process.env.LANGCHAIN_TRACING_V2 = 'true';
process.env.LANGCHAIN_API_KEY = 'your-key';

const result = await graph.invoke(input, {
  callbacks: [new ConsoleCallbackHandler()],
});
```

### Inspect State at Each Step

```typescript
const stream = await graph.stream(input);

for await (const event of stream) {
  console.log('=== Node:', event.node, '===');
  console.log('State keys:', Object.keys(event.state));
  console.log('Messages:', event.state.messages?.length);
}
```

## Best Practices

### 1. Keep Nodes Focused

Each node should do one thing well:

```typescript
// Good: Single responsibility
export async function validateRequirementsNode(state) {
  const validation = validateRequirements(state.requirements);
  return { validationResult: validation };
}

// Bad: Too many responsibilities
export async function doEverythingNode(state) {
  const validated = validateRequirements(state.requirements);
  const plan = createPlan(validated);
  const tasks = breakdownTasks(plan);
  // ...
}
```

### 2. Use Conditional Edges for Branching

```typescript
// Good: Clear branching logic
graph.addConditionalEdges('validate', (state) => {
  if (state.validationResult.isValid) return 'plan';
  if (state.validationResult.needsClarification) return 'clarify';
  return 'error';
});
```

### 3. Handle Errors Gracefully

```typescript
export async function safeNode(state: FeatureStateType) {
  try {
    const result = await riskyOperation(state);
    return { result, error: null };
  } catch (error) {
    return {
      result: null,
      error: error.message,
      currentPhase: SdlcLifecycle.Error,
    };
  }
}
```

### 4. Type Everything

```typescript
// Define state type
export type FeatureStateType = typeof FeatureState.State;

// Use in nodes
export async function myNode(state: FeatureStateType): Promise<Partial<FeatureStateType>> {
  // TypeScript catches invalid state updates
}
```

---

## Maintaining This Document

**Update when:**

- LangGraph API changes
- New patterns are adopted
- New examples are added

**Related docs:**

- [AGENTS.md](../../AGENTS.md) - Agent reference
- [../architecture/agent-system.md](../architecture/agent-system.md) - Full architecture
- [../development/adding-agents.md](../development/adding-agents.md) - Adding new agents
