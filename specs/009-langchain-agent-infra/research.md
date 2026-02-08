# Research: LangChain Agent Infrastructure

> Technical analysis for 009-langchain-agent-infra

## Status

- **Phase:** Research
- **Updated:** 2026-02-08

## Technology Decisions

### 1. Agent Orchestration Framework

**Options considered:**

1. **@langchain/langgraph StateGraph** — Graph-based workflow with typed state, conditional edges, checkpointing, retry policies
2. **Custom async state machine** — Hand-rolled state transitions with async/await
3. **Temporal.io TypeScript SDK** — Durable workflow engine with activity retry, but requires a Temporal server

**Decision:** `@langchain/langgraph` StateGraph

**Rationale:** LangGraph provides typed state schemas (via Zod), node-based workflow decomposition, built-in checkpointing for crash-resume, per-node retry policies, conditional routing via `Command`, and streaming. It's purpose-built for LLM agent workflows and has a mature TypeScript API. A custom state machine would require rebuilding all of this. Temporal requires an external server which violates our CLI-tool constraint.

### 2. LLM Execution — Claude Code CLI Subprocess

**Options considered:**

1. **Claude Code CLI subprocess** (`child_process.spawn('claude', ['-p', ...])`) — Wraps the installed `claude` binary, uses user's existing session auth
2. **`@anthropic-ai/claude-agent-sdk`** — Official TypeScript SDK, requires `ANTHROPIC_API_KEY`
3. **`@langchain/anthropic` (ChatAnthropic)** — Direct Anthropic API via LangChain
4. **Direct Anthropic SDK** (`@anthropic-ai/sdk`) — Raw API calls without LangChain

**Decision:** Claude Code CLI subprocess wrapper

**Rationale:** This is the critical architecture decision. We wrap the `claude` CLI binary that the user has already configured via `shep settings agent`. Key advantages:

- **Zero API key requirement** — Uses the user's existing Claude Code session auth (configured via `shep settings agent --auth session`)
- **Claude Code handles all tools internally** — File reading, code execution, grep, glob are all built into Claude Code. We don't need to implement LangGraph tools.
- **Proven agent capabilities** — Claude Code is a battle-tested coding agent. We orchestrate it, not replace it.
- **JSON output** — `--output-format json` returns structured `{ result, session_id, usage }` responses
- **Session continuity** — `--resume <session-id>` enables multi-step workflows where each node builds on the previous context
- **Streaming** — `--output-format stream-json` enables real-time progress display
- **Already validated** — `AgentValidatorService` already checks `claude --version` availability

**Why NOT the Agent SDK:** Requires `ANTHROPIC_API_KEY` which contradicts the existing session-auth model. The subprocess approach works with the auth the user already has.

**Why NOT @langchain/anthropic:** This would bypass Claude Code entirely and call the API directly. We'd lose Claude Code's built-in tools, CLAUDE.md loading, and session management. The user explicitly wants to leverage Claude Code's capabilities.

**Implementation pattern:**

```typescript
// IClaudeCodeExecutor port interface
interface ClaudeCodeResult {
  result: string;
  sessionId: string;
  usage?: { input_tokens: number; output_tokens: number };
}

interface IClaudeCodeExecutor {
  execute(prompt: string, options?: ClaudeCodeOptions): Promise<ClaudeCodeResult>;
  executeStream(prompt: string, options?: ClaudeCodeOptions): AsyncIterable<ClaudeCodeStreamEvent>;
}

interface ClaudeCodeOptions {
  cwd?: string;
  allowedTools?: string[];
  outputFormat?: 'json' | 'stream-json';
  resumeSession?: string; // --resume <session-id>
  maxTurns?: number; // --max-turns
  model?: string; // --model
  systemPrompt?: string; // --append-system-prompt
  jsonSchema?: object; // --json-schema (structured output)
}
```

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
| `zod`                                    | ^3.x    | Schema validation             | State definition, tool schemas, input validation                      | Already indirect dep                      |
| Claude Code CLI (`claude`)               | system  | LLM execution (subprocess)    | Session auth, built-in tools, streaming, JSON output                  | External binary dependency                |

