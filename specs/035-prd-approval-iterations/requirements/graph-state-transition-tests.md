# Graph State Transition Integration Tests

## Motivation

Unit tests mock away LangGraph internals (interrupt, checkpoint, resume), so they can't catch bugs in the actual state transition mechanics. Two bugs were found in the PRD approval iteration feature:

1. **Rejected phase not re-executing** - `executeNode` skipped re-execution because `completedPhases` still included the rejected phase
2. **Re-executed phase not interrupting again** - After re-execution, the `interrupt()` at the bottom consumed the pending resume value instead of suspending

Both bugs only manifest when the real LangGraph checkpoint/interrupt/resume cycle runs end-to-end. These tests exercise that cycle with a stubbed executor (no real AI calls).

## Test Architecture

### Setup

- **Real LangGraph graph** via `createFeatureAgentGraph()` with real `SqliteSaver` checkpointer (`:memory:` or temp file)
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

---

## Test Cases

### 1. Approve Flow: Requirements

**Scenario**: Requirements completes, interrupts, user approves, graph continues to research.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorTextColor': '#1A1A2E', 'actorBkg': '#E8F0FE', 'actorBorder': '#4285F4', 'actorLineColor': '#5F6368', 'signalColor': '#1A1A2E', 'signalTextColor': '#1A1A2E', 'labelBoxBkgColor': '#F8F9FA', 'labelBoxBorderColor': '#DADCE0', 'labelTextColor': '#5F6368', 'loopTextColor': '#5F6368', 'noteBkgColor': '#FFF3E0', 'noteBorderColor': '#F4A226', 'noteTextColor': '#1A1A2E', 'activationBkgColor': '#E8F0FE', 'activationBorderColor': '#4285F4', 'sequenceNumberColor': '#FFFFFF', 'fontFamily': 'Inter, system-ui, sans-serif'}}}%%

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
%%{init: {'theme': 'base', 'themeVariables': {'actorTextColor': '#1A1A2E', 'actorBkg': '#E8F0FE', 'actorBorder': '#4285F4', 'actorLineColor': '#5F6368', 'signalColor': '#1A1A2E', 'signalTextColor': '#1A1A2E', 'labelBoxBkgColor': '#F8F9FA', 'labelBoxBorderColor': '#DADCE0', 'labelTextColor': '#5F6368', 'loopTextColor': '#5F6368', 'noteBkgColor': '#FFF3E0', 'noteBorderColor': '#F4A226', 'noteTextColor': '#1A1A2E', 'activationBkgColor': '#E8F0FE', 'activationBorderColor': '#4285F4', 'sequenceNumberColor': '#FFFFFF', 'fontFamily': 'Inter, system-ui, sans-serif'}}}%%

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
%%{init: {'theme': 'base', 'themeVariables': {'actorTextColor': '#1A1A2E', 'actorBkg': '#E8F0FE', 'actorBorder': '#4285F4', 'actorLineColor': '#5F6368', 'signalColor': '#1A1A2E', 'signalTextColor': '#1A1A2E', 'labelBoxBkgColor': '#F8F9FA', 'labelBoxBorderColor': '#DADCE0', 'labelTextColor': '#5F6368', 'loopTextColor': '#5F6368', 'noteBkgColor': '#FFF3E0', 'noteBorderColor': '#F4A226', 'noteTextColor': '#1A1A2E', 'activationBkgColor': '#E8F0FE', 'activationBorderColor': '#4285F4', 'sequenceNumberColor': '#FFFFFF', 'fontFamily': 'Inter, system-ui, sans-serif'}}}%%

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
%%{init: {'theme': 'base', 'themeVariables': {'actorTextColor': '#1A1A2E', 'actorBkg': '#E8F0FE', 'actorBorder': '#4285F4', 'actorLineColor': '#5F6368', 'signalColor': '#1A1A2E', 'signalTextColor': '#1A1A2E', 'labelBoxBkgColor': '#F8F9FA', 'labelBoxBorderColor': '#DADCE0', 'labelTextColor': '#5F6368', 'loopTextColor': '#5F6368', 'noteBkgColor': '#FFF3E0', 'noteBorderColor': '#F4A226', 'noteTextColor': '#1A1A2E', 'activationBkgColor': '#E8F0FE', 'activationBorderColor': '#4285F4', 'sequenceNumberColor': '#FFFFFF', 'fontFamily': 'Inter, system-ui, sans-serif'}}}%%

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

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorTextColor': '#1A1A2E', 'actorBkg': '#E8F0FE', 'actorBorder': '#4285F4', 'actorLineColor': '#5F6368', 'signalColor': '#1A1A2E', 'signalTextColor': '#1A1A2E', 'labelBoxBkgColor': '#F8F9FA', 'labelBoxBorderColor': '#DADCE0', 'labelTextColor': '#5F6368', 'loopTextColor': '#5F6368', 'noteBkgColor': '#FFF3E0', 'noteBorderColor': '#F4A226', 'noteTextColor': '#1A1A2E', 'activationBkgColor': '#E8F0FE', 'activationBorderColor': '#4285F4', 'sequenceNumberColor': '#FFFFFF', 'fontFamily': 'Inter, system-ui, sans-serif'}}}%%

