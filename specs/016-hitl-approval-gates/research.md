## Status

- **Phase:** Research
- **Updated:** 2026-02-15

## Technology Decisions

### 1. ApprovalGates TypeSpec Modeling

**Options considered:**

1. **Plain value object model (no BaseEntity)** — Two boolean fields, no identity
2. **Extend BaseEntity** — Full entity with id/createdAt/updatedAt
3. **Keep raw string enum** — Continue with `approvalMode?: string`

**Decision:** Plain value object model (no BaseEntity)

**Rationale:** ApprovalGates is an embedded configuration tuple (`allowPrd: boolean`,
`allowPlan: boolean`) with no independent identity. It follows the existing
`AgentRunEvent` pattern — a plain TypeSpec `model` without BaseEntity extension.
Adding id/timestamps would bloat what is essentially two booleans attached to an
AgentRun.

**TypeSpec definition:**

```typespec
model ApprovalGates {
  /** Skip human review after requirements phase */
  allowPrd: boolean;

  /** Skip human review after plan phase */
  allowPlan: boolean;
}
```

### 2. ApprovalGates Database Storage

**Options considered:**

1. **Single JSON TEXT column** — `approval_gates TEXT` storing `{"allowPrd":false,"allowPlan":false}`
2. **Two boolean columns** — `allow_prd INTEGER`, `allow_plan INTEGER`
3. **Keep string column** — Reparse at read time

**Decision:** Single JSON TEXT column replacing both `approval_mode` and `approval_status`

**Rationale:** JSON storage preserves the structured nature of the value object,
is extensible for future gates, and aligns with how other complex objects (messages,
plan, related_artifacts) are stored as JSON TEXT in the features table. The mapper
handles serialization/deserialization as it does for other JSON fields.

### 3. Worker Communication of ApprovalGates

**Options considered:**

1. **JSON CLI argument** — `--approval-gates '{"allowPrd":true,"allowPlan":false}'`
2. **Separate boolean flags** — `--allow-prd --allow-plan`
3. **Delimited string** — `--approval-gates allowPrd:true,allowPlan:false`

**Decision:** JSON CLI argument (`--approval-gates`)

**Rationale:** Single arg with JSON.parse keeps the interface simple. The worker
already handles JSON data. Replaces the existing `--approval-mode` string arg with
a structured alternative. The graph state `approvalGates` annotation receives the
parsed object directly.

### 4. PhaseTiming TypeSpec Modeling

**Options considered:**

1. **Persisted entity extending BaseEntity with own table**
2. **Reuse existing TimelineEvent model** — Add phase timing fields to it
3. **Store as JSON array on AgentRun** — Embed timing data in the run record

**Decision:** Persisted entity extending BaseEntity with own table

**Rationale:** PhaseTiming needs independent querying (by run ID, by feature ID),
proper indexing, and its own lifecycle. TimelineEvent is a user-facing audit concept
with different fields (`userQuery`). JSON on AgentRun would prevent cross-run queries
and bloat the agent_runs row.

**TypeSpec definition:**

```typespec
model PhaseTiming extends BaseEntity {
  agentRunId: string;
  phase: string;
  startedAt: utcDateTime;
  completedAt?: utcDateTime;
  durationMs?: int64;
}
```

### 5. Phase Timing Recording Location

**Options considered:**

1. **Inline in `executeNode()`** — Add repository calls alongside existing timing
2. **Separate middleware** — Wrap graph nodes with timing decorator
3. **LangGraph state channel** — Flow timing data through graph state

**Decision:** Inline in `executeNode()`

**Rationale:** `executeNode()` already computes `startTime` and `elapsed`. Adding
`IPhaseTimingRepository` as an optional parameter keeps timing co-located with
execution. The repository is optional so existing tests work without mocking it.
No new abstraction layer needed.

### 6. Auto-Resolve Pattern for `feat review/approve/reject`

**Options considered:**

1. **Query features by repo + waiting_approval status** — Scoped to current repo
2. **Global search across all repositories** — Find any waiting feature
3. **Always require ID** — No auto-resolve

**Decision:** Query features by repo + waiting_approval status

**Rationale:** When `[id]` is omitted, resolve the single feature waiting for approval
in the current repository (matching `feat ls` scoping). If zero matches: error. If
multiple: list them so user can choose. This enables the simple `shep feat approve`
flow without requiring users to look up IDs. Scoping to current repo prevents
surprising cross-repo actions.

**Implementation:** A shared `resolveWaitingFeature()` helper used by all three
commands. Lists features for `process.cwd()`, loads their agent runs, filters to
`waiting_approval` status, validates exactly one match.

### 7. `shouldInterrupt()` Refactor

**Options considered:**

