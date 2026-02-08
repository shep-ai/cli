# Tasks: langchain-agent-infra

> Task breakdown for 009-langchain-agent-infra

## Status

- **Phase:** Implementation
- **Updated:** 2026-02-08

## Task List

### Phase 1: Foundation & Dependencies

- [ ] Install `@langchain/langgraph`, `zod`, `uuid` packages
- [ ] Create `tsp/agents/agent-run.tsp` (extends BaseEntity with id, agentType, agentName, status, prompt, result, sessionId, pid, lastHeartbeat, startedAt, completedAt, error)
- [ ] Create `tsp/agents/agent-run-event.tsp` (value object: type, content, timestamp)
- [ ] Create `tsp/agents/agent-definition.tsp` (value object: name, description, graphFactory)
- [ ] Create `tsp/agents/enums/agent-run-status.tsp` (pending | running | completed | failed | cancelled)
- [ ] Create `tsp/agents/enums/agent-feature.tsp` (session-resume | streaming | tool-scoping | structured-output | system-prompt)
- [ ] Run `pnpm tsp:compile` and verify `src/domain/generated/output.ts` updated
- [ ] Verify types import correctly with test file

---

### Phase 2: Application Ports - Agent Executor

- [ ] Create `application/ports/output/agent-executor.interface.ts`
  - [ ] Define `AgentExecutionResult` type (result, sessionId?, usage?, metadata?)
  - [ ] Define `AgentExecutionStreamEvent` type (type: progress|result|error, content, timestamp)
  - [ ] Define `AgentExecutionOptions` type (cwd?, allowedTools?, resumeSession?, maxTurns?, model?, systemPrompt?, outputSchema?, timeout?)
  - [ ] Define `AgentFeature` type alias
  - [ ] Define `IAgentExecutor` interface (agentType, execute, executeStream, supportsFeature)
  - [ ] Add comprehensive JSDoc with examples
- [ ] Create `application/ports/output/agent-executor-factory.interface.ts`
  - [ ] Define `IAgentExecutorFactory` interface (createExecutor, getSupportedAgents)
  - [ ] Add JSDoc
- [ ] Export interfaces from `application/ports/output/index.ts`
- [ ] Write type-level tests in `tests/unit/application/ports/agent-executor.interface.test.ts`

---

### Phase 3: Infrastructure - ClaudeCodeExecutor [P]

**RED-GREEN-REFACTOR Cycle:**

- [ ] **RED**: Write failing tests in `tests/unit/infrastructure/services/agents/executors/claude-code-executor.test.ts`
  - [ ] Test: should execute prompt and return result
  - [ ] Test: should stream execution events
  - [ ] Test: should support session-resume feature
  - [ ] Test: should handle subprocess errors gracefully
  - [ ] Test: should parse session-id from output
  - [ ] Test: should apply timeout and kill subprocess
- [ ] **GREEN**: Implement `infrastructure/services/agents/executors/claude-code-executor.service.ts`
  - [ ] Define `SpawnFunction` type for DI
  - [ ] Implement `IAgentExecutor` interface
  - [ ] Constructor: inject `SpawnFunction`
  - [ ] `execute()`: spawn `claude -p <prompt> --output-format json`, return result
  - [ ] `executeStream()`: spawn with streaming, yield events as parsed JSON lines
  - [ ] `supportsFeature()`: return true for session-resume, streaming, system-prompt
  - [ ] Parse `--session-id` from stdout
  - [ ] Make tests pass
- [ ] **REFACTOR**: Extract subprocess utilities, improve error handling, add debug logging

---

### Phase 4: Infrastructure - AgentExecutorFactory [P]

**RED-GREEN-REFACTOR Cycle:**

- [ ] **RED**: Write failing tests in `tests/unit/infrastructure/services/agents/agent-executor-factory.test.ts`
  - [ ] Test: should create ClaudeCodeExecutor for claude-code type
  - [ ] Test: should throw for unsupported agent types
  - [ ] Test: should list supported agents
  - [ ] Test: should cache executor instances