sequenceDiagram
    participant C as Caller
    participant G as LangGraph
    participant R as requirements
    participant RS as research
    participant P as plan
    participant I as implement

    rect rgba(232, 240, 254, 0.3)
        Note over C,I: Invoke #1 — Run to plan gate
        C->>G: invoke(state, gates: prd=T plan=F merge=T)
        G->>R: execute
        R-->>G: complete (no interrupt — allowPrd: true)
        G->>RS: execute
        RS-->>G: complete
        G->>P: execute
        P->>P: markPhaseComplete("plan")
        P--xG: interrupt() — allowPlan: false
        G-->>C: __interrupt__
    end

    rect rgba(232, 245, 233, 0.3)
        Note over C,I: Invoke #2 — Approve plan
        C->>G: resume({ approved: true })
        G->>P: re-enter — approved, skip
        G->>I: execute
        I--xG: interrupt() — always when gates present
        G-->>C: __interrupt__
    end
```

**Assertions**:

- Requirements does NOT interrupt (allowPrd: true)
- Plan DOES interrupt (allowPlan: false)
- Implement interrupts after plan is approved

---

### 6. Reject Flow: Plan Phase

**Scenario**: Plan rejected, re-executes, interrupts again.

**Gates**: `{ allowPrd: true, allowPlan: false, allowMerge: true }`

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorTextColor': '#1A1A2E', 'actorBkg': '#E8F0FE', 'actorBorder': '#4285F4', 'actorLineColor': '#5F6368', 'signalColor': '#1A1A2E', 'signalTextColor': '#1A1A2E', 'labelBoxBkgColor': '#F8F9FA', 'labelBoxBorderColor': '#DADCE0', 'labelTextColor': '#5F6368', 'loopTextColor': '#5F6368', 'noteBkgColor': '#FFF3E0', 'noteBorderColor': '#F4A226', 'noteTextColor': '#1A1A2E', 'activationBkgColor': '#E8F0FE', 'activationBorderColor': '#4285F4', 'sequenceNumberColor': '#FFFFFF', 'fontFamily': 'Inter, system-ui, sans-serif'}}}%%

sequenceDiagram
    participant C as Caller
    participant G as LangGraph
    participant RS as research
    participant P as plan
    participant I as implement

    rect rgba(232, 240, 254, 0.3)
        Note over C,I: Invoke #1 — Run to plan
        C->>G: invoke(state)
        Note over G,RS: analyze + requirements + research pass through
        G->>P: execute (call #1)
        P--xG: interrupt()
        G-->>C: __interrupt__
    end

    rect rgba(252, 232, 230, 0.3)
        Note over C,I: Invoke #2 — Reject plan
        C->>G: resume({ rejected, feedback })
        G->>P: re-enter
        P->>P: consume rejection, clear phase
        P->>P: execute (call #2)
        P--xG: interrupt()
        G-->>C: __interrupt__
    end

    rect rgba(232, 245, 233, 0.3)
        Note over C,I: Invoke #3 — Approve plan
        C->>G: resume({ approved: true })
        G->>P: re-enter — approved, skip
        G->>I: execute
        I--xG: interrupt()
    end
```

**Assertions**:

- Plan executor called twice
- Research NOT re-executed (only plan re-runs)

---

### 7. No Gates: No Interrupts

