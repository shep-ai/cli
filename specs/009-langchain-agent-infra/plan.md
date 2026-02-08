# Plan: langchain-agent-infra

> Implementation plan for 009-langchain-agent-infra

## Status

- **Phase:** Planning
- **Updated:** 2026-02-08

## Architecture Overview

This feature introduces agent orchestration infrastructure following Clean Architecture with agent-agnostic design:

```
┌─────────────────────────────────────────────────────────────────┐
│ Presentation Layer (CLI)                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ shep run <agent-name> [--background] [--model] [--resume]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ Application Layer (Use Cases & Ports)                          │
│ ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│ │ RunAgentUseCase  │  │ Ports (Interfaces):                 │ │
│ │                  │  │ - IAgentExecutor                    │ │
│ │ - Validates      │  │ - IAgentExecutorFactory             │ │
│ │ - Orchestrates   │  │ - IAgentRunner                      │ │
│ │ - Tracks         │  │ - IAgentRegistry                    │ │
│ └──────────────────┘  │ - IAgentRunRepository               │ │
│                        └──────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ Infrastructure Layer (Adapters)                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Agent Executors (Strategy Pattern)                         │ │
│ │ ┌──────────────────┐  ┌─────────────────┐                 │ │
│ │ │ ClaudeCodeExec.  │  │ AgentExecutor   │                 │ │
│ │ │ - spawn('claude')│  │ Factory         │                 │ │
│ │ │ - stream stdout  │  │ - Resolves from │                 │ │
│ │ │ - session mgmt   │  │   Settings      │                 │ │
│ │ └──────────────────┘  └─────────────────┘                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ LangGraph Runtime (Orchestration)                          │ │
│ │ ┌──────────────────────────────────────────────────────────┐ │
│ │ │ StateGraph<AnalyzeRepositoryState>                      │ │
│ │ │ ┌────────────┐  ┌────────────┐  ┌────────────┐         │ │
│ │ │ │ analyzeNode│─▶│ (executor) │─▶│    END     │         │ │
│ │ │ └────────────┘  └────────────┘  └────────────┘         │ │
│ │ │                                                         │ │
│ │ │ SqliteSaver (checkpointing) ─▶ Resume on crash        │ │
│ │ └──────────────────────────────────────────────────────────┘ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Persistence (SQLite)                                       │ │
│ │ agent_runs table: id, agent_type, status, prompt, result, │ │
│ │                   session_id, pid, heartbeat, timestamps  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ Domain Layer (TypeSpec Models)                                 │
│ AgentRun, AgentRunEvent, AgentDefinition, AgentRunStatus       │
│ AgentFeature = 'session-resume' | 'streaming' | ...            │
└─────────────────────────────────────────────────────────────────┘
```

**Key Design Principles:**

1. **Agent-Agnostic**: `Settings.agent.type` drives executor selection, not hardcoded to Claude Code
2. **Two Extension Axes**:
   - New agent types (implement `IAgentExecutor`) - e.g., Gemini CLI, Aider
   - New agent workflows (create `StateGraph` + register) - e.g., requirements-agent, plan-agent
3. **Capability Declarations**: `supportsFeature()` enables fallback strategies for missing features
4. **Crash Recovery**: PID tracking + heartbeat + checkpointing = resume on failure

## Implementation Strategy

### Phase 1: Foundation & Dependencies

**Objective**: Install dependencies and scaffold TypeSpec models.

**TDD**: Not applicable (scaffolding phase)

**Tasks**:

1. Install npm packages: `@langchain/langgraph`, `zod`, `uuid`
2. Create TypeSpec models in `tsp/agents/`:
   - `agent-run.tsp` (extends BaseEntity)
   - `agent-run-event.tsp` (value object)
   - `agent-definition.tsp` (value object)
   - `enums/agent-run-status.tsp`
   - `enums/agent-feature.tsp`
3. Run `pnpm tsp:compile` to generate TypeScript types

**Parallelization**: Sequential (foundation)

