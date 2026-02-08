# Data Model: langchain-agent-infra

> Entity definitions for 009-langchain-agent-infra

## Status

- **Phase:** Planning
- **Updated:** 2026-02-08

## Overview

This feature introduces TypeSpec domain models for agent orchestration infrastructure. All new entities extend or use base types from `tsp/common/base.tsp`. The models follow Clean Architecture principles with persistence-agnostic designs.

## New Entities

### AgentRun

**Location:** `tsp/agents/agent-run.tsp`

**Description**: Persistent record of an agent execution session. Tracks the entire lifecycle from pending to completion/failure with crash recovery metadata (PID, heartbeat).

| Property      | Type           | Required | Description                                                |
| ------------- | -------------- | -------- | ---------------------------------------------------------- |
| id            | UUID           | ✓        | Unique identifier (from BaseEntity)                        |
| agentType     | AgentType      | ✓        | Which agent executor was used (claude-code, etc.)          |
| agentName     | string         | ✓        | Which workflow agent ran (analyze-repository, etc.)        |
| status        | AgentRunStatus | ✓        | Current execution state                                    |
| prompt        | string         | ✓        | Input prompt sent to agent executor                        |
| result        | string         |          | Final output from agent (markdown, JSON, etc.)             |
| sessionId     | string         |          | Executor session ID for resume capability                  |
| threadId      | string         | ✓        | LangGraph thread_id for checkpoint lookup and crash resume |
| pid           | int32          |          | Process ID for crash recovery                              |
| lastHeartbeat | utcDateTime    |          | Last heartbeat timestamp (crash detection)                 |
| startedAt     | utcDateTime    |          | When execution started (status → running)                  |
| completedAt   | utcDateTime    |          | When execution finished (status → completed/failed)        |
| error         | string         |          | Error message if status is failed                          |
| createdAt     | utcDateTime    | ✓        | Creation timestamp (from BaseEntity)                       |
| updatedAt     | utcDateTime    | ✓        | Last update timestamp (from BaseEntity)                    |

**Relationships:**

- AgentType references `tsp/common/enums/agent-type.tsp` (ClaudeCode, GeminiCli, etc.)
- AgentRunStatus references `tsp/agents/enums/agent-run-status.tsp`

**Indexes** (SQLite migration):

- Primary key: `id`
- Index on `status` for filtering by state
- Index on `pid` (partial: WHERE pid IS NOT NULL) for crash recovery lookups

**TypeSpec Example:**

```typespec
import "@typespec/openapi3";
import "../common/base.tsp";
import "../common/enums/agent-type.tsp";
import "./enums/agent-run-status.tsp";

using TypeSpec.Http;

@doc("Agent execution run record")
model AgentRun extends BaseEntity {
  @doc("Agent executor type used (claude-code, gemini-cli, etc.)")
  agentType: AgentType;

  @doc("Agent workflow name (analyze-repository, requirements, etc.)")
  agentName: string;

  @doc("Current execution status")
  status: AgentRunStatus;

  @doc("Input prompt sent to agent executor")
  prompt: string;

  @doc("Final result output (optional, populated on completion)")
  result?: string;

  @doc("Executor session ID for resumption (optional)")
  sessionId?: string;

  @doc("LangGraph thread_id for checkpoint lookup and crash resume")
  threadId: string;

  @doc("Process ID for crash recovery (optional)")
  pid?: int32;

  @doc("Last heartbeat timestamp for crash detection (optional)")
  lastHeartbeat?: utcDateTime;

  @doc("Execution start timestamp (optional)")
  startedAt?: utcDateTime;

  @doc("Execution completion timestamp (optional)")
  completedAt?: utcDateTime;

  @doc("Error message if execution failed (optional)")
  error?: string;
}
```

---

## Value Objects

### AgentRunEvent

**Location:** `tsp/agents/agent-run-event.tsp`

**Description**: Streaming event emitted during agent execution. Used for progress tracking and real-time output.

| Property  | Type        | Description                                         |
| --------- | ----------- | --------------------------------------------------- |
| type      | string      | Event type: 'progress' \| 'result' \| 'error'       |
| content   | string      | Event content (message, result fragment, error msg) |
| timestamp | utcDateTime | When the event was emitted                          |

**TypeSpec Example:**

```typespec
import "@typespec/openapi3";

using TypeSpec.Http;

@doc("Streaming event emitted during agent execution")
model AgentRunEvent {
  @doc("Event type: progress, result, or error")
  type: "progress" | "result" | "error";

  @doc("Event content")
  content: string;

  @doc("Event timestamp")
  timestamp: utcDateTime;
}
```

---

### AgentDefinition

**Location:** `tsp/agents/agent-definition.tsp`

**Description**: Registry metadata for a LangGraph agent workflow. Not persisted to database - used for in-memory registration only.

| Property     | Type   | Description                                      |
| ------------ | ------ | ------------------------------------------------ |
| name         | string | Agent workflow identifier (analyze-repository)   |
| description  | string | Human-readable description                       |
| graphFactory | N/A    | (Not in TypeSpec - TypeScript-only function ref) |

**Note**: `graphFactory` is a TypeScript function reference that creates the StateGraph instance. This is not modeled in TypeSpec because it's runtime-only infrastructure code, not a data model.

**TypeSpec Example:**