- [ ] **GREEN**: Implement `infrastructure/services/agents/agent-executor-factory.service.ts`
  - [ ] Implement `IAgentExecutorFactory` interface
  - [ ] Constructor: inject `SpawnFunction`
  - [ ] `createExecutor()`: switch on agentType, return ClaudeCodeExecutor for claude-code, throw for others
  - [ ] `getSupportedAgents()`: return `['claude-code']`
  - [ ] Make tests pass
- [ ] **REFACTOR**: Use Map-based registration, add executor caching (singleton per type)

---

### Phase 5: Infrastructure - Task Persistence [P]

**RED-GREEN-REFACTOR Cycle:**

- [ ] **RED**: Write failing tests in `tests/integration/infrastructure/repositories/agent-run.repository.test.ts`
  - [ ] Test: should create agent run record
  - [ ] Test: should find agent run by ID
  - [ ] Test: should update agent run status
  - [ ] Test: should find running agents by PID
  - [ ] Test: should list all agent runs
  - [ ] Test: should delete agent run
- [ ] **GREEN**: Implement persistence layer
  - [ ] Create migration `infrastructure/persistence/sqlite/migrations/003_create_agent_runs.sql` with agent_runs table and indexes
  - [ ] Update `infrastructure/persistence/sqlite/migrations.ts` to include migration 003
  - [ ] Create `application/ports/output/agent-run-repository.interface.ts` with IAgentRunRepository
  - [ ] Create `infrastructure/repositories/mappers/agent-run.mapper.ts` with toDatabase/fromDatabase
  - [ ] Create `infrastructure/repositories/agent-run.repository.ts` implementing IAgentRunRepository
  - [ ] Implement create, findById, updateStatus, findRunningByPid, list, delete methods
  - [ ] Make tests pass
- [ ] **REFACTOR**: Add composite indexes, extract SQL query builders, optimize queries

---

### Phase 6: Application Ports - Agent Runtime

- [ ] Create `application/ports/output/agent-runner.interface.ts`
  - [ ] Define `AgentRunOptions` type (repositoryPath?, model?, resumeSession?, background?, timeout?)
  - [ ] Define `IAgentRunner` interface (runAgent method)
  - [ ] Add JSDoc
- [ ] Create `application/ports/output/agent-registry.interface.ts`
  - [ ] Define `IAgentRegistry` interface (register, get, list methods)
  - [ ] Add JSDoc
- [ ] Export interfaces from `application/ports/output/index.ts`
- [ ] Write type-level tests in `tests/unit/application/ports/agent-runtime.interface.test.ts`

---

### Phase 7: Infrastructure - LangGraph Runtime

**RED-GREEN-REFACTOR Cycle:**

- [ ] **RED**: Write failing tests in `tests/unit/infrastructure/services/agents/langgraph/analyze-repository-graph.test.ts`
  - [ ] Test: should create StateGraph with analyze node
  - [ ] Test: should execute graph and return analysis markdown
  - [ ] Test: should checkpoint state after each node
  - [ ] Test: should resume from checkpoint
  - [ ] Test: should handle node errors gracefully
- [ ] **GREEN**: Implement LangGraph runtime
  - [ ] Create `infrastructure/services/agents/langgraph/prompts/analyze-repository.prompt.ts` with prompt template
  - [ ] Create `infrastructure/services/agents/langgraph/analyze-repository-graph.ts`
    - [ ] Define Zod state schema `AnalyzeRepositoryState` (repositoryPath, analysisMarkdown, error)
    - [ ] Implement `analyzeNode` function that calls `executor.execute()` with analysis prompt
    - [ ] Create StateGraph, add analyzeNode, add edge to END
    - [ ] Export `analyzeRepositoryGraph` factory function
  - [ ] Create `infrastructure/services/agents/langgraph/checkpointer.ts` wrapping SqliteSaver
  - [ ] Make tests pass
- [ ] **REFACTOR**: Extract prompt templates, add conditional edges for errors, add retry logic with exponential backoff

---

