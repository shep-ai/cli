# Research: LangChain Agent Infrastructure

> Technical analysis for 009-langchain-agent-infra

## Status

- **Phase:** Complete
- **Updated:** 2026-02-08

## Technology Decisions

### 1. Agent Orchestration Framework

**Options considered:**

1. **@langchain/langgraph StateGraph** — Graph-based workflow with typed state, conditional edges, checkpointing, retry policies
2. **Custom async state machine** — Hand-rolled state transitions with async/await
3. **Temporal.io TypeScript SDK** — Durable workflow engine with activity retry, but requires a Temporal server

**Decision:** `@langchain/langgraph` StateGraph

**Rationale:** LangGraph provides typed state schemas (via Zod), node-based workflow decomposition, built-in checkpointing for crash-resume, per-node retry policies, conditional routing via `Command`, and streaming. It's purpose-built for LLM agent workflows and has a mature TypeScript API. A custom state machine would require rebuilding all of this. Temporal requires an external server which violates our CLI-tool constraint.

### 2. LLM Execution — Agent-Agnostic Executor (Strategy Pattern)

**Options considered:**

1. **Agent-agnostic `IAgentExecutor` port** with per-agent implementations resolved from `Settings.agent.type` — Strategy pattern
2. **Hardcoded Claude Code CLI subprocess** — Single-agent support only
3. **`@langchain/anthropic` (ChatAnthropic)** — Direct Anthropic API via LangChain, skipping CLI tools
4. **Direct SDKs per agent** — Raw API calls without abstraction layer

**Decision:** Agent-agnostic `IAgentExecutor` port with `IAgentExecutorFactory` resolver

**Rationale:** This is the critical architecture decision. The LLM execution layer is **driven by `Settings.agent.type`** (the `AgentType` enum: `claude-code`, `gemini-cli`, `aider`, etc.). Each configured agent gets its own `IAgentExecutor` implementation. The factory resolves the correct executor at runtime based on settings.

Key principles:

- **Agent-agnostic** — LangGraph nodes call `IAgentExecutor.execute()`, never a specific agent's CLI. The configured agent is transparent to the orchestration layer.
- **Settings-driven** — `Settings.agent.type` determines which executor implementation is resolved. Users configure their agent via `shep settings agent`, and the system respects that choice.
- **Extensible** — Adding a new agent (e.g., Gemini CLI) means implementing `IAgentExecutor` + registering in the factory. Zero changes to LangGraph nodes, use cases, or CLI commands.
- **Clean Architecture** — Application layer depends on `IAgentExecutor` port. Infrastructure layer provides concrete implementations. Factory is in infrastructure, registered in DI.

**Why NOT hardcoded Claude Code:** Violates agent-agnostic principle. The existing `AgentType` enum already supports 5 agents. Hardcoding one creates tech debt.

**Why NOT @langchain/anthropic:** Bypasses the agent CLI's built-in tools, session management, and auth. Each agent CLI (Claude Code, Gemini CLI) has capabilities we want to leverage, not replace.

**Implementation pattern:**

```typescript
// === Application Layer (ports) ===

// Generic result from any agent execution
interface AgentExecutionResult {
  result: string;
  sessionId?: string; // For agents that support session continuity
  usage?: { inputTokens: number; outputTokens: number };
  metadata?: Record<string, unknown>; // Agent-specific metadata
}

// Generic streaming event
interface AgentExecutionStreamEvent {
  type: 'progress' | 'result' | 'error';
  content: string;
  timestamp: Date;
}

// Core port — agent-agnostic executor
interface IAgentExecutor {
  readonly agentType: AgentType;
  execute(prompt: string, options?: AgentExecutionOptions): Promise<AgentExecutionResult>;
  executeStream(
    prompt: string,
    options?: AgentExecutionOptions
  ): AsyncIterable<AgentExecutionStreamEvent>;
  supportsFeature(feature: AgentFeature): boolean;
}

// Agent capabilities — not all agents support all features
type AgentFeature =
  | 'session-resume'
  | 'streaming'
  | 'tool-scoping'
  | 'structured-output'
  | 'system-prompt';

// Execution options — generic, agents ignore unsupported options gracefully
interface AgentExecutionOptions {
  cwd?: string;
  allowedTools?: string[]; // Agents that support tool scoping
  resumeSession?: string; // Agents that support session continuity
  maxTurns?: number;
  model?: string;
  systemPrompt?: string;
  outputSchema?: object; // Agents that support structured output
  timeout?: number; // Per-execution timeout (ms)
}

// Factory port — resolves the correct executor based on settings
interface IAgentExecutorFactory {
  createExecutor(agentType: AgentType, authConfig: AgentConfig): IAgentExecutor;
  getSupportedAgents(): AgentType[];
}
```