**Scenario**: Graph runs fully without any interrupts when `approvalGates` is undefined.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorTextColor': '#1A1A2E', 'actorBkg': '#E8F0FE', 'actorBorder': '#4285F4', 'actorLineColor': '#5F6368', 'signalColor': '#1A1A2E', 'signalTextColor': '#1A1A2E', 'labelBoxBkgColor': '#F8F9FA', 'labelBoxBorderColor': '#DADCE0', 'labelTextColor': '#5F6368', 'loopTextColor': '#5F6368', 'noteBkgColor': '#FFF3E0', 'noteBorderColor': '#F4A226', 'noteTextColor': '#1A1A2E', 'activationBkgColor': '#E8F0FE', 'activationBorderColor': '#4285F4', 'sequenceNumberColor': '#FFFFFF', 'fontFamily': 'Inter, system-ui, sans-serif'}}}%%

sequenceDiagram
    participant C as Caller
    participant G as LangGraph
    participant N as All Nodes

    rect rgba(232, 245, 233, 0.3)
        Note over C,N: Single Invoke — No Gates
        C->>G: invoke(state) — no approvalGates
        G->>N: analyze
        N-->>G: complete
        G->>N: requirements
        N-->>G: complete (no interrupt)
        G->>N: research
        N-->>G: complete
        G->>N: plan
        N-->>G: complete (no interrupt)
        G->>N: implement
        N-->>G: complete (no interrupt)
        G-->>C: result (no __interrupt__)
    end
```

**Assertions**:

- Result has no `__interrupt__`
- All nodes executed exactly once

---

### 8. All Gates Allowed: No Interrupts

**Scenario**: `{ allowPrd: true, allowPlan: true, allowMerge: true }` — fully autonomous.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorTextColor': '#1A1A2E', 'actorBkg': '#E8F0FE', 'actorBorder': '#4285F4', 'actorLineColor': '#5F6368', 'signalColor': '#1A1A2E', 'signalTextColor': '#1A1A2E', 'labelBoxBkgColor': '#F8F9FA', 'labelBoxBorderColor': '#DADCE0', 'labelTextColor': '#5F6368', 'loopTextColor': '#5F6368', 'noteBkgColor': '#FFF3E0', 'noteBorderColor': '#F4A226', 'noteTextColor': '#1A1A2E', 'activationBkgColor': '#E8F0FE', 'activationBorderColor': '#4285F4', 'sequenceNumberColor': '#FFFFFF', 'fontFamily': 'Inter, system-ui, sans-serif'}}}%%

sequenceDiagram
    participant C as Caller
    participant G as LangGraph
    participant N as All Nodes

    rect rgba(232, 245, 233, 0.3)
        Note over C,N: Single Invoke — All Gates True
        C->>G: invoke(state, gates: prd=T plan=T merge=T)
        G->>N: analyze -> requirements -> research -> plan -> implement
        Note over N: shouldInterrupt returns false for all nodes
        N-->>G: all complete
        G-->>C: result (no __interrupt__)
    end
```

**Assertions**: Same as test 7 — no interrupts anywhere.

---

### 9. Rejection Feedback Appears in Re-execution Prompt

**Scenario**: After rejection, the re-executed requirements node should receive the rejection feedback in its prompt (via `spec.yaml` `rejectionFeedback` entries).

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorTextColor': '#1A1A2E', 'actorBkg': '#E8F0FE', 'actorBorder': '#4285F4', 'actorLineColor': '#5F6368', 'signalColor': '#1A1A2E', 'signalTextColor': '#1A1A2E', 'labelBoxBkgColor': '#F8F9FA', 'labelBoxBorderColor': '#DADCE0', 'labelTextColor': '#5F6368', 'loopTextColor': '#5F6368', 'noteBkgColor': '#FFF3E0', 'noteBorderColor': '#F4A226', 'noteTextColor': '#1A1A2E', 'activationBkgColor': '#E8F0FE', 'activationBorderColor': '#4285F4', 'sequenceNumberColor': '#FFFFFF', 'fontFamily': 'Inter, system-ui, sans-serif'}}}%%

