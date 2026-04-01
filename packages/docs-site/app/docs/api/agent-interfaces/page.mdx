# Agent Interfaces

Technical specifications for the agent system interfaces. These are the actual implemented interfaces in `packages/core/src/application/ports/output/agents/`.

## Core Interfaces

### IAgentExecutor

The primary interface for executing prompts against AI coding agents.

```typescript
export interface AgentExecutionOptions {
  cwd?: string;
  sessionId?: string;
  // Additional execution options
}

export interface AgentExecutionResult {
  result: string;
  // Additional result metadata
}

export interface IAgentExecutor {
  execute(prompt: string, options?: AgentExecutionOptions): Promise<AgentExecutionResult>;
}
```

### IAgentExecutorFactory

Creates executor instances for specific agent types.

```typescript
export interface AgentCliInfo {
  // CLI tool metadata for the agent
}

export interface IAgentExecutorFactory {
  createExecutor(agentType: AgentType, config: AgentConfig): IAgentExecutor;
}
```

### IAgentExecutorProvider

Resolves the current agent executor from settings. This is the primary entry point for getting an executor -- all code should use this rather than calling the factory directly.

```typescript
export interface IAgentExecutorProvider {
  getExecutor(): IAgentExecutor;
}
```

> **ARCHITECTURAL RULE:** The `settings.agent.type` field is the single source of truth for which agent executor runs. All code paths that need an `IAgentExecutor` MUST go through `IAgentExecutorProvider.getExecutor()`.

### IAgentRegistry

Registers and discovers agent definitions.

```typescript
export interface AgentDefinitionWithFactory {
  // Agent definition metadata with factory function
}

export interface IAgentRegistry {
  // Registry operations for agent discovery
}
```

### IAgentRunner

Runs agent workflows with lifecycle management.

```typescript
export interface AgentRunOptions {
  // Options for running an agent workflow
}

export interface IAgentRunner {
  // Run management operations
}
```

### IAgentValidator

Validates that an AI coding tool is available on the system.

```typescript
export interface AgentValidationResult {
  // Validation outcome
}

export interface IAgentValidator {
  // Validates agent binary availability
}
```

### IFeatureAgentProcessService

Manages feature agent background processes (start, stop, heartbeat monitoring).

```typescript
export interface IFeatureAgentProcessService {
  // Process lifecycle management
}
```

### IStructuredAgentCaller

Makes structured (typed) calls to agents with schema validation.

```typescript
export interface StructuredCallOptions {
  // Options for structured calls
}

export interface IStructuredAgentCaller {
  // Typed agent invocation
}
```

## Repository Interfaces

### IAgentRunRepository

Persists agent execution run records.

### IPhaseTimingRepository

Tracks SDLC phase durations per agent run.

### IAgentSessionRepository

Manages agent sessions.

```typescript
export interface ListSessionsOptions {
  // Filtering options for listing sessions
}

export interface GetSessionOptions {
  // Options for retrieving a specific session
}

export interface IAgentSessionRepository {
  list(options?: ListSessionsOptions): Promise<AgentSession[]>;
  get(options: GetSessionOptions): Promise<AgentSession | null>;
}
```

## Exported Types Summary

From `packages/core/src/application/ports/output/agents/index.ts`:

```typescript
export type {
  IAgentExecutor,
  AgentExecutionResult,
  AgentExecutionStreamEvent,
  AgentExecutionOptions,
};
export type { IAgentExecutorFactory, AgentCliInfo };
export type { IAgentExecutorProvider };
export type { IAgentRegistry, AgentDefinitionWithFactory };
export type { IAgentRunner, AgentRunOptions };
export type { IAgentRunRepository };
export type { IPhaseTimingRepository };
export type { IAgentValidator, AgentValidationResult };
export type { IFeatureAgentProcessService };
export type { IStructuredAgentCaller, StructuredCallOptions };
export { StructuredCallError };
export type { IAgentSessionRepository, ListSessionsOptions, GetSessionOptions };
```

---

## Maintaining This Document

**Update when:**

- Agent interfaces change
- New agent types are added
- New interfaces are introduced

**Related docs:**

- [AGENTS.md](../../AGENTS.md) - High-level agent overview
- [../architecture/agent-system.md](../architecture/agent-system.md) - LangGraph implementation details