```typescript
// === Infrastructure Layer (concrete implementations) ===

// Claude Code CLI executor (first implementation)
class ClaudeCodeExecutorService implements IAgentExecutor {
  readonly agentType = AgentType.ClaudeCode;

  async execute(prompt: string, options?: AgentExecutionOptions): Promise<AgentExecutionResult> {
    // spawn('claude', ['-p', prompt, '--output-format', 'json', ...])
    // Maps generic options to Claude Code CLI flags:
    //   resumeSession → --resume <session-id>
    //   allowedTools → --allowedTools "Read,Write,..."
    //   model → --model <model>
    //   systemPrompt → --append-system-prompt <text>
    //   outputSchema → --json-schema <schema>
  }

  supportsFeature(feature: AgentFeature): boolean {
    // Claude Code supports all features
    return ['session-resume', 'streaming', 'tool-scoping', 'structured-output', 'system-prompt'].includes(feature);
  }
}

// Future: Gemini CLI executor
class GeminiCliExecutorService implements IAgentExecutor {
  readonly agentType = AgentType.GeminiCli;
  // spawn('gemini', [...]) with Gemini-specific flag mapping
}

// Factory resolves from settings
class AgentExecutorFactory implements IAgentExecutorFactory {
  private readonly executors = new Map<AgentType, () => IAgentExecutor>();

  constructor() {
    this.executors.set(AgentType.ClaudeCode, () => new ClaudeCodeExecutorService(...));
    // Register new agents here
  }

  createExecutor(agentType: AgentType, authConfig: AgentConfig): IAgentExecutor {
    const factory = this.executors.get(agentType);
    if (!factory) throw new Error(`No executor for agent type: ${agentType}`);
    return factory();
  }
}
```

**Agent-specific CLI flag mappings (Phase 1: Claude Code):**

| Generic Option  | Claude Code CLI Flag                | Gemini CLI (future) |
| --------------- | ----------------------------------- | ------------------- |
| `cwd`           | `--cwd <path>` (or spawn cwd)       | `--cwd`             |
| `allowedTools`  | `--allowedTools "Read,Write,..."`   | TBD                 |
| `resumeSession` | `--resume <session-id>`             | N/A                 |
| `model`         | `--model <name>`                    | `--model <name>`    |
| `systemPrompt`  | `--append-system-prompt <text>`     | TBD                 |
| `outputSchema`  | `--json-schema <schema>`            | TBD                 |
| Output format   | `--output-format json\|stream-json` | TBD                 |

### 3. State Definition Approach

**Options considered:**

1. **Annotation API** — Original LangGraph state definition (`Annotation.Root({...})`)
2. **Zod Schema API** — Newer pattern using `z.object({...}).register(registry, MessagesZodMeta)`

**Decision:** Zod Schema API

**Rationale:** The Zod approach is the newer recommended pattern, provides runtime validation, integrates with our existing validation patterns, and enables schema reuse across the codebase. Our project already depends on Zod indirectly through TypeSpec tooling, and it aligns with the TypeSpec-first domain model philosophy.

### 4. Checkpointing / State Persistence

**Options considered:**

1. **`@langchain/langgraph-checkpoint-sqlite`** (SqliteSaver) — SQLite-backed checkpointing using `better-sqlite3`
2. **`MemorySaver`** — In-memory only (development/testing)
3. **Custom SQLite checkpoint implementation** — Hand-rolled checkpoint tables

**Decision:** `@langchain/langgraph-checkpoint-sqlite` (SqliteSaver) for production, `MemorySaver` for tests

**Rationale:** SqliteSaver uses `better-sqlite3` — the same driver already in our dependency tree. It provides automatic checkpointing at every graph super-step, enabling crash-resume and time-travel debugging. The checkpoint tables live in the repo-level SQLite database (`~/.shep/repos/<encoded-path>/data`). MemorySaver is used in unit/integration tests for fast, isolated execution.