---

### Phase 2: Application Ports - Agent Executor

**Objective**: Define agent-agnostic executor interfaces.

**RED** (Write Failing Tests First):

```typescript
// tests/unit/application/ports/agent-executor.interface.test.ts
describe('IAgentExecutor type contracts', () => {
  it('should define execute method signature');
  it('should define executeStream method signature');
  it('should define supportsFeature method signature');
});
```

**GREEN** (Minimal Implementation):

- `application/ports/output/agent-executor.interface.ts`:
  - `AgentExecutionResult`, `AgentExecutionStreamEvent`, `AgentExecutionOptions`
  - `IAgentExecutor` interface with `execute()`, `executeStream()`, `supportsFeature()`
  - `AgentFeature` type alias
- `application/ports/output/agent-executor-factory.interface.ts`:
  - `IAgentExecutorFactory` with `createExecutor()`, `getSupportedAgents()`

**REFACTOR**:

- Add JSDoc with usage examples
- Ensure type safety

**Parallelization**: Sequential (other phases depend on ports)

---

### Phase 3: Infrastructure - ClaudeCodeExecutor [PARALLELIZABLE ✅]

**Objective**: Implement Claude Code CLI subprocess executor.

**RED** (Write Failing Tests First):

```typescript
// tests/unit/infrastructure/services/agents/executors/claude-code-executor.test.ts
describe('ClaudeCodeExecutor', () => {
  it('should execute prompt and return result');
  it('should stream execution events');
  it('should support session-resume feature');
  it('should handle subprocess errors gracefully');
});
```

**GREEN** (Minimal Implementation):

- `infrastructure/services/agents/executors/claude-code-executor.service.ts`:
  - Implements `IAgentExecutor`
  - Constructor DI: `SpawnFunction` (like `ExecFunction` in AgentValidator)
  - `execute()`: spawn `claude -p <prompt> --output-format json`
  - `executeStream()`: stream stdout, parse JSON lines
  - `supportsFeature()`: true for session-resume, streaming, system-prompt
  - Parse `--session-id` from output for resumption

**REFACTOR**:

- Extract subprocess utilities
- Add timeout handling
- Improve error messages

**Parallelization**: ✅ **Can run in parallel with Phase 4 & 5** (independent implementations)

---

### Phase 4: Infrastructure - AgentExecutorFactory [PARALLELIZABLE ✅]

**Objective**: Factory to resolve executor by AgentType.

**RED** (Write Failing Tests First):

```typescript
// tests/unit/infrastructure/services/agents/agent-executor-factory.test.ts
describe('AgentExecutorFactory', () => {
  it('should create ClaudeCodeExecutor for claude-code type');
  it('should throw for unsupported agent types');
  it('should list supported agents');
});
```

**GREEN** (Minimal Implementation):

- `infrastructure/services/agents/agent-executor-factory.service.ts`:
  - Implements `IAgentExecutorFactory`
  - Constructor DI: `SpawnFunction`
  - `createExecutor()`: switch on agentType, return ClaudeCodeExecutor or throw
  - `getSupportedAgents()`: return `['claude-code']`

**REFACTOR**:

- Use Map-based registration for future extensibility
- Add executor caching (singleton per type)

**Parallelization**: ✅ **Can run in parallel with Phase 3 & 5**

---

### Phase 5: Infrastructure - Task Persistence [PARALLELIZABLE ✅]

**Objective**: SQLite table and repository for agent_runs.

**RED** (Write Failing Tests First):

```typescript
// tests/integration/infrastructure/repositories/agent-run.repository.test.ts
describe('AgentRunRepository', () => {
  it('should create agent run record');
  it('should update agent run status');
  it('should find running agents by PID');
});
```

**GREEN** (Minimal Implementation):