**NOT needed:** `@langchain/anthropic` — Claude Code CLI handles LLM calls internally. We orchestrate Claude Code, not bypass it.

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
│   │   └── claude-code-executor.interface.ts  # IClaudeCodeExecutor: execute(), executeStream()
│   └── use-cases/agents/
│       ├── run-agent.use-case.ts              # Orchestrates: resolve agent → create run → execute graph
│       └── get-agent-status.use-case.ts       # Query run status and events
│
├── infrastructure/
│   ├── services/agents/
│   │   ├── langgraph/
│   │   │   ├── state/                         # Zod state schemas
│   │   │   ├── nodes/                         # Node functions (each delegates to Claude Code CLI)
│   │   │   └── graphs/                        # Compiled StateGraph definitions
│   │   │       └── analyze-repository.graph.ts
│   │   ├── claude-code-executor.service.ts    # IClaudeCodeExecutor impl (child_process.spawn)
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
      1. IAgentRegistry.getAgent('analyze-repository') → AgentDefinition
      2. IAgentRunRepository.create(run) → persists new AgentRun (status: running)
      3. IAgentRunner.run(agent, input, config) → invokes LangGraph StateGraph
         Each node in the graph:
           a. Crafts a prompt with context from graph state
           b. Calls IClaudeCodeExecutor.execute(prompt, { resumeSession, allowedTools: ['Read','Glob','Grep'] })
           c. Spawns: claude -p "<prompt>" --output-format json --resume <session-id>
           d. Parses JSON response, extracts result
           e. Returns partial state update to LangGraph
         - LangGraph checkpoints state at each node transition
         - AgentRunEvents appended to agent_run_events table
         - Node updates streamed to stdout (foreground)
      4. Final node writes shep-analysis.md to CWD
      5. On success: IAgentRunRepository.update(run, status: completed)
      6. On failure: IAgentRunRepository.update(run, status: failed, error)
```

### Claude Code CLI Integration Detail

```
LangGraph StateGraph (orchestrator)
  │
  ├── Node: "scan-structure"
  │     prompt: "List all source directories and key files in this repo. Return as JSON."
  │     → claude -p "..." --output-format json --allowed-tools "Read,Glob,Grep"
  │     → { result: "{ dirs: [...], files: [...] }", session_id: "abc123" }
  │     → state.structure = parsed result, state.sessionId = "abc123"
  │
  ├── Node: "analyze-deps"
  │     prompt: "Analyze the dependency tree and technology stack."
  │     → claude -p "..." --output-format json --resume abc123
  │     → state.dependencies = parsed result
  │
  ├── Node: "detect-patterns"
  │     prompt: "Identify architecture patterns, conventions, and code organization."
  │     → claude -p "..." --output-format json --resume abc123
  │     → state.patterns = parsed result
  │
  └── Node: "generate-report"
        prompt: "Generate a comprehensive shep-analysis.md document."
        → claude -p "..." --resume abc123 --allowed-tools "Read,Write"
        → writes shep-analysis.md to CWD
        → state.reportPath = "./shep-analysis.md"
```

**Key insight:** Claude Code CLI maintains conversation context via `--resume <session-id>`. Each subsequent node in the graph continues the same Claude Code session, so it has full context from previous analysis steps without re-sending all data. This is efficient and maintains coherence across the multi-step workflow.

## Security Considerations

- **No API Key Required**: The subprocess approach uses Claude Code's existing session auth. No API keys are stored, transmitted, or logged by Shep. The user authenticates once via `claude` login, and all subsequent invocations use that session.
- **Token-based auth fallback**: If `Settings.agent.authMethod === 'token'`, the token from `Settings.agent.token` is passed via `ANTHROPIC_API_KEY` environment variable to the subprocess. Token stored in `~/.shep/data` SQLite with 0700 directory permissions.
- **Subprocess isolation**: Each Claude Code invocation runs in a separate child process. Crashes in Claude Code do not crash the Shep CLI.
- **Tool scoping**: Claude Code is invoked with `--allowedTools` to restrict capabilities per node. Analysis nodes get `Read,Glob,Grep` only. The report generation node gets `Read,Write`. No node gets `Bash` by default.
- **Checkpoint Data**: LangGraph checkpoints contain graph state (analysis results, session IDs). Stored in repo-level SQLite database. No raw LLM conversation history in checkpoints — that stays in Claude Code's own session storage.

## Performance Implications

- **Subprocess overhead**: Each Claude Code invocation spawns a new Node.js process (~200-500ms startup). For a 4-node graph, this adds ~1-2 seconds total — negligible compared to LLM API latency (seconds per call).
- **Session resume**: Using `--resume` avoids re-sending full context. Claude Code reloads its conversation from its own session storage. This is faster than re-embedding all previous results in each prompt.
- **Checkpoint I/O**: SqliteSaver writes to SQLite at each node transition. With WAL mode configured, writes are fast. For a 4-node graph, 4 checkpoint writes per run — negligible.
- **Memory**: LangGraph state is lightweight (JSON strings from Claude Code results). Claude Code's own memory footprint is in its subprocess. Expected Shep process memory: < 20MB.
- **Streaming**: `--output-format stream-json` enables real-time display of Claude Code's thinking/output in the terminal during each node execution.
- **Parallelism (future)**: Nodes without dependencies could invoke Claude Code in parallel (separate sessions). LangGraph supports fan-out/fan-in edges for this.

## Open Questions

All questions resolved.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