**Compatibility note:** `@langchain/langgraph-checkpoint-sqlite` depends on `better-sqlite3@^11.7.0`. Our project uses `^12.6.2`. We need to verify compatibility. If incompatible, we can use `MemorySaver` initially and implement a thin custom SqliteSaver adapter using our existing `better-sqlite3` connection.

### 5. Task/Job Management System

**Options considered:**

1. **LangGraph checkpoints + thin SQLite job metadata table** — LangGraph handles workflow state; a supplementary `agent_runs` table tracks metadata (status, timestamps, duration)
2. **Custom SQLite job queue (full)** — Build complete job runner with state machine, retry, etc.
3. **liteque / workmatic** — Third-party SQLite job queue libraries
4. **BullMQ** — Redis-backed job queue (requires external service)

**Decision:** LangGraph checkpoints + thin SQLite `agent_runs` table (Phase 1: foreground only)

**Rationale:** LangGraph's checkpoint system already provides the "save state, crash, resume" pattern. Each graph invocation with a `thread_id` IS a job. Adding a thin `agent_runs` table stores user-facing metadata (job ID, agent name, status, start/end times, error messages) and an `agent_run_events` table provides an append-only observability log. BullMQ requires Redis (disqualified for CLI). Third-party SQLite queues add dependencies for functionality LangGraph provides natively.

**Database scope:** The `agent_runs` table lives in the **global database** (`~/.shep/data`), NOT the per-repo database. Reasoning: (1) simpler — reuses the existing single DB connection from `initializeContainer()`, (2) enables cross-repo agent run history, (3) agent_runs stores the repo path in the prompt context. LangGraph checkpoints are stored in a **separate** per-repo SQLite file at `~/.shep/repos/<encoded-path>/checkpoints.db` (managed by SqliteSaver, outside our migration system).

**Phase 2 (future):** Background execution via `child_process.fork()` with detached mode.

### 6. Agent Registry Pattern

**Options considered:**

1. **Map-based registry with DI** — `Map<string, AgentDefinition>` registered in the DI container
2. **File-convention based** — Auto-discover agents from `infrastructure/services/agents/graphs/*.graph.ts`
3. **Decorator-based** — `@Agent('analyze-repository')` decorator on graph factory functions

**Decision:** Map-based registry with DI

**Rationale:** Explicit registration via a `IAgentRegistry` port interface keeps the Clean Architecture dependency rule intact. The infrastructure layer registers concrete agents, the application layer depends only on the interface. This is consistent with existing patterns (ISettingsRepository, IAgentValidator).

### 7. CLI Command Structure

**Options considered:**

1. **`shep run <agent-name>`** — Dedicated `run` command group for agent execution
2. **`shep agent run <agent-name>`** — Nested under existing `agent` concept
3. **`shep <agent-name>`** — Top-level shorthand

**Decision:** `shep run <agent-name>` with `shep status` and `shep logs <run-id>` companion commands

**Rationale:** `shep run` is the natural verb for "execute an agent task." It parallels Docker's `docker run` and npm's `npm run`. Companion commands `shep status` (list runs, show progress) and `shep logs <run-id>` (stream events from a run) provide observability. The `run` command accepts `--background` for future Phase 2 background execution.

## Library Analysis

| Library                                  | Version | Purpose                       | Pros                                                                  | Cons                                      |
| ---------------------------------------- | ------- | ----------------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| `@langchain/langgraph`                   | latest  | StateGraph workflow engine    | Type-safe state, checkpointing, retry, streaming, conditional routing | New dependency, learning curve            |
| `@langchain/core`                        | latest  | Base LangChain abstractions   | Messages, runnables — required by langgraph                           | Transitive dep of langgraph               |
| `@langchain/langgraph-checkpoint-sqlite` | latest  | SQLite checkpoint persistence | Uses better-sqlite3, automatic state persistence                      | May need better-sqlite3 version alignment |
| `zod`                                    | ^3.x    | Schema validation             | State definition, tool schemas, input validation                      | New direct dep (indirect via TypeSpec)    |
| Agent CLI (configured)                   | system  | LLM execution (subprocess)    | Per-agent session auth, built-in tools, streaming                     | External binary dependency                |