- Migration `003_create_agent_runs.sql`:
  ```sql
  CREATE TABLE agent_runs (
    id TEXT PRIMARY KEY,
    agent_type TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    status TEXT NOT NULL,
    prompt TEXT NOT NULL,
    result TEXT,
    session_id TEXT,
    pid INTEGER,
    last_heartbeat INTEGER,
    started_at INTEGER,
    completed_at INTEGER,
    error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_agent_runs_status ON agent_runs(status);
  CREATE INDEX idx_agent_runs_pid ON agent_runs(pid) WHERE pid IS NOT NULL;
  ```
- `application/ports/output/agent-run-repository.interface.ts`
- `infrastructure/repositories/agent-run.repository.ts`
- `infrastructure/repositories/mappers/agent-run.mapper.ts`

**REFACTOR**:

- Add composite indexes
- Extract SQL query builders

**Parallelization**: ✅ **Can run in parallel with Phase 3 & 4**

---

### Phase 6: Application Ports - Agent Runtime

**Objective**: Define IAgentRunner and IAgentRegistry interfaces.

**RED** (Write Failing Tests First):

```typescript
// tests/unit/application/ports/agent-runtime.interface.test.ts
describe('IAgentRunner type contracts', () => {
  it('should define runAgent method signature');
});
```

**GREEN** (Minimal Implementation):

- `application/ports/output/agent-runner.interface.ts`
- `application/ports/output/agent-registry.interface.ts`

**REFACTOR**:

- Add JSDoc

**Parallelization**: Sequential (other phases depend on these ports)

---

### Phase 7: Infrastructure - LangGraph Runtime [DEPENDS ON 3-4]

**Objective**: StateGraph orchestration with SqliteSaver checkpointing.

**RED** (Write Failing Tests First):

```typescript
// tests/unit/infrastructure/services/agents/langgraph/analyze-repository-graph.test.ts
describe('analyzeRepositoryGraph', () => {
  it('should create StateGraph with analyze node');
  it('should execute graph and return analysis markdown');
  it('should checkpoint state after each node');
});
```

**GREEN** (Minimal Implementation):

- `infrastructure/services/agents/langgraph/analyze-repository-graph.ts`:
  - Zod state schema: `AnalyzeRepositoryState`
  - `analyzeNode` calls `executor.execute()`
  - Create StateGraph, add node, add edge to END
- `infrastructure/services/agents/langgraph/checkpointer.ts`:
  - Wrapper around `@langchain/langgraph` SqliteSaver

**REFACTOR**:

- Extract prompt templates
- Add conditional edges for error handling
- Add retry logic

**Parallelization**: Depends on Phase 3-4 (needs IAgentExecutor implementations)

---

### Phase 8: Infrastructure - Agent Registry & Runner [DEPENDS ON 6-7]

**Objective**: Agent registration and orchestration services.

**RED** (Write Failing Tests First):

```typescript
// tests/unit/infrastructure/services/agents/agent-registry.service.test.ts
describe('AgentRegistryService', () => {
  it('should register agent definition');
  it('should list all registered agents');
});

// tests/unit/infrastructure/services/agents/agent-runner.service.test.ts
describe('AgentRunnerService', () => {
  it('should run agent and track execution');
  it('should save agent run to repository');
  it('should resume from checkpoint on failure');
});
```

**GREEN** (Minimal Implementation):

- `infrastructure/services/agents/agent-registry.service.ts`:
  - Map<string, AgentDefinition>
  - Register analyze-repository in constructor
- `infrastructure/services/agents/agent-runner.service.ts`:
  - Constructor DI: IAgentRegistry, IAgentExecutorFactory, checkpointer, IAgentRunRepository
  - `runAgent()`: resolve definition, create executor, compile graph, invoke, track

**REFACTOR**:

- Add lifecycle hooks
- Extract graph compilation
- Add progress streaming

**Parallelization**: Depends on Phase 6-7

---

### Phase 9: Application Use Cases [DEPENDS ON 8]

**Objective**: RunAgentUseCase orchestrates validation and execution.

**RED** (Write Failing Tests First):

