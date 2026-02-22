# Graph State Transition Integration Tests

## Motivation

Unit tests mock away LangGraph internals (interrupt, checkpoint, resume), so they can't catch bugs in the actual state transition mechanics. Two bugs were found in the PRD approval iteration feature:

1. **Rejected phase not re-executing** - `executeNode` skipped re-execution because `completedPhases` still included the rejected phase
2. **Re-executed phase not interrupting again** - After re-execution, the `interrupt()` at the bottom consumed the pending resume value instead of suspending

Both bugs only manifest when the real LangGraph checkpoint/interrupt/resume cycle runs end-to-end. These tests exercise that cycle with a stubbed executor (no real AI calls).

## Test Architecture

### Setup

- **Real LangGraph graph** via `createFeatureAgentGraph()` with real `SqliteSaver` checkpointer (`:memory:`)
- **Stubbed executor** implementing `IAgentExecutor` — returns canned results, no AI calls
- **Real `feature.yaml`** on disk in a temp directory — tests actual `completedPhases` read/write
- **Real `spec.yaml`** on disk — tests `buildPrompt` reads rejection feedback
- Each test uses a unique `thread_id` for checkpoint isolation

### Graph Structure Reference

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#E8F0FE', 'primaryBorderColor': '#4285F4', 'primaryTextColor': '#1A1A2E', 'lineColor': '#5F6368', 'secondaryColor': '#FFF3E0', 'tertiaryColor': '#E8F5E9', 'fontFamily': 'Inter, system-ui, sans-serif'}}}%%

graph LR
    S((Start)):::startEnd --> A[analyze]:::producer
    A --> VA[validate_spec_analyze]:::validator
    VA --> R[requirements]:::interruptible
    R --> VR[validate_spec_requirements]:::validator
    VR --> RS[research]:::producer
    RS --> VRS[validate_research]:::validator
    VRS --> P[plan]:::interruptible
    P --> VP[validate_plan_tasks]:::validator
    VP --> I[implement]:::interruptible
    I --> M[merge]:::interruptible
    M --> E((End)):::startEnd

    classDef startEnd fill:#F8F9FA,stroke:#5F6368,stroke-width:2px,color:#1A1A2E
    classDef producer fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#1A1A2E
    classDef interruptible fill:#FFF3E0,stroke:#F4A226,stroke-width:2px,color:#1A1A2E
    classDef validator fill:#E8F5E9,stroke:#34A853,stroke-width:1px,color:#1A1A2E
```

**Legend**:

- Blue nodes: Producer nodes (execute agent, no interrupt)
- Orange nodes: Interruptible nodes (gated by `ApprovalGates`)
- Green nodes: Validation nodes (schema checks)

Interrupt-capable nodes (controlled by `ApprovalGates`):

- `requirements` — gated by `allowPrd`
- `plan` — gated by `allowPlan`
- `merge` — gated by `allowMerge`
- `implement` — always interrupts when gates present

## Directory Structure

```
graph-state-transitions/
├── README.md              # This file — full specification with diagrams
├── CLAUDE.md              # Instructions for AI agents extending these tests
├── setup.ts               # Test context factory (graph, executor, temp dirs)
├── fixtures.ts            # Valid YAML fixtures for spec, research, plan, tasks
├── helpers.ts             # Shared utilities (interrupt helpers, resume commands)
├── approve-flow.test.ts   # Approval path tests (Tests 1, 5)
├── reject-flow.test.ts    # Rejection iteration tests (Tests 2, 3, 4, 6)
├── gate-configuration.test.ts  # ApprovalGates combination tests (Tests 7, 8)
└── feedback-and-timing.test.ts # Feedback propagation and timing tests (Tests 9, 10)
```

## Test Cases

### 1. Approve Flow: Requirements

**Scenario**: Requirements completes, interrupts, user approves, graph continues to research.

```mermaid
sequenceDiagram
    participant C as Caller
    participant G as LangGraph
    participant A as analyze
    participant R as requirements
    participant RS as research

    rect rgba(232, 240, 254, 0.3)
        Note over C,RS: Invoke #1 — Initial Run
        C->>G: graph.invoke(initialState)
        G->>A: execute
        A-->>G: complete
        G->>R: execute
        R->>R: markPhaseComplete("requirements")
        R--xG: interrupt() — suspends
        G-->>C: result.__interrupt__ present
    end

    rect rgba(232, 245, 233, 0.3)
        Note over C,RS: Invoke #2 — Approve
        C->>G: Command({ resume: { approved: true } })
        G->>R: re-enter node
        R->>R: completedPhases has "requirements"
        R->>R: interrupt() returns { approved: true }
        R-->>G: skip execution — approved
        G->>RS: execute
        RS-->>G: complete
    end