**NOT needed:** `uuid` — Use Node.js built-in `crypto.randomUUID()` (available since Node 19+). The existing codebase does not use the `uuid` package.

**NOT needed:** `@langchain/anthropic` — Agent CLIs handle LLM calls internally. We orchestrate agents, not bypass them. The active agent is resolved from `Settings.agent.type`.

## Architecture Overview

```
src/
├── domain/
│   └── generated/          # New types from TypeSpec: AgentRun, AgentRunEvent, AgentRunStatus
│
├── application/
│   ├── ports/output/
│   │   ├── agent-registry.interface.ts        # IAgentRegistry: getAgent(), listAgents()
│   │   ├── agent-runner.interface.ts          # IAgentRunner: run(), getStatus(), getEvents()
│   │   ├── agent-run-repository.interface.ts  # IAgentRunRepository: CRUD for runs
│   │   ├── agent-executor.interface.ts        # IAgentExecutor: execute(), executeStream() (agent-agnostic)
│   │   └── agent-executor-factory.interface.ts # IAgentExecutorFactory: createExecutor(agentType)
│   └── use-cases/agents/
│       ├── run-agent.use-case.ts              # Orchestrates: resolve agent → create run → execute graph
│       └── get-agent-status.use-case.ts       # Query run status and events
│
├── infrastructure/
│   ├── services/agents/
│   │   ├── langgraph/
│   │   │   ├── state/                         # Zod state schemas
│   │   │   ├── nodes/                         # Node functions (call IAgentExecutor — agent-agnostic)
│   │   │   └── graphs/                        # Compiled StateGraph definitions
│   │   │       └── analyze-repository.graph.ts
│   │   ├── executors/                         # IAgentExecutor implementations (one per agent type)
│   │   │   ├── claude-code-executor.service.ts  # ClaudeCode: spawn('claude', ['-p', ...])
│   │   │   └── gemini-cli-executor.service.ts   # Future: spawn('gemini', [...])
│   │   ├── agent-executor-factory.service.ts  # IAgentExecutorFactory impl (resolves from Settings.agent.type)
│   │   ├── agent-registry.service.ts          # Concrete IAgentRegistry implementation
│   │   └── agent-runner.service.ts            # Concrete IAgentRunner (wraps graph invocation)
│   ├── repositories/
│   │   └── sqlite-agent-run.repository.ts     # SQLite IAgentRunRepository
│   └── persistence/sqlite/migrations/
│       └── 003_create_agent_runs.sql          # agent_runs + agent_run_events tables
│
├── presentation/cli/commands/
│   ├── run.command.ts                         # shep run <agent-name> [--background]
│   ├── status.command.ts                      # shep status [run-id]
│   └── logs.command.ts                        # shep logs <run-id>
│
└── tsp/agents/
    ├── agent-run.tsp                          # AgentRun, AgentRunStatus, AgentRunEvent models
    └── agent-definition.tsp                   # AgentDefinition model
```

### Data Flow

```
shep run analyze-repository
  → CLI parses command, resolves RunAgentUseCase from DI
  → RunAgentUseCase:
      1. Load Settings.agent → { type: 'claude-code', authMethod: 'session' }
      2. IAgentExecutorFactory.createExecutor(settings.agent.type, settings.agent) → IAgentExecutor
         (Factory resolves ClaudeCodeExecutorService for 'claude-code', GeminiCliExecutorService for 'gemini-cli', etc.)
      3. IAgentRegistry.getAgent('analyze-repository') → AgentDefinition
      4. IAgentRunRepository.create(run) → persists new AgentRun (status: running)
      5. IAgentRunner.run(agent, executor, input, config) → invokes LangGraph StateGraph
         Each node in the graph:
           a. Crafts a prompt with context from graph state
           b. Calls executor.execute(prompt, { resumeSession, allowedTools: [...] })
              → For Claude Code: spawns `claude -p "..." --output-format json --resume <id>`
              → For Gemini CLI: spawns `gemini ...` with Gemini-specific flags
              → Node code is agent-agnostic — same code works with any configured agent
           c. Parses AgentExecutionResult, extracts result
           d. Returns partial state update to LangGraph
         - LangGraph checkpoints state at each node transition
         - AgentRunEvents appended to agent_run_events table
         - Node updates streamed to stdout (foreground)
      6. Final node writes shep-analysis.md to CWD
      7. On success: IAgentRunRepository.update(run, status: completed)
      8. On failure: IAgentRunRepository.update(run, status: failed, error)
```