```typespec
import "@typespec/openapi3";

using TypeSpec.Http;

@doc("Agent workflow registration metadata")
model AgentDefinition {
  @doc("Unique agent workflow name")
  name: string;

  @doc("Human-readable description")
  description: string;

  // Note: graphFactory is TypeScript-only, not in TypeSpec
}
```

---

## Enums

### AgentRunStatus

**Location:** `tsp/agents/enums/agent-run-status.tsp`

**Description**: Execution state of an agent run.

| Value       | Description                                         |
| ----------- | --------------------------------------------------- |
| pending     | Created but not yet started                         |
| running     | Currently executing                                 |
| completed   | Successfully finished                               |
| failed      | Execution failed with error                         |
| interrupted | Crashed/orphaned, recoverable via checkpoint resume |
| cancelled   | Manually cancelled by user (future support)         |

**TypeSpec Example:**

```typespec
import "@typespec/openapi3";

using TypeSpec.Http;

@doc("Agent run execution status")
enum AgentRunStatus {
  @doc("Created but not started")
  pending: "pending",

  @doc("Currently executing")
  running: "running",

  @doc("Successfully completed")
  completed: "completed",

  @doc("Failed with error")
  failed: "failed",

  @doc("Crashed/orphaned, recoverable via checkpoint")
  interrupted: "interrupted",

  @doc("Manually cancelled")
  cancelled: "cancelled",
}
```

---

### AgentFeature

**Location:** `tsp/agents/enums/agent-feature.tsp`

**Description**: Capability declarations for agent executors. Used by `IAgentExecutor.supportsFeature()` to enable fallback strategies.

| Value             | Description                             |
| ----------------- | --------------------------------------- |
| session-resume    | Can resume from previous session ID     |
| streaming         | Supports streaming output events        |
| tool-scoping      | Can restrict which tools are available  |
| structured-output | Can enforce output JSON schema with Zod |
| system-prompt     | Supports custom system prompts          |

**TypeSpec Example:**

```typespec
import "@typespec/openapi3";

using TypeSpec.Http;

@doc("Agent executor capability declarations")
enum AgentFeature {
  @doc("Supports session resumption from checkpoint")
  sessionResume: "session-resume",

  @doc("Supports streaming output events")
  streaming: "streaming",

  @doc("Supports tool scoping (restrict available tools)")
  toolScoping: "tool-scoping",

  @doc("Supports structured output with JSON schema")
  structuredOutput: "structured-output",

  @doc("Supports custom system prompts")
  systemPrompt: "system-prompt",
}
```

---

## Modified Entities

**None** - This feature does not modify existing entities. All changes are additive (new models in `tsp/agents/` directory).

---

## Database Schema

### agent_runs Table

**Migration**: `003_create_agent_runs.sql`

**Database scope**: Global database (`~/.shep/data`). Agent runs are stored globally (not per-repo) because: (1) simpler — reuses the existing single DB connection from `initializeContainer()`, (2) allows cross-repo agent run history, and (3) the `agent_runs` table stores the `prompt` which includes the repo path context. LangGraph checkpoints are stored in a **separate** SQLite file per repo at `~/.shep/repos/<encoded-path>/checkpoints.db` (managed by SqliteSaver, not by our migration system).

```sql
CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,                    -- UUID (crypto.randomUUID())
  agent_type TEXT NOT NULL,               -- AgentType enum value
  agent_name TEXT NOT NULL,               -- Workflow name
  status TEXT NOT NULL,                   -- AgentRunStatus enum value
  prompt TEXT NOT NULL,                   -- Input prompt
  result TEXT,                            -- Output result (NULL until completed)
  session_id TEXT,                        -- Executor session ID
  thread_id TEXT NOT NULL,                -- LangGraph thread_id for checkpoint lookup
  pid INTEGER,                            -- Process ID for crash recovery
  last_heartbeat INTEGER,                 -- Unix timestamp (ms)
  started_at INTEGER,                     -- Unix timestamp (ms)
  completed_at INTEGER,                   -- Unix timestamp (ms)
  error TEXT,                             -- Error message
  created_at INTEGER NOT NULL,            -- Unix timestamp (ms)
  updated_at INTEGER NOT NULL             -- Unix timestamp (ms)
);

CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_pid ON agent_runs(pid) WHERE pid IS NOT NULL;
CREATE INDEX idx_agent_runs_thread_id ON agent_runs(thread_id);
```

**Mapper**: `AgentRunMapper` in `infrastructure/repositories/mappers/agent-run.mapper.ts`

- Converts `utcDateTime` ↔ Unix timestamp (milliseconds)
- Converts enum values ↔ string literals
- Handles nullable fields

---

## TypeSpec Compilation

After creating all `.tsp` files:

```bash
pnpm tsp:compile
```

**Generated Output**:

- `src/domain/generated/output.ts` - TypeScript types
- `apis/openapi/agents.openapi.yaml` - OpenAPI spec
- `apis/json-schema/` - JSON Schema files per model

**Import in Application Code**:

```typescript
import type {
  AgentRun,
  AgentRunEvent,
  AgentDefinition,
  AgentRunStatus,
  AgentFeature,
} from '@/domain/generated/output.js';
```

---

_Data model changes for TypeSpec compilation — All domain models are additive, no modifications to existing entities_
