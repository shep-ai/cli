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

**Rationale:** LangGraph is the planned architecture per AGENTS.md and provides exactly what we need: typed state schemas (via Zod), node-based workflow decomposition, built-in checkpointing for crash-resume, per-node retry policies, conditional routing via `Command`, and streaming. It's purpose-built for LLM agent workflows and has a mature TypeScript API. A custom state machine would require rebuilding all of this. Temporal requires an external server which violates our CLI-tool constraint.

### 2. State Definition Approach

**Options considered:**

1. **Annotation API** — Original LangGraph state definition (`Annotation.Root({...})`)
2. **Zod Schema API** — Newer pattern using `z.object({...}).register(registry, MessagesZodMeta)`

**Decision:** Zod Schema API

**Rationale:** The Zod approach is the newer recommended pattern, provides runtime validation, integrates with our existing validation patterns, and enables schema reuse across the codebase. The `MessagesZodMeta` integration handles message append/update semantics automatically. Our project already depends on Zod indirectly through TypeSpec tooling, and it aligns with the TypeSpec-first domain model philosophy.

### 3. LLM Provider Integration

**Options considered:**

1. **@langchain/anthropic (ChatAnthropic)** — Direct Claude integration via LangChain
2. **@langchain/openai** — OpenAI-compatible provider
3. **Direct Anthropic SDK** — `@anthropic-ai/sdk` without LangChain wrapper

**Decision:** `@langchain/anthropic` (ChatAnthropic)

**Rationale:** Provides seamless integration with LangGraph's tool binding, message types, and streaming. The existing `Settings.agent` configuration stores agent type and auth credentials that map directly to ChatAnthropic constructor params. Using the direct Anthropic SDK would require manual tool-call loop management that LangGraph already handles.

### 4. Checkpointing / State Persistence

**Options considered:**

1. **`@langchain/langgraph-checkpoint-sqlite`** (SqliteSaver) — SQLite-backed checkpointing using `better-sqlite3`
2. **`MemorySaver`** — In-memory only (development/testing)
3. **Custom SQLite checkpoint implementation** — Hand-rolled checkpoint tables

**Decision:** `@langchain/langgraph-checkpoint-sqlite` (SqliteSaver) for production, `MemorySaver` for tests

**Rationale:** SqliteSaver uses `better-sqlite3` — the same driver already in our dependency tree. It provides automatic checkpointing at every graph super-step, enabling crash-resume and time-travel debugging. The checkpoint tables live in the repo-level SQLite database (`~/.shep/repos/<encoded-path>/data`). MemorySaver is used in unit/integration tests for fast, isolated execution.

**Compatibility note:** `@langchain/langgraph-checkpoint-sqlite` depends on `better-sqlite3@^11.7.0`. Our project uses `^12.6.2`. The `^11.7.0` range may not include v12. We need to verify that the checkpoint package works with v12, or pin to a compatible version. If not compatible, we can use `MemorySaver` initially and contribute/fork a v12-compatible checkpoint package.

### 5. Task/Job Management System

**Options considered:**

1. **LangGraph checkpoints + thin SQLite job metadata table** — LangGraph handles workflow state; a supplementary `agent_runs` table tracks metadata (status, timestamps, duration)
2. **Custom SQLite job queue (full)** — Build complete job runner with state machine, retry, etc.
3. **liteque / workmatic** — Third-party SQLite job queue libraries
4. **BullMQ** — Redis-backed job queue (requires external service)

**Decision:** LangGraph checkpoints + thin SQLite `agent_runs` table (Phase 1: foreground only)

**Rationale:** LangGraph's checkpoint system already provides exactly the "save state, crash, resume" pattern. Each graph invocation with a `thread_id` IS a job. Adding a thin `agent_runs` table on top stores user-facing metadata (job ID, agent name, status, start/end times, error messages) and an `agent_run_events` table provides an append-only observability log. This avoids duplicating state management that LangGraph already handles. BullMQ requires Redis (disqualified for CLI). Third-party SQLite queues add dependencies for functionality LangGraph provides natively.

**Phase 2 (future):** Background execution via `child_process.fork()` with detached mode. The forked worker loads the LangGraph graph, reads the checkpoint, and resumes. PID stored in `agent_runs` table.

### 6. Agent Registry Pattern

**Options considered:**

1. **Map-based registry with DI** — `Map<string, AgentDefinition>` registered in the DI container
2. **File-convention based** — Auto-discover agents from `infrastructure/services/agents/graphs/*.graph.ts`
3. **Decorator-based** — `@Agent('analyze-repository')` decorator on graph factory functions

**Decision:** Map-based registry with DI

**Rationale:** Explicit registration via a `IAgentRegistry` port interface keeps the Clean Architecture dependency rule intact. The infrastructure layer registers concrete agents, the application layer depends only on the interface. This is consistent with existing patterns (ISettingsRepository, IAgentValidator). Auto-discovery adds magic; decorators add complexity without clear benefit at this scale.

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
| `@langchain/core`                        | latest  | Base LLM abstractions         | Tools, messages, prompts, runnables — required by langgraph           | Transitive dep of langgraph               |
| `@langchain/anthropic`                   | latest  | Claude model integration      | ChatAnthropic with tool binding, streaming                            | Requires ANTHROPIC_API_KEY                |
| `@langchain/langgraph-checkpoint-sqlite` | latest  | SQLite checkpoint persistence | Uses better-sqlite3, automatic state persistence                      | May need better-sqlite3 version alignment |
| `zod`                                    | ^3.x    | Schema validation             | State definition, tool schemas, input validation                      | Already indirect dep                      |