### Agent Execution Detail (analyze-repository example)

```
LangGraph StateGraph (orchestrator) → calls IAgentExecutor (agent-agnostic)
  │
  ├── Node: "scan-structure"
  │     prompt: "List all source directories and key files in this repo. Return as JSON."
  │     → executor.execute(prompt, { allowedTools: ['Read','Glob','Grep'] })
  │     → AgentExecutionResult { result: "{dirs:[...], files:[...]}", sessionId: "abc123" }
  │     → state.structure = parsed result, state.sessionId = "abc123"
  │
  ├── Node: "analyze-deps"
  │     prompt: "Analyze the dependency tree and technology stack."
  │     → executor.execute(prompt, { resumeSession: state.sessionId })
  │     → state.dependencies = parsed result
  │
  ├── Node: "detect-patterns"
  │     prompt: "Identify architecture patterns, conventions, and code organization."
  │     → executor.execute(prompt, { resumeSession: state.sessionId })
  │     → state.patterns = parsed result
  │
  └── Node: "generate-report"
        prompt: "Generate a comprehensive shep-analysis.md document."
        → executor.execute(prompt, { resumeSession: state.sessionId, allowedTools: ['Read','Write'] })
        → writes shep-analysis.md to CWD
        → state.reportPath = "./shep-analysis.md"
```

**Key insight:** Node code never references a specific agent CLI. Options like `resumeSession` and `allowedTools` are generic — if the configured agent doesn't support them (checked via `executor.supportsFeature()`), they are gracefully ignored. Agents that support session continuity (e.g., Claude Code's `--resume`) get multi-step context for free. Agents that don't will receive accumulated context embedded in each prompt as a fallback.

**Fallback strategy for agents without session-resume:**

```
If executor.supportsFeature('session-resume') === false:
  → Each node embeds previous state results in the prompt prefix
  → "Previous analysis context: { structure: ..., dependencies: ... }"
  → Slightly less efficient but functionally equivalent
```

## Crash Recovery Protocol

### How LangGraph Checkpointing Handles Crashes

LangGraph checkpoints state at **node boundaries** — after each node completes, before the next starts. This is the unit of recovery.

| Crash Timing             | What's Saved            | Recovery Behavior             |
| ------------------------ | ----------------------- | ----------------------------- |
| Between node A and B     | State after A completes | Resume skips A, starts at B   |
| During node B execution  | State after A completes | Resume re-runs B from scratch |
| After all nodes complete | Full final state        | No recovery needed            |

### Orphan Detection

On any `shep run` invocation, the CLI checks the `agent_runs` table for runs with `status = 'running'` whose PID is no longer alive (or that have been running longer than a configurable timeout). This is the **orphan check**.

```
shep run analyze-repository
  → Check agent_runs for orphaned runs in this repo
  → If found:
      ⚠ Found interrupted run [run-id] from 2 hours ago (completed 2/4 nodes).
      Resume? [Y/n]
      → Y: invoke graph with same thread_id → LangGraph loads checkpoint → skips completed nodes
      → n: mark as 'failed', start fresh run
```

### Implementation Details