1. **Boolean field checks** — `if (nodeName === 'requirements') return !gates.allowPrd`
2. **Object-keyed lookup table** — Restructure AUTO_APPROVED_NODES with object keys
3. **Enum-based dispatch** — Create an enum for approval modes with methods

**Decision:** Boolean field checks replacing string lookup table

**Rationale:** With typed `ApprovalGates`, the logic reduces to two simple conditionals:
interrupt after `requirements` if `!allowPrd`, interrupt after `plan` if `!allowPlan`.
All other nodes (`analyze`, `research`, `implement`) never interrupt. The
`AUTO_APPROVED_NODES` map and string comparisons are deleted entirely. Removes the
`--interactive` mode per spec.

**New implementation:**

```typescript
export function shouldInterrupt(nodeName: string, gates?: ApprovalGates): boolean {
  if (!gates) return false; // No gates = no interrupts (backward compat)
  if (nodeName === 'requirements') return !gates.allowPrd;
  if (nodeName === 'plan') return !gates.allowPlan;
  return false;
}
```

### 8. Migration Strategy

**Options considered:**

1. **Add column + data transformation** — New column, UPDATE to migrate data
2. **In-place column modification** — ALTER COLUMN (not supported in SQLite)
3. **Drop and recreate table** — Risky data loss

**Decision:** New migration with data transformation and column addition

**Rationale:** Migration 008 adds `approval_gates TEXT` column and creates the
`phase_timings` table. An UPDATE statement transforms existing `approval_mode`
string values into JSON. The old `approval_mode`/`approval_status` columns remain
(SQLite cannot drop columns) but are ignored by the updated mapper.

**Migration SQL (high-level):**

```sql
-- Add new column
ALTER TABLE agent_runs ADD COLUMN approval_gates TEXT;

-- Migrate existing data
UPDATE agent_runs SET approval_gates = '{"allowPrd":true,"allowPlan":false}'
  WHERE approval_mode = 'allow-prd';
UPDATE agent_runs SET approval_gates = '{"allowPrd":false,"allowPlan":true}'
  WHERE approval_mode = 'allow-plan';
UPDATE agent_runs SET approval_gates = '{"allowPrd":true,"allowPlan":true}'
  WHERE approval_mode IN ('allow-all', 'allow-plan');
UPDATE agent_runs SET approval_gates = '{"allowPrd":false,"allowPlan":false}'
  WHERE approval_mode = 'interactive';

-- Create phase_timings table
CREATE TABLE phase_timings (
  id TEXT PRIMARY KEY,
  agent_run_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  duration_ms INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_phase_timings_run ON phase_timings(agent_run_id);
```

## Library Analysis

No new libraries required. All changes use existing dependencies:

| Library              | Version  | Purpose                     | Status    |
| -------------------- | -------- | --------------------------- | --------- |
| TypeSpec             | existing | Domain model definitions    | Extended  |
| @langchain/langgraph | existing | Graph execution + interrupt | No change |
| Commander.js         | existing | CLI command definitions     | Extended  |
| better-sqlite3       | existing | SQLite database access      | Extended  |
| chalk                | existing | CLI output formatting       | No change |
| tsyringe             | existing | Dependency injection        | Extended  |

## Security Considerations

- **JSON parsing of CLI args**: The worker receives `--approval-gates` as a JSON
  string from `fork()`. Since the parent process constructs this JSON (not user
  input), there is no injection risk. The worker validates the parsed object has
  the expected shape before use.
- **No new external API calls**: All changes are internal to the CLI process and
  its forked worker. No new network requests or credential handling.
- **SQLite parameterized queries**: All database operations use prepared statements
  with named parameters, consistent with existing repository implementations.
  No raw string interpolation in SQL.
- **Process isolation**: The worker runs as a detached child process with its own
  DI container. ApprovalGates are passed at spawn time and cannot be modified
  externally during execution.

## Performance Implications

- **Phase timing writes**: Two additional SQLite writes per graph node (save on
  entry, update on exit). These are async and non-blocking. Each write is a single
  row INSERT/UPDATE on an indexed table — sub-millisecond overhead against node
  execution times of seconds to minutes.
- **feat show additional query**: Loading phase timings adds one indexed query
  (`SELECT * FROM phase_timings WHERE agent_run_id = ?`). Negligible latency
  for the expected data volume (5 rows per run).
- **Auto-resolve queries**: When id is omitted from feat review/approve/reject,
  a list of features is loaded and their runs checked. For the expected scale
  (tens of features, not thousands), this is fast and does not need optimization.
- **No impact on graph execution**: The approval gate check in `shouldInterrupt()`
  changes from a string lookup to two boolean comparisons — marginally faster.

## Open Questions

All questions resolved.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