```typescript
// tests/unit/application/use-cases/agents/run-agent.use-case.test.ts
describe('RunAgentUseCase', () => {
  it('should validate agent exists before running');
  it('should run agent and return result');
  it('should apply settings model configuration');
});
```

**GREEN** (Minimal Implementation):

- `application/use-cases/agents/run-agent.use-case.ts`:
  - `@injectable()` with DI for IAgentRunner, IAgentRegistry
  - `execute({ agentName, options })`: validate, merge settings model, call runner

**REFACTOR**:

- Add Zod validation
- Extract settings resolution
- Add telemetry hooks

**Parallelization**: Depends on Phase 8

---

### Phase 10: Presentation - CLI Commands [DEPENDS ON 9]

**Objective**: `shep run <agent-name>` CLI command.

**RED** (Write Failing Tests First):

```typescript
// tests/integration/presentation/cli/commands/run.command.test.ts
describe('shep run command', () => {
  it('should execute agent and print result');
  it('should handle --background flag');
  it('should handle --model option');
});
```

**GREEN** (Minimal Implementation):

- `presentation/cli/commands/run/index.ts`:
  - `createRunCommand()` with Commander
  - `.argument('<agent-name>')`
  - `.option('--background')`, `.option('--model <name>')`, `.option('--resume <session-id>')`
  - Action handler: resolve RunAgentUseCase, execute, print

**REFACTOR**:

- Add streaming output
- Add progress spinner
- Improve error messages
- Add help examples

**Parallelization**: Depends on Phase 9

---

### Phase 11: DI Container Wiring [DEPENDS ON ALL]

**Objective**: Register all services in tsyringe container.

**RED** (Write Failing Tests First):

```typescript
// tests/integration/infrastructure/di/container.test.ts
describe('DI Container - Agent Services', () => {
  it('should resolve RunAgentUseCase with dependencies');
  it('should resolve IAgentExecutorFactory');
  it('should resolve IAgentRunner');
});
```

**GREEN** (Minimal Implementation):

- Update `infrastructure/di/container.ts`:
  - Register IAgentExecutorFactory
  - Register IAgentRegistry
  - Register IAgentRunRepository
  - Register IAgentRunner
  - Register RunAgentUseCase

**REFACTOR**:

- Group by feature
- Add comments
- Validate health

**Parallelization**: Depends on all previous phases

---

### Phase 12: E2E Integration Test [DEPENDS ON 11]

**Objective**: End-to-end smoke test.

**RED** (Write Failing Test First):

```typescript
// tests/e2e/agents/analyze-repository.test.ts
describe('E2E: shep run analyze-repository', () => {
  it('should analyze repository and generate shep-analysis.md');
  it('should track agent run in database');
});
```

**GREEN** (Minimal Implementation):

- Write passing E2E test
- Fix integration issues

**REFACTOR**:

- Add cleanup
- Add timeout handling
- Add test fixtures

**Parallelization**: Sequential (final integration)

---

## Files to Create/Modify

### New Files (~23)