1. **PID tracking**: `agent_runs` table stores the process PID. On orphan check, verify with `process.kill(pid, 0)` (signal 0 checks existence without killing).
2. **Heartbeat**: The agent runner updates `agent_runs.last_heartbeat` every 30 seconds during execution. Runs with no heartbeat for > 2 minutes are considered crashed.
3. **Session recovery**: The agent `session_id` is stored in the LangGraph state. On resume, subsequent nodes continue the same session via `resumeSession` option (for agents that support it, e.g., Claude Code's `--resume`). If the session is expired/invalid, the node falls back to starting a new session with the accumulated state context embedded in the prompt. Agents without session support always use the fallback strategy.
4. **Status distinction**: `interrupted` vs `cancelled` vs `failed`:
   - `interrupted` = crashed/orphaned process detected via stale PID or heartbeat timeout. **Recoverable** via checkpoint resume.
   - `cancelled` = user explicitly cancelled the run (future: via `shep cancel <run-id>`). **Not recoverable** — user chose to stop.
   - `failed` = agent execution hit an unrecoverable error (e.g., auth failure, invalid prompt). **Not recoverable** without fixing the cause.
5. **`shep status`**: Shows all runs including interrupted ones. Crashed runs display as `interrupted`, signaling they are recoverable.
6. **Automatic notification**: When the user runs any `shep` command in a repo with interrupted runs, a one-line notice appears: `⚠ 1 interrupted agent run. Use 'shep status' for details.`

### agent_runs Table Schema (crash-relevant fields)

```sql
CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL,
  thread_id TEXT NOT NULL,         -- LangGraph thread_id for checkpoint lookup
  status TEXT NOT NULL,            -- pending | running | completed | failed | interrupted | cancelled
  pid INTEGER,                     -- OS process ID for orphan detection
  last_heartbeat TEXT,             -- ISO timestamp, updated every 30s
  agent_type TEXT NOT NULL,        -- AgentType enum value used for this run
  session_id TEXT,                 -- Agent session ID for resume (agent-specific, nullable)
  completed_nodes INTEGER DEFAULT 0,
  total_nodes INTEGER,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL
);
```

## Security Considerations

- **Auth is agent-specific**: Each `IAgentExecutor` implementation handles authentication per its agent type. Claude Code uses session auth (zero API key). Gemini CLI may use `gcloud` auth. Token-based agents receive tokens via environment variables in the subprocess (never CLI args, never logged).
- **Token-based auth fallback**: If `Settings.agent.authMethod === 'token'`, the token from `Settings.agent.token` is passed via the appropriate environment variable to the subprocess (e.g., `ANTHROPIC_API_KEY` for Claude Code). Token stored in `~/.shep/data` SQLite with 0700 directory permissions.
- **Subprocess isolation**: Each agent invocation runs in a separate child process. Crashes in the agent CLI do not crash the Shep CLI. This holds for all agent implementations.
- **Tool scoping**: For agents that support it (checked via `supportsFeature('tool-scoping')`), tools are restricted per node. Analysis nodes get read-only tools. Report nodes get read/write. Agents without tool scoping run with their default permissions.
- **Checkpoint Data**: LangGraph checkpoints contain graph state (analysis results, session IDs). Stored in repo-level SQLite database. No raw LLM conversation history in checkpoints — that stays in the agent's own session storage.

## Performance Implications

- **Subprocess overhead**: Each agent invocation spawns a subprocess (~200-500ms startup). For a 4-node graph, this adds ~1-2 seconds total — negligible compared to LLM API latency (seconds per call). Overhead is consistent across agent types.
- **Session resume**: Agents supporting `session-resume` avoid re-sending full context. Without it, the fallback embeds previous state in each prompt (slightly more tokens, same correctness).
- **Checkpoint I/O**: SqliteSaver writes to SQLite at each node transition. With WAL mode configured, writes are fast. For a 4-node graph, 4 checkpoint writes per run — negligible.
- **Memory**: LangGraph state is lightweight (JSON strings from agent results). Agent memory footprint is in its subprocess. Expected Shep process memory: < 20MB.
- **Streaming**: Agents supporting streaming enable real-time display during each node execution. Non-streaming agents show progress updates between nodes.
- **Parallelism (future)**: Nodes without dependencies could invoke the agent in parallel (separate sessions). LangGraph supports fan-out/fan-in edges for this.

## Extensibility Guide

### Adding a New Agent Executor (e.g., Gemini CLI)

To add support for a new agent type, implement the `IAgentExecutor` interface and register it in the factory. **Zero changes** required in LangGraph nodes, use cases, or CLI commands.

**Step-by-step:**

1. **Add AgentType enum value** (if not already in TypeSpec)

   - `tsp/common/enums/agent-type.tsp` — add the new enum value
   - `pnpm tsp:compile` to regenerate `output.ts`

2. **Create executor service** in `src/infrastructure/services/agents/executors/`

   ```typescript
   // gemini-cli-executor.service.ts
   export class GeminiCliExecutorService implements IAgentExecutor {
     readonly agentType = AgentType.GeminiCli;

     async execute(prompt: string, options?: AgentExecutionOptions): Promise<AgentExecutionResult> {
       // Map generic options to Gemini CLI flags
       const args = this.buildArgs(prompt, options);
       const result = await this.spawn('gemini', args, options?.cwd);
       return this.parseResult(result);
     }

     supportsFeature(feature: AgentFeature): boolean {
       // Declare what Gemini CLI supports
       return ['streaming', 'system-prompt'].includes(feature);
       // Note: 'session-resume' not supported — nodes use fallback context embedding
     }
   }
   ```

3. **Register in factory** — `agent-executor-factory.service.ts`

   ```typescript
   this.executors.set(
     AgentType.GeminiCli,
     (auth) => new GeminiCliExecutorService(auth, this.execFn)
   );
   ```

4. **Update agent validator** — `agent-validator.service.ts` `AGENT_BINARY_MAP`

   ```typescript
   'gemini-cli': 'gemini',
   ```

5. **Write tests** (TDD — red/green/refactor)
   - Unit test: mock `spawn`, verify flag mapping
   - Integration test: verify feature declarations match actual CLI capabilities

**That's it.** The LangGraph nodes call `executor.execute()` generically. The factory resolves the right implementation. Users switch agents via `shep settings agent --agent gemini-cli`.

### Adding a New LangGraph Agent (e.g., `analyze-security`)

To add a new agent workflow (a new graph the user can trigger with `shep run <name>`):

1. **Define graph state** in `src/infrastructure/services/agents/langgraph/state/`

   ```typescript
   // security-analysis.state.ts
   export const SecurityAnalysisState = z.object({
     repoPath: z.string(),
     vulnerabilities: z.array(VulnerabilitySchema).default([]),
     report: z.string().optional(),
     sessionId: z.string().optional(),
   });
   ```

2. **Create node functions** in `src/infrastructure/services/agents/langgraph/nodes/`

   - Each node receives `IAgentExecutor` via closure/injection
   - Craft prompts, call `executor.execute()`, return state updates

   ```typescript
   export function createScanDepsNode(executor: IAgentExecutor) {
     return async (state: SecurityAnalysisStateType) => {
       const result = await executor.execute(
         'Scan package.json and lock files for known vulnerabilities...',
         { resumeSession: state.sessionId, allowedTools: ['Read', 'Glob'] }
       );
       return { vulnerabilities: parseVulnerabilities(result.result), sessionId: result.sessionId };
     };
   }
   ```

3. **Build graph** in `src/infrastructure/services/agents/langgraph/graphs/`

   ```typescript
   export function createSecurityAnalysisGraph(
     executor: IAgentExecutor,
     checkpointer: BaseCheckpointSaver
   ) {
     return new StateGraph(SecurityAnalysisState)
       .addNode('scan-deps', createScanDepsNode(executor))
       .addNode('scan-code', createScanCodeNode(executor))
       .addNode('generate-report', createReportNode(executor))
       .addEdge(START, 'scan-deps')
       .addEdge('scan-deps', 'scan-code')
       .addEdge('scan-code', 'generate-report')
       .addEdge('generate-report', END)
       .compile({ checkpointer });
   }
   ```

4. **Register in agent registry** — `agent-registry.service.ts`

   ```typescript
   this.agents.set('analyze-security', {
     name: 'analyze-security',
     description: 'Scan repository for security vulnerabilities',
     graphFactory: createSecurityAnalysisGraph,
   });
   ```

5. **Done** — `shep run analyze-security` works immediately. No CLI changes needed.

### Architecture Diagram: Extension Points

```
Settings.agent.type ──→ IAgentExecutorFactory ──→ IAgentExecutor (per-agent impl)
                                                       ↑
                                                  Used by all LangGraph nodes
                                                  (agent-agnostic)
                                                       ↑
IAgentRegistry ──→ AgentDefinition.graphFactory ──→ StateGraph (per-workflow)
                                                       ↑
                                                  Triggered by:
                                                  shep run <agent-name>
```

**Two independent extension axes:**

1. **New agent types** → Implement `IAgentExecutor` + register in factory
2. **New agent workflows** → Create StateGraph + register in `IAgentRegistry`

These are orthogonal: any workflow runs on any configured agent.

## Open Questions

All questions resolved.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