```

**Assertions**:

- First invoke returns `__interrupt__` with node "requirements"
- `feature.yaml` `completedPhases` includes "requirements"
- Second invoke progresses past requirements to research
- Executor was called for requirements exactly once (not re-executed on resume)

---

### 2. Reject Flow: Requirements Re-executes and Interrupts Again

**Scenario**: Requirements completes, interrupts, user rejects, requirements re-executes and interrupts for re-approval.

```mermaid
sequenceDiagram
    participant C as Caller
    participant G as LangGraph
    participant R as requirements
    participant FY as feature.yaml

    rect rgba(232, 240, 254, 0.3)
        Note over C,FY: Invoke #1 — Initial Run
        C->>G: graph.invoke(initialState)
        G->>R: execute (call #1)
        R->>FY: markPhaseComplete("requirements")
        R--xG: interrupt() — suspends
        G-->>C: __interrupt__
    end

    rect rgba(252, 232, 230, 0.3)
        Note over C,FY: Invoke #2 — Reject
        C->>G: Command({ resume: { rejected: true, feedback: "add X" } })
        G->>R: re-enter node
        R->>FY: read completedPhases — has "requirements"
        R->>R: interrupt() returns rejection payload
        R->>FY: clearCompletedPhase("requirements")
        Note over R: Falls through to re-execute
        R->>R: execute (call #2)
        R->>FY: markPhaseComplete("requirements")
        R--xG: interrupt() — suspends (no resume value left)
        G-->>C: __interrupt__ (again!)
    end
```

**Assertions**:

- First invoke: `__interrupt__` present
- Second invoke (rejection): `__interrupt__` present again (not progressed to research)
- Executor called twice total for requirements (once per iteration)
- `feature.yaml` `completedPhases` includes "requirements" after second interrupt

---

### 3. Reject Then Approve: Full Iteration Cycle

**Scenario**: Requirements rejected once, then approved on second attempt.

```mermaid
sequenceDiagram
    participant C as Caller
    participant G as LangGraph
    participant R as requirements
    participant RS as research

    rect rgba(232, 240, 254, 0.3)
        Note over C,RS: Invoke #1 — Initial
        C->>G: invoke(initialState)
        G->>R: execute (call #1)
        R--xG: interrupt()
        G-->>C: __interrupt__
    end

    rect rgba(252, 232, 230, 0.3)
        Note over C,RS: Invoke #2 — Reject
        C->>G: resume({ rejected: true, feedback })
        G->>R: re-enter
        R->>R: consume rejection, clear phase
        R->>R: execute (call #2)
        R--xG: interrupt()
        G-->>C: __interrupt__
    end

    rect rgba(232, 245, 233, 0.3)
        Note over C,RS: Invoke #3 — Approve
        C->>G: resume({ approved: true })
        G->>R: re-enter
        R-->>G: approved — skip
        G->>RS: execute
        RS-->>G: complete
        Note over G,RS: Continues downstream...
    end
```

**Assertions**:

- Three separate invoke calls
- Executor called for requirements exactly twice
- After invoke #3, research node executes
- `completedPhases` includes both "requirements" and "research" (or wherever it stops)

---

### 4. Multiple Rejections: Iteration Count

**Scenario**: Requirements rejected 3 times, then approved.

```mermaid
sequenceDiagram
    participant C as Caller
    participant G as LangGraph
    participant R as requirements
    participant RS as research

    rect rgba(232, 240, 254, 0.3)
        Note over C,R: Invoke #1 — Initial
        C->>G: invoke(initialState)
        G->>R: execute (call #1)
        R--xG: interrupt()
    end

    rect rgba(252, 232, 230, 0.3)
        Note over C,R: Invoke #2 — Reject (iteration 1)
        C->>G: resume({ rejected, feedback: "fix A" })
        R->>R: clear + re-execute (call #2)
        R--xG: interrupt()
    end

    rect rgba(252, 232, 230, 0.3)
        Note over C,R: Invoke #3 — Reject (iteration 2)
        C->>G: resume({ rejected, feedback: "fix B" })
        R->>R: clear + re-execute (call #3)
        R--xG: interrupt()
    end

    rect rgba(252, 232, 230, 0.3)
        Note over C,R: Invoke #4 — Reject (iteration 3)
        C->>G: resume({ rejected, feedback: "fix C" })
        R->>R: clear + re-execute (call #4)
        R--xG: interrupt()
    end

    rect rgba(232, 245, 233, 0.3)
        Note over C,RS: Invoke #5 — Approve
        C->>G: resume({ approved: true })
        R-->>G: skip — approved
        G->>RS: execute
    end
```

**Assertions**:

- Executor called for requirements exactly 4 times
- Each rejection triggers a new interrupt
- Final approval skips re-execution and proceeds

---

### 5. Approve Flow: Plan Phase

**Scenario**: Same as test 1 but for the plan node (validates gates work for all interruptible nodes).

**Gates**: `{ allowPrd: true, allowPlan: false, allowMerge: true }`

**Assertions**:

- Requirements does NOT interrupt (allowPrd: true)
- Plan DOES interrupt (allowPlan: false)
- Implement interrupts after plan is approved

---

### 6. Reject Flow: Plan Phase

**Scenario**: Plan rejected, re-executes, interrupts again.

**Gates**: `{ allowPrd: true, allowPlan: false, allowMerge: true }`

**Assertions**:

- Plan executor called twice
- Research NOT re-executed (only plan re-runs)

---

### 7. No Gates: No Interrupts

**Scenario**: Graph runs fully without any interrupts when `approvalGates` is undefined.

**Assertions**: No `__interrupt__`, all nodes executed exactly once.

---

### 8. All Gates Allowed: No Interrupts

**Scenario**: `{ allowPrd: true, allowPlan: true, allowMerge: true }` — fully autonomous.

**Assertions**: Same as test 7 — no interrupts anywhere.

---

### 9. Rejection Feedback Appears in Re-execution Prompt

**Scenario**: After rejection, the re-executed requirements node should receive the rejection feedback in its prompt (via `spec.yaml` `rejectionFeedback` entries).

**Assertions**:

- Capture the prompt passed to executor on second call
- Prompt contains the rejection feedback text
- `spec.yaml` has `rejectionFeedback` array with the entry

---

### 10. Phase Timing: Iteration Suffix

**Scenario**: After rejection and re-execution, the phase timing records use iteration-aware names.

**Assertions**:

- First execution: phase name "requirements"
- After rejection + re-execution: phase name "requirements:2"
- Third iteration: phase name "requirements:3"

---

## Known Issues

### Double-Interrupt Replay Bug

`executeNode()` uses two `interrupt()` calls: one at the top (to detect approval/rejection on re-entry) and one at the bottom (to pause after execution). LangGraph tracks interrupts by their call index within the function.

**Impact:**

1. **Multiple consecutive rejections don't work.** On the 2nd rejection, LangGraph replays interrupt index 0 with the stale 1st rejection value. The actual 2nd rejection value is consumed by interrupt index 1 (bottom) which returns without suspending. The graph continues past the node instead of re-interrupting.

2. **Reject-then-approve causes an extra re-execution.** On approve after a rejection, the stale rejection is replayed at interrupt index 0, causing the node to clear its phase and re-execute once more. The actual approval is consumed at index 1, and the graph continues correctly — but with one unnecessary executor call.

**Affected tests:**

- `reject-flow.test.ts` — "consecutive rejections" test documents the broken behavior
- `reject-flow.test.ts` — "reject then approve" has adjusted call count (6 instead of expected 5)
- `feedback-and-timing.test.ts` — call count tracking reflects the extra re-execution

**Fix required in:** `executeNode()` in `node-helpers.ts` — refactor to use a single `interrupt()` per execution path. See `CLAUDE.md` in this directory for fix options.

---

## Color Legend

| Color                                  | Meaning                       |
| -------------------------------------- | ----------------------------- |
| Blue background `rgba(232, 240, 254)`  | Initial / standard invoke     |
| Red background `rgba(252, 232, 230)`   | Rejection / re-execution path |
| Green background `rgba(232, 245, 233)` | Approval / success path       |
| Orange node border `#F4A226`           | Interruptible node            |
| Blue node fill `#E8F0FE`               | Standard producer node        |
| Green node fill `#E8F5E9`              | Validation node               |

## Implementation Notes

### Stubbed Executor

```typescript
// Created via createStubExecutor() from setup.ts
const executor: StubExecutor = {
  callCount: number;       // Total execute() calls
  prompts: string[];       // Prompts received in order
  execute: Mock;           // The vi.fn() mock
};
```

### Temp Spec Directory

Each test suite creates a temp directory with:

- `feature.yaml` — minimal valid structure with `status: { completedPhases: [] }`
- `spec.yaml` — minimal valid structure for the requirements prompt to read
- `research.yaml`, `plan.yaml`, `tasks.yaml` — pass validation nodes

### Mocking Concerns

- **Phase timing context**: Not set → `recordPhaseStart/End` are no-ops
- **Lifecycle context**: Not set → `updateNodeLifecycle` is no-op
- **Heartbeat**: Not set → `reportNodeStart` is no-op
- All other graph mechanics (interrupt, checkpoint, state) are real
