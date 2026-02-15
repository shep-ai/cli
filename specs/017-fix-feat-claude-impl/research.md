## Status

- **Phase:** Research
- **Updated:** 2026-02-15

## Root Cause Analysis

### The Error

```
API Error: 400 {"type":"error","error":{"type":"invalid_request_error",
"message":"messages.1.content.1.tool_use.name: String should have at most 200 characters"}}
```

The Anthropic API rejects a request because a `tool_use.name` field in the conversation
messages exceeds 200 characters. This occurs inside the Claude Code subprocess spawned
by Shep's implement phase.

### Known Claude Code Bugs

1. **[#7370](https://github.com/anthropics/claude-code/issues/7370)** — Extended sessions
   cause tool_use.name corruption. Confirmed to happen even WITHOUT MCP servers. The session
   becomes completely unusable with no recovery. An Anthropic collaborator confirmed that
   "Claude Code's built-in tools should not run into this issue" but users report it happens
   without MCP.

2. **[#23149](https://github.com/anthropics/claude-code/issues/23149)** (dup of #20983) —
   MCP plugin tool names using `mcp__plugin_{plugin}_{server}__{tool}` pattern exceed the
   API's character limits (64 chars for tool definitions, 200 chars for tool_use in messages).

### Failure Chain in Shep

```
Phase 4 starts → claude -p "<83K prompt>" --output-format stream-json ...
→ Model responds with text + tool_use (Task tool, 4 chars)
→ Claude Code sends next API request with conversation history
→ API rejects: tool_use.name > 200 chars
→ Claude Code exits with code 1
→ executor.execute() rejects with Error
→ implement node throws (prevents LangGraph checkpoint)
→ Worker marks run as failed
→ 49 minutes of work lost
```

### Contributing Factors (Shep-side)

| Factor               | Current State    | Impact                               |
| -------------------- | ---------------- | ------------------------------------ |
| Retry logic          | None             | Single failure = run failure         |
| Phase recovery       | None             | All phases re-execute on resume      |
| MCP isolation        | None             | MCP tools loaded from user config    |
| Max turns            | Not set          | Runaway sessions possible            |
| Error classification | None             | Can't distinguish API vs impl errors |
| Prompt size          | Unmanaged (83K+) | May stress context management        |

## Technology Decisions

### 1. MCP Tool Isolation

**Decision:** Use `--strict-mcp-config` with no config to disable all MCP tools.

**Options considered:**

1. `--strict-mcp-config` (no config) — Disables all MCP tools entirely
2. `--tools "Bash,Edit,Read,Write,Glob,Grep"` — Whitelist built-in tools only
3. `--disallowedTools` — Block specific problematic tools
4. Do nothing, rely on retry

**Rationale:** `--strict-mcp-config` eliminates the entire class of MCP tool name bugs
without needing to know which tools are problematic. It's the cleanest solution since
implementation phases should not need MCP tools.

**Implementation:** In `buildExecutorOptions()` or `buildArgs()`, add `--strict-mcp-config`
when no MCP config is explicitly provided.

### 2. Retry Strategy

**Decision:** Bounded retry with exponential backoff (max 3 attempts, 2s/4s/8s delays).

**Key insight:** Each retry spawns a FRESH Claude Code subprocess. This is critical because
the tool_use.name corruption is tied to a specific session — a new session won't inherit
the corrupted state.

**Implementation:** Wrap the `executor.execute()` call in the implement node with retry
logic. Only retry on classified-retryable errors (API 400/429/500, network, timeout).
Non-retryable errors (e.g., missing files, invalid YAML) fail immediately.

### 3. Error Classification

**Decision:** Pattern-based classifier with error categories.

**Categories:**

- `retryable-api`: API 400 (tool_use.name, etc.), 429 (rate limit), 500 (server error)
- `retryable-network`: Connection refused, timeout, DNS failure
- `non-retryable`: Implementation errors, missing files, invalid config
- `unknown`: Unclassified errors (treated as retryable for safety)

**Pattern matching on error message:**

```
/API Error: (400|429|5\d{2})/  → retryable-api
/timed out|ECONNREFUSED|ETIMEDOUT/  → retryable-network
/Process exited with code [^0]/  → check nested error message
```

### 4. Phase-Level Progress Preservation

**Decision:** Track completed phases in feature.yaml, skip on retry.

**Current behavior:** `updateFeatureProgress()` already updates feature.yaml between phases.
We extend this to record completed phase IDs, allowing the implement node to skip them.

**Implementation:** Before executing a phase, check if it's marked complete in feature.yaml.
After successful execution, mark it complete. On retry (either intra-node or graph resume),
skip completed phases.

### 5. Max Turns Limit

**Decision:** Set `--max-turns 50` for implement phase executor calls.

**Rationale:** Prevents runaway sessions that accumulate context and trigger the tool_use.name
bug. 50 turns is generous for a single phase's implementation work while preventing
unbounded execution.

### 6. AgentExecutionOptions Extension

**Decision:** Add `disableMcp: boolean` and `tools: string[]` to `AgentExecutionOptions`.

**Current interface fields:** `cwd`, `allowedTools`, `resumeSession`, `maxTurns`, `model`,
`systemPrompt`, `outputSchema`, `timeout`, `silent`.

**New fields:**

- `disableMcp?: boolean` → maps to `--strict-mcp-config` flag
- `tools?: string[]` → maps to `--tools` flag (restricts available built-in tools)

## Library Analysis

| Library   | Version | Purpose             | Pros                        | Cons                        |
| --------- | ------- | ------------------- | --------------------------- | --------------------------- |
| js-yaml   | ^4.1    | YAML parsing        | Already in use, works well  | None                        |
| LangGraph | ^0.2    | Graph orchestration | Checkpoint/resume support   | Node-level, not phase-level |
| Commander | ^12     | CLI framework       | Not affected by this change | N/A                         |

No new library dependencies required. All changes use existing infrastructure.

## Security Considerations

- `--strict-mcp-config` reduces attack surface by preventing untrusted MCP tools from
  executing in the agent subprocess
- `--max-turns 50` prevents cost-runaway scenarios where a buggy session makes unlimited
  API calls
- Retry logic includes bounded attempts (max 3) to prevent infinite retry loops

## Performance Implications

- Retry with exponential backoff adds up to 14 seconds delay per phase on full retry
  (2s + 4s + 8s). This is negligible compared to phase execution time (minutes).
- `--strict-mcp-config` may slightly speed up Claude Code startup by skipping MCP
  server initialization.
- Phase skipping on retry saves significant time by not re-executing completed phases.

## Open Questions

All questions resolved.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