sequenceDiagram
    participant C as Caller
    participant G as LangGraph
    participant R as requirements
    participant SY as spec.yaml
    participant E as Executor

    rect rgba(232, 240, 254, 0.3)
        Note over C,E: Invoke #1 — Initial
        C->>G: invoke(initialState)
        G->>R: enter node
        R->>SY: buildPrompt reads spec.yaml
        Note over SY: No rejectionFeedback yet
        R->>E: execute(prompt #1)
        E-->>R: result
        R--xG: interrupt()
    end

    Note over C,SY: User rejects: "add help message question"
    C->>SY: append rejectionFeedback entry

    rect rgba(252, 232, 230, 0.3)
        Note over C,E: Invoke #2 — Reject + Re-execute
        C->>G: resume({ rejected, feedback })
        G->>R: re-enter
        R->>R: consume rejection, clear phase
        R->>SY: buildPrompt reads spec.yaml
        Note over SY: rejectionFeedback: ["add help message question"]
        R->>E: execute(prompt #2 — includes feedback!)
        E-->>R: result
        R--xG: interrupt()
    end
```

**Assertions**:

- Capture the prompt passed to executor on second call
- Prompt contains the rejection feedback text
- `spec.yaml` has `rejectionFeedback` array with the entry

---

### 10. Phase Timing: Iteration Suffix

**Scenario**: After rejection and re-execution, the phase timing records use iteration-aware names.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorTextColor': '#1A1A2E', 'actorBkg': '#E8F0FE', 'actorBorder': '#4285F4', 'actorLineColor': '#5F6368', 'signalColor': '#1A1A2E', 'signalTextColor': '#1A1A2E', 'labelBoxBkgColor': '#F8F9FA', 'labelBoxBorderColor': '#DADCE0', 'labelTextColor': '#5F6368', 'loopTextColor': '#5F6368', 'noteBkgColor': '#FFF3E0', 'noteBorderColor': '#F4A226', 'noteTextColor': '#1A1A2E', 'activationBkgColor': '#E8F0FE', 'activationBorderColor': '#4285F4', 'sequenceNumberColor': '#FFFFFF', 'fontFamily': 'Inter, system-ui, sans-serif'}}}%%

sequenceDiagram
    participant C as Caller
    participant G as LangGraph
    participant R as requirements
    participant T as PhaseTiming

    rect rgba(232, 240, 254, 0.3)
        Note over C,T: Invoke #1 — Initial
        C->>G: invoke(initialState)
        G->>R: execute
        R->>T: recordPhaseStart("requirements")
        Note over T: phase = "requirements"
        R->>T: recordPhaseEnd(timing, duration)
        R--xG: interrupt()
    end

    rect rgba(252, 232, 230, 0.3)
        Note over C,T: Invoke #2 — Reject
        C->>G: resume({ rejected, feedback })
        G->>R: re-execute
        R->>T: recordPhaseStart("requirements")
        Note over T: resolveIterationPhase -> "requirements:2"
        R->>T: recordPhaseEnd(timing, duration)
        R--xG: interrupt()
    end

    rect rgba(232, 245, 233, 0.3)
        Note over C,T: Invoke #3 — Second Reject
        C->>G: resume({ rejected, feedback })
        G->>R: re-execute
        R->>T: recordPhaseStart("requirements")
        Note over T: resolveIterationPhase -> "requirements:3"
        R->>T: recordPhaseEnd(timing, duration)
        R--xG: interrupt()
    end
```

**Assertions**:

- First execution: phase name "requirements"
- After rejection + re-execution: phase name "requirements:2"
- Third iteration: phase name "requirements:3"

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

---

## Implementation Notes

### Stubbed Executor

```typescript
class StubExecutor implements IAgentExecutor {
  callCount = 0;
  prompts: string[] = [];

  async execute(prompt: string, options: AgentExecutionOptions): Promise<AgentExecutionResult> {
    this.callCount++;
    this.prompts.push(prompt);
    return { result: `stub result #${this.callCount}`, exitCode: 0 };
  }
}
```

### Temp Spec Directory

Each test creates a temp directory with:

- `feature.yaml` — minimal valid structure with `status: { completedPhases: [] }`
- `spec.yaml` — minimal valid structure for the requirements prompt to read

### Graph Config

```typescript
const checkpointer = createCheckpointer(':memory:');
const graph = createFeatureAgentGraph({ executor: stubExecutor }, checkpointer);
const config = { configurable: { thread_id: `test-${randomUUID()}` } };
```

### Mocking Concerns

- **Phase timing context**: Mock or stub `setPhaseTimingContext` to avoid DB dependency
- **Lifecycle context**: Mock or stub `setLifecycleContext`
- **Heartbeat**: Mock or stub `setHeartbeatContext`
- All other graph mechanics (interrupt, checkpoint, state) should be real

### File Location

```
tests/integration/graph-state-transitions.test.ts
```