### Phase 8: Infrastructure - Agent Registry & Runner

**RED-GREEN-REFACTOR Cycle:**

- [ ] **RED**: Write failing tests in `tests/unit/infrastructure/services/agents/agent-registry.service.test.ts`
  - [ ] Test: should register agent definition
  - [ ] Test: should get registered agent by name
  - [ ] Test: should list all registered agents
  - [ ] Test: should return undefined for unknown agent
- [ ] **RED**: Write failing tests in `tests/unit/infrastructure/services/agents/agent-runner.service.test.ts`
  - [ ] Test: should run agent and track execution
  - [ ] Test: should save agent run to repository with pending status
  - [ ] Test: should update status to running, then completed
  - [ ] Test: should resume from checkpoint on failure
  - [ ] Test: should handle agent not found error
  - [ ] Test: should handle graph execution errors
- [ ] **GREEN**: Implement registry and runner
  - [ ] Create `infrastructure/services/agents/agent-registry.service.ts`
    - [ ] Implement `IAgentRegistry` with Map<string, AgentDefinition>
    - [ ] Register analyze-repository in constructor
  - [ ] Create `infrastructure/services/agents/agent-runner.service.ts`
    - [ ] Implement `IAgentRunner`
    - [ ] Constructor DI: IAgentRegistry, IAgentExecutorFactory, checkpointer, IAgentRunRepository
    - [ ] `runAgent()`: resolve definition, create executor, create agent run record, compile graph, invoke, update status, return result
    - [ ] Handle errors and update status to failed
  - [ ] Make tests pass
- [ ] **REFACTOR**: Add lifecycle hooks (onStart, onComplete, onError), extract graph compilation, add progress streaming

---

### Phase 9: Application Use Cases

**RED-GREEN-REFACTOR Cycle:**

- [ ] **RED**: Write failing tests in `tests/unit/application/use-cases/agents/run-agent.use-case.test.ts`
  - [ ] Test: should validate agent exists before running
  - [ ] Test: should throw if agent not found
  - [ ] Test: should run agent and return result
  - [ ] Test: should apply settings model configuration
  - [ ] Test: should pass through options to runner
- [ ] **GREEN**: Implement use case
  - [ ] Create `application/use-cases/agents/run-agent.use-case.ts`
    - [ ] Add `@injectable()` decorator
    - [ ] Constructor: `@inject('IAgentRunner')`, `@inject('IAgentRegistry')`
    - [ ] `execute({ agentName, options })`: validate agent exists, merge settings model config, call runner.runAgent()
  - [ ] Make tests pass
- [ ] **REFACTOR**: Add Zod input validation schema, extract settings resolution logic, add telemetry/logging hooks

---

### Phase 10: Presentation - CLI Commands

**RED-GREEN-REFACTOR Cycle:**

- [ ] **RED**: Write failing tests in `tests/integration/presentation/cli/commands/run.command.test.ts`
  - [ ] Test: should execute agent and print result
  - [ ] Test: should handle --background flag
  - [ ] Test: should handle --model option
  - [ ] Test: should handle --resume option
  - [ ] Test: should handle agent not found error
  - [ ] Test: should handle execution errors gracefully
- [ ] **GREEN**: Implement CLI command
  - [ ] Create `presentation/cli/commands/run/index.ts`
    - [ ] Export `createRunCommand()` returning Commander Command
    - [ ] Add `.argument('<agent-name>', 'Agent to run')`
    - [ ] Add `.option('--background', 'Run in background')`
    - [ ] Add `.option('--model <name>', 'Override model')`
    - [ ] Add `.option('--resume <session-id>', 'Resume from checkpoint')`
    - [ ] Action handler: resolve RunAgentUseCase from container, call execute(), print result
  - [ ] Update `presentation/cli/index.ts` to register run command
  - [ ] Make tests pass
- [ ] **REFACTOR**: Add streaming output for foreground execution, add progress spinner, improve error messages with colors, add --help examples

---

### Phase 11: DI Container Wiring

**RED-GREEN-REFACTOR Cycle:**