| File                                                                            | Purpose                       |
| ------------------------------------------------------------------------------- | ----------------------------- |
| `tsp/agents/agent-run.tsp`                                                      | AgentRun entity TypeSpec      |
| `tsp/agents/agent-run-event.tsp`                                                | AgentRunEvent value object    |
| `tsp/agents/agent-definition.tsp`                                               | AgentDefinition value object  |
| `tsp/agents/enums/agent-run-status.tsp`                                         | AgentRunStatus enum           |
| `tsp/agents/enums/agent-feature.tsp`                                            | AgentFeature enum             |
| `application/ports/output/agent-executor.interface.ts`                          | IAgentExecutor port           |
| `application/ports/output/agent-executor-factory.interface.ts`                  | IAgentExecutorFactory port    |
| `application/ports/output/agent-runner.interface.ts`                            | IAgentRunner port             |
| `application/ports/output/agent-registry.interface.ts`                          | IAgentRegistry port           |
| `application/ports/output/agent-run-repository.interface.ts`                    | IAgentRunRepository port      |
| `application/use-cases/agents/run-agent.use-case.ts`                            | RunAgentUseCase               |
| `infrastructure/services/agents/executors/claude-code-executor.service.ts`      | ClaudeCodeExecutor            |
| `infrastructure/services/agents/agent-executor-factory.service.ts`              | AgentExecutorFactory          |
| `infrastructure/services/agents/agent-registry.service.ts`                      | AgentRegistryService          |
| `infrastructure/services/agents/agent-runner.service.ts`                        | AgentRunnerService            |
| `infrastructure/services/agents/langgraph/analyze-repository-graph.ts`          | analyze-repository StateGraph |
| `infrastructure/services/agents/langgraph/checkpointer.ts`                      | SqliteSaver wrapper           |
| `infrastructure/services/agents/langgraph/prompts/analyze-repository.prompt.ts` | Prompt templates              |
| `infrastructure/repositories/agent-run.repository.ts`                           | AgentRunRepository            |
| `infrastructure/repositories/mappers/agent-run.mapper.ts`                       | AgentRun mapper               |
| `infrastructure/persistence/sqlite/migrations/003_create_agent_runs.sql`        | agent_runs table migration    |
| `presentation/cli/commands/run/index.ts`                                        | shep run command              |
| `tests/` (~11 files)                                                            | Unit, integration, e2e tests  |

### Modified Files (~5)

| File                                              | Changes                    |
| ------------------------------------------------- | -------------------------- |
| `infrastructure/di/container.ts`                  | Register agent services    |
| `infrastructure/persistence/sqlite/migrations.ts` | Add migration 003          |
| `application/ports/output/index.ts`               | Export new port interfaces |
| `presentation/cli/index.ts`                       | Register run command       |
| `src/domain/generated/output.ts`                  | Regenerated from TypeSpec  |

## Testing Strategy

### Unit Tests (TDD)

- Mock all dependencies via constructor DI
- Vitest test runner
- Coverage target: >80%
- Test files colocated with implementation in `tests/unit/`

### Integration Tests

- In-memory SQLite for repository tests
- DI container resolution tests
- Migration tests
- Test files in `tests/integration/`

### E2E Tests

- CLI command execution
- File system validation (shep-analysis.md exists)
- Database state verification
- Test files in `tests/e2e/`

## Risk Mitigation

| Risk                         | Mitigation                                                                 |
| ---------------------------- | -------------------------------------------------------------------------- |
| Claude Code CLI changes      | Agent-agnostic design allows switching executors without LangGraph changes |
| Subprocess hangs             | Timeout handling with SIGTERM/SIGKILL fallback                             |
| Database migration conflicts | Sequential migration numbering, migration tests                            |
| State schema evolution       | Zod schema versioning, checkpointer graceful fallback                      |
| Executor crash during run    | PID tracking, heartbeat checks, crash recovery protocol                    |
| Circular dependencies in DI  | Factory pattern, lazy resolution                                           |
| Checkpointing overhead       | Async writes, WAL mode already enabled                                     |
| Agent registry memory bloat  | Lazy graph compilation, weak references for unused agents                  |

## Rollback Plan

If critical issues arise during implementation:

1. **Phase 1-2 (Ports)**: No rollback needed (interfaces only)
2. **Phase 3-5 (Infrastructure)**: Remove DI registrations, delete migration, revert files
3. **Phase 6-8 (Runtime)**: Disable agent runner registration, keep infrastructure
4. **Phase 9-10 (CLI)**: Remove command registration, keep use case dormant
5. **Phase 11-12 (Integration)**: Feature flag to disable agent runtime

**Feature Flag**: Add `Settings.system.agentRuntimeEnabled: boolean` (default false) to gate entire feature if needed.

**Database Rollback**: Migration 003 can be rolled back by decrementing `user_version` and dropping `agent_runs` table.

---

_Updated by `/shep-kit:plan` — see tasks.md for detailed breakdown_
