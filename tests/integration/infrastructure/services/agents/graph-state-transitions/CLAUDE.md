# Graph State Transition Tests — Guide

## What This Suite Tests

End-to-end LangGraph interrupt/checkpoint/resume cycles using the **real feature-agent graph** with a stubbed executor (no AI calls). These tests catch bugs that unit tests miss because they mock away LangGraph internals.

## Architecture at a Glance

```
Real LangGraph graph + Real SQLite checkpointer + Stub executor + Real feature.yaml on disk
```

- **Graph**: `createFeatureAgentGraph()` from production code
- **Checkpointer**: In-memory SQLite (`:memory:`) — real checkpoint/resume behavior
- **Executor**: `StubExecutor` records `callCount` and `prompts[]`, returns canned results
- **File I/O**: Real `feature.yaml` in a temp dir — tests `completedPhases` read/write
- **Isolation**: Each test gets a unique `thread_id` so checkpoints don't leak

## File Structure

| File                          | Purpose                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| `setup.ts`                    | `createTestContext()` — creates graph, executor, temp dir, cleanup     |
| `fixtures.ts`                 | Valid YAML strings for spec, research, plan, tasks                     |
| `helpers.ts`                  | `getInterrupts()`, `approveCommand()`, `rejectCommand()`, gate presets |
| `approve-flow.test.ts`        | Approval paths — node skips re-execution on resume                     |
| `reject-flow.test.ts`         | Rejection iteration — re-execute, re-interrupt cycles                  |
| `gate-configuration.test.ts`  | `ApprovalGates` combinations — which nodes interrupt                   |
| `feedback-and-timing.test.ts` | Rejection feedback in prompts, timing iteration names                  |
| `README.md`                   | Full specification with Mermaid diagrams                               |

## How to Run

```bash
# Run all graph state transition tests
pnpm test:single tests/integration/infrastructure/services/agents/graph-state-transitions/

# Run a specific file
pnpm test:single tests/integration/infrastructure/services/agents/graph-state-transitions/approve-flow.test.ts

# Watch mode for TDD
pnpm test:watch -- tests/integration/infrastructure/services/agents/graph-state-transitions/
```

## How to Add a New Test

### 1. Decide which file it belongs in

- **Approval path** (node skips re-execution) → `approve-flow.test.ts`
- **Rejection iteration** (re-execute + re-interrupt) → `reject-flow.test.ts`
- **Gate combinations** (which nodes interrupt) → `gate-configuration.test.ts`
- **Feedback/timing/prompt content** → `feedback-and-timing.test.ts`
- **New category** → create a new `<category>.test.ts` file

### 2. Write the test

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestContext, type TestContext } from './setup.js';
import { expectInterruptAt, approveCommand, ALL_GATES_DISABLED } from './helpers.js';

describe('Graph State Transitions › Your Category', () => {
  let ctx: TestContext;
  let output: { restore: () => void };

  beforeAll(() => {
    ctx = createTestContext();
    ctx.init();
    output = ctx.suppressOutput();
  });

  beforeEach(() => {
    ctx.reset(); // Fresh executor + feature.yaml each test
  });

  afterAll(() => {
    output.restore();
    ctx.cleanup();
  });

  it('should do something', async () => {
    const config = ctx.newConfig(); // Unique thread_id
    const state = ctx.initialState(ALL_GATES_DISABLED);

    const result = await ctx.graph.invoke(state, config);
    expectInterruptAt(result, 'requirements');

    // Resume with approval/rejection
    const r2 = await ctx.graph.invoke(approveCommand(), config);
    // ... assertions
  });
});
```

### 3. Key patterns

- **`ctx.reset()`** in `beforeEach` — creates fresh executor + graph + resets `feature.yaml`
- **`ctx.newConfig()`** — unique `thread_id` per test for checkpoint isolation
- **`ctx.initialState(gates?)`** — builds the initial state object
- **`approveCommand()` / `rejectCommand(feedback)`** — LangGraph `Command` wrappers
- **`expectInterruptAt(result, 'nodeName')`** — asserts exactly one interrupt at that node
- **`expectNoInterrupts(result)`** — asserts graph ran to completion

## How to Add a New Interruptible Node

When a new node gets interrupt support:

1. Add it to `shouldInterrupt()` in `node-helpers.ts` (production code)
2. Add a gate field to `ApprovalGates` type if needed
3. Add gate presets in `helpers.ts` (e.g., `NEW_NODE_ALLOWED`)
4. Add approve and reject tests in the appropriate test files
5. Update `gate-configuration.test.ts` with new gate combinations

## How to Add New Fixtures

Edit `fixtures.ts` to add new YAML strings. Follow the naming pattern:

```typescript
export const VALID_<FILENAME>_YAML = `...`;       // Passes validation
export const INVALID_<FILENAME>_YAML = `...`;      // Fails validation (for repair tests)
export const <VARIANT>_<FILENAME>_YAML = `...`;    // Special variant
```

## Key Concepts

### The Interrupt/Resume Cycle

```
graph.invoke(initialState)     → runs until interrupt() → returns __interrupt__
graph.invoke(approveCommand()) → resumes, node detects completedPhases, skips re-exec
graph.invoke(rejectCommand())  → resumes, node detects rejection, clears phase, re-executes
```

### Why `completedPhases` Matters

`executeNode()` checks `feature.yaml` `completedPhases` at the top:

- **Phase found + approval** → skip execution, continue to next node
- **Phase found + rejection** → clear phase, fall through to re-execute
- **Phase not found** → first execution, run normally

### The Double-Interrupt Bug (KNOWN ISSUE)

`executeNode()` uses TWO `interrupt()` calls:

1. **Top interrupt** (index 0) — on re-entry, detects approval vs rejection
2. **Bottom interrupt** (index 1) — after execution, pauses for human review

**Single rejection works correctly:**

- Invoke #1: Bottom interrupt (index 0 in execution) suspends
- Invoke #2 (reject): Top interrupt gets resume → clears phase → re-executes → bottom interrupt suspends

**Second consecutive rejection FAILS:**

- LangGraph replays interrupt index 0 with the STALE value from the previous execution
- The actual resume value goes to interrupt index 1 (bottom), which returns without suspending
- Result: node re-executes but graph continues to next phase instead of re-interrupting

**After reject-then-approve:**

- The approve also triggers a stale rejection replay at index 0, causing one extra re-execution
- The approve is consumed at index 1, and the graph continues (correct outcome, extra exec call)

**Fix needed:** Refactor `executeNode` to use a single `interrupt()` per execution path.
Options:

- Use `Command({update: {approvalResponse}})` to pass approval/rejection through state
- Restructure as separate approval node (LangGraph recommended pattern)
- Use a loop with single interrupt per iteration