- [ ] **RED**: Write failing tests in `tests/integration/infrastructure/di/container.test.ts`
  - [ ] Test: should resolve RunAgentUseCase with all dependencies
  - [ ] Test: should resolve IAgentExecutorFactory
  - [ ] Test: should resolve IAgentRegistry
  - [ ] Test: should resolve IAgentRunRepository
  - [ ] Test: should resolve IAgentRunner
  - [ ] Test: entire dependency graph resolves without errors
- [ ] **GREEN**: Wire up DI container
  - [ ] Update `infrastructure/di/container.ts`:
    - [ ] Register `IAgentExecutorFactory` with factory using `promisify(execFile)`
    - [ ] Register `IAgentRegistry` with `AgentRegistryService` as singleton
    - [ ] Register `IAgentRunRepository` with factory using Database
    - [ ] Register `IAgentRunner` with factory using all dependencies + checkpointer
    - [ ] Register `RunAgentUseCase` with factory
  - [ ] Make tests pass
- [ ] **REFACTOR**: Group registrations by feature, add comments, validate container health at startup

---

### Phase 12: E2E Integration Test

**RED-GREEN-REFACTOR Cycle:**

- [ ] **RED**: Write failing E2E test in `tests/e2e/agents/analyze-repository.test.ts`
  - [ ] Test: should analyze repository and generate shep-analysis.md
  - [ ] Test: should track agent run in database
  - [ ] Test: should handle background execution
  - [ ] Test: should resume from checkpoint after crash simulation
- [ ] **GREEN**: Fix integration issues until E2E test passes
  - [ ] Verify all file paths resolve correctly
  - [ ] Verify DI container initializes properly
  - [ ] Verify CLI command wiring works end-to-end
  - [ ] Verify shep-analysis.md is generated with correct content
  - [ ] Verify database records are created
- [ ] **REFACTOR**: Add cleanup logic for test repositories, add timeout handling, add test fixtures for different repo types

---

## Parallelization Notes

**Phases that can run in parallel:**

- ✅ **Phase 3, 4, 5** can run concurrently (independent implementations)
  - Phase 3: ClaudeCodeExecutor (executor implementation)
  - Phase 4: AgentExecutorFactory (factory logic)
  - Phase 5: Task Persistence (database layer)
  - **Agent Team Opportunity**: Spawn 3 agents, one per phase, to accelerate development

**Sequential dependencies:**

- Phase 1 → Phase 2 (foundation must exist before ports)
- Phase 2 → Phase 3, 4 (ports must be defined before implementations)
- Phase 3, 4 → Phase 7 (LangGraph needs executors)
- Phase 6 → Phase 8 (runtime ports before runtime services)
- Phase 7, 8 → Phase 9 (use cases depend on services)
- Phase 9 → Phase 10 (CLI depends on use cases)
- Phase 10 → Phase 11 (DI wiring needs all implementations)
- Phase 11 → Phase 12 (E2E needs full integration)

## Acceptance Checklist

Before marking feature complete:

- [ ] All tasks completed
- [ ] All tests passing (`pnpm test`)
  - [ ] Unit tests >80% coverage
  - [ ] Integration tests pass
  - [ ] E2E tests pass
- [ ] Linting clean (`pnpm lint`)
- [ ] Types valid (`pnpm typecheck`)
- [ ] TypeSpec compiles (`pnpm tsp:compile`)
- [ ] Manual smoke test: `pnpm cli run analyze-repository` generates valid shep-analysis.md
- [ ] Documentation updated:
  - [ ] CLAUDE.md updated with agent system details
  - [ ] Extensibility guide validated
- [ ] PR created and reviewed
- [ ] CI/CD pipeline passes
- [ ] Spec documents updated:
  - [ ] feature.yaml → lifecycle: 'implementation', phase: 'complete'
  - [ ] spec.md → Phase: Implementation
  - [ ] research.md → status updated

---

_Task breakdown for implementation tracking — Execute with `/shep-kit:implement` or manually with agent teams for parallelizable phases_