## Architecture Overview

```
src/
├── domain/
│   └── generated/          # New types from TypeSpec: AgentRun, AgentRunEvent, AgentRunStatus
│
├── application/
│   ├── ports/output/
│   │   ├── agent-registry.interface.ts    # IAgentRegistry: getAgent(), listAgents()
│   │   ├── agent-runner.interface.ts      # IAgentRunner: run(), getStatus(), getEvents()
│   │   └── agent-run-repository.interface.ts  # IAgentRunRepository: CRUD for runs
│   └── use-cases/agents/
│       ├── run-agent.use-case.ts          # Orchestrates: resolve agent → create run → execute graph
│       └── get-agent-status.use-case.ts   # Query run status and events
│
├── infrastructure/
│   ├── services/agents/
│   │   ├── langgraph/
│   │   │   ├── state/                     # Zod state schemas
│   │   │   ├── nodes/                     # Node functions (analyze, etc.)
│   │   │   ├── tools/                     # LangGraph tools (file_system, context_query)
│   │   │   └── graphs/                    # Compiled StateGraph definitions
│   │   │       └── analyze-repository.graph.ts
│   │   ├── agent-registry.service.ts      # Concrete IAgentRegistry implementation
│   │   └── agent-runner.service.ts        # Concrete IAgentRunner (wraps graph invocation)
│   ├── repositories/
│   │   └── sqlite-agent-run.repository.ts # SQLite IAgentRunRepository
│   └── persistence/sqlite/migrations/
│       └── 003_create_agent_runs.sql      # agent_runs + agent_run_events tables
│
├── presentation/cli/commands/
│   ├── run.command.ts                     # shep run <agent-name> [--background]
│   ├── status.command.ts                  # shep status [run-id]
│   └── logs.command.ts                    # shep logs <run-id>
│
└── tsp/agents/
    ├── agent-run.tsp                      # AgentRun, AgentRunStatus, AgentRunEvent models
    └── agent-definition.tsp               # AgentDefinition model
```

### Data Flow

```
shep run analyze-repository
  → CLI parses command, resolves RunAgentUseCase from DI
  → RunAgentUseCase:
      1. IAgentRegistry.getAgent('analyze-repository') → AgentDefinition
      2. IAgentRunRepository.create(run) → persists new AgentRun (status: running)
      3. IAgentRunner.run(agent, input, config) → invokes LangGraph StateGraph
         - Graph streams node updates to stdout (foreground)
         - SqliteSaver checkpoints state at each node transition
         - AgentRunEvents appended to agent_run_events table
      4. On success: IAgentRunRepository.update(run, status: completed)
      5. On failure: IAgentRunRepository.update(run, status: failed, error)
  → Output: shep-analysis.md written to CWD
```

## Security Considerations

- **API Key Storage**: The Anthropic API key comes from `Settings.agent.token` (stored in `~/.shep/data` SQLite) or the `ANTHROPIC_API_KEY` environment variable. The SQLite database at `~/.shep/` has 0700 directory permissions (set by `ensureShepDirectory()`). Token is never logged or included in agent run events.
- **Tool Sandboxing**: LangGraph tools (file_system, code_exec) must be scoped to the current repository path. The `file_system` tool should validate paths are within `repoPath` to prevent directory traversal. The `code_exec` tool (Phase 2) should use allowlisted commands only.
- **Checkpoint Data**: LangGraph checkpoints may contain conversation history including user prompts and LLM responses. These are stored in the repo-level SQLite database. No sensitive data should be included in checkpoint metadata that gets logged to `agent_run_events`.
- **Dependency Supply Chain**: All new `@langchain/*` packages are from the official LangChain organization on npm. Lockfile integrity should be verified.

## Performance Implications

- **Cold Start**: LangGraph graph compilation is lightweight (in-memory JS objects). The main latency is the first LLM API call. Graph construction should be lazy (compile on first use).
- **Checkpoint I/O**: SqliteSaver writes to SQLite at each node transition. With WAL mode already configured, writes are fast and non-blocking for reads. For the 3-5 node `analyze-repository` graph, this means 3-5 checkpoint writes per run — negligible overhead.
- **Memory**: LangGraph state lives in memory during execution. For the analyze-repository agent, state includes repository analysis results and conversation history. Expected memory footprint: < 50MB for typical repositories.
- **Streaming**: Using `streamMode: "updates"` provides node-level progress without buffering full state. This is efficient for CLI output — each node completion triggers a progress line.
- **SQLite Concurrency**: The repo-level database may have concurrent reads (status queries) during an active agent run. WAL mode handles this well. Background execution (Phase 2) will use a separate database connection in the forked process.

## Open Questions

All questions resolved.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
