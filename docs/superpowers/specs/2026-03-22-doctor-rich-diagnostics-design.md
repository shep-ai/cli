# Design: Enrich `shep doctor --feature-id` Diagnostics

**Date:** 2026-03-22
**Status:** Draft
**Scope:** Expand diagnostic data collected when `--feature-id` is provided to `shep doctor`

## Problem

When `shep doctor --feature-id` runs, it only collects:
- Feature ID and name
- Failed agent run error summaries (agentType, agentName, error, timestamp)
- System info (Node, platform, arch, gh version)
- CLI version

This is insufficient for diagnosing complex issues. The spec YAMLs, agent prompts, conversation history, execution logs, and plan/task state are all available in the system but not included in the diagnostic report.

## Decision

Expand `collectDiagnostics` in `DoctorDiagnoseUseCase` directly (no new abstractions). Add new optional fields to `DoctorDiagnosticReport` that are populated only when `--feature-id` resolves to a feature.

## Data Sources

| Data | Source | Access |
|------|--------|--------|
| Feature metadata | `IFeatureRepository.findById()` → `Feature` entity | lifecycle, branch, description, workflow config |
| Spec YAML (PRD) | `feature.specPath` → `spec.yaml` | Filesystem read |
| Research YAML | `feature.specPath` → `research.yaml` | Filesystem read |
| Plan YAML | `feature.specPath` → `plan.yaml` | Filesystem read |
| Tasks YAML | `feature.specPath` → `tasks.yaml` | Filesystem read |
| Feature status YAML | `feature.specPath` → `feature.yaml` | Filesystem read |
| Agent run prompts/results | `AgentRun.prompt`, `AgentRun.result` | `IAgentRunRepository.list()` |
| Conversation messages | `Feature.messages[]` | Already loaded with feature |
| In-memory plan/tasks | `Feature.plan` | Already loaded with feature |
| Worker execution logs | `~/.shep/logs/worker-{agentRunId}.log` per run | Filesystem read for each feature-scoped agent run |
| Phase timings | `IPhaseTimingRepository.findByFeatureId()` | SQLite query |

## TypeSpec Model Changes

### New fields on `DoctorDiagnosticReport`

All new fields are optional — `undefined` when `--feature-id` is not provided.

```
// Feature context
featureLifecycle?: string
featureBranch?: string
featureDescription?: string
featureWorkflowConfig?: string     // JSON string

// Spec YAMLs (raw content)
specYaml?: string
researchYaml?: string
planYaml?: string
tasksYaml?: string
featureStatusYaml?: string

// Agent run details (richer than FailedRunSummary)
agentRunDetails?: AgentRunDetail[]

// Conversation history
conversationMessages?: string      // JSON-serialized Feature.messages[]

// In-memory plan/tasks
featurePlan?: string               // JSON-serialized Feature.plan

// Worker logs (one per agent run associated with the feature)
workerLogs?: WorkerLogEntry[]

// Phase timings
phaseTimings?: string              // JSON-serialized phase timing records
```

### New model: `AgentRunDetail`

```
AgentRunDetail {
  agentType: string
  agentName: string
  prompt: string
  result?: string
  error?: string
  timestamp: string
}
```

### New model: `WorkerLogEntry`

```
WorkerLogEntry {
  agentRunId: string
  agentName: string
  content: string               // Full log file content, truncated if over MAX_LOG_CHARS
  truncated: boolean            // True if content was truncated
  originalLength?: int32        // Original character count (only set when truncated)
}
```

Existing `FailedRunSummary` is unchanged for backward compatibility.

## Collection Logic

In `collectDiagnostics()`, when a feature is resolved:

```
Promise.all([
  collectFailedRuns(featureId),        // existing
  collectSystemInfo(),                  // existing
  getVersion(),                         // existing
  collectSpecYamls(feature.specPath),   // NEW
  collectWorkerLogs(featureRunIds),     // NEW — logs for ALL runs scoped to this feature
  collectPhaseTimings(feature.id),      // NEW
])
```

Synchronous extraction after feature lookup:
- `feature.lifecycle` → `featureLifecycle`
- `feature.branch` → `featureBranch`
- `feature.description` → `featureDescription`
- `JSON.stringify({ fast, push, openPr, approvalGates })` → `featureWorkflowConfig`
- `JSON.stringify(feature.messages)` → `conversationMessages`
- `JSON.stringify(feature.plan)` → `featurePlan`

New `collectAgentRunDetails(featureId)`: separate method that returns `AgentRunDetail[]` for ALL runs scoped to this feature (not just failed ones), including prompt and result. This is distinct from `collectFailedRuns` which only returns error summaries for failed runs.

`collectWorkerLogs(runIds)`: iterates over all agent run IDs for this feature, reads `~/.shep/logs/worker-{runId}.log` for each. Returns `WorkerLogEntry[]`.

### Best-effort reads

All new collection methods are best-effort:
- Missing spec files → `undefined`
- Missing worker logs → empty array or entries skipped
- Missing phase timings → `undefined`
- No specPath on feature → skip spec reads

## Issue Body Formatting

New sections added to `formatIssueBody()`. Large sections use `<details>` collapse tags for scannability. Sections with no data are omitted entirely.

```markdown
## Problem Description
{userDescription}

## Feature Context
- **Feature ID:** {featureId}
- **Feature Name:** {featureName}
- **Lifecycle:** {featureLifecycle}
- **Branch:** {featureBranch}
- **Description:** {featureDescription}
- **Workflow Config:** {featureWorkflowConfig}

## Environment
(unchanged)

## Failed Agent Runs (feature-scoped)
(unchanged)

## Agent Run Details
<details><summary>Agent: {agentName} ({agentType})</summary>

### Prompt
\`\`\`
{prompt}
\`\`\`

### Result
\`\`\`
{result}
\`\`\`

### Error
\`\`\`
{error}
\`\`\`
</details>

## Conversation History
<details><summary>Messages ({count} messages)</summary>

\`\`\`json
{conversationMessages}
\`\`\`
</details>

## Feature Plan
<details><summary>Plan & Tasks</summary>

\`\`\`json
{featurePlan}
\`\`\`
</details>

## Spec Files
<details><summary>spec.yaml</summary>

\`\`\`yaml
{specYaml}
\`\`\`
</details>
(same for research.yaml, plan.yaml, tasks.yaml, feature.yaml)

## Worker Logs
<details><summary>Worker log: {agentName} ({agentRunId})</summary>

\`\`\`
{content}
\`\`\`
</details>
(one `<details>` block per agent run with a log file)

## Phase Timings
<details><summary>Phase timing data</summary>

\`\`\`json
{phaseTimings}
\`\`\`
</details>

---
_Reported via `shep doctor`_
```

## Files Changed

| File | Change |
|------|--------|
| `tsp/domain/value-objects/doctor-diagnostic-report.tsp` | Add new fields to `DoctorDiagnosticReport`, add `AgentRunDetail` and `WorkerLogEntry` models |
| `packages/core/src/domain/generated/output.ts` | Regenerated via `pnpm tsp:compile` |
| `packages/core/src/application/use-cases/doctor/doctor-diagnose.use-case.ts` | Add `@inject('IPhaseTimingRepository')` constructor param, add `readFile`/`homedir` imports, add collection methods (`collectSpecYamls`, `collectWorkerLogs`, `collectAgentRunDetails`, `collectPhaseTimings`), expand `collectDiagnostics`, expand `formatIssueBody` with truncation |
| `tests/unit/application/use-cases/doctor/doctor-diagnose.use-case.test.ts` | Tests for all new collection + formatting logic |
| `tests/integration/application/use-cases/doctor/doctor-workflow.test.ts` | Feature-scoped full diagnostic flow test |

## Not Changed

- **CLI command** (`doctor.command.ts`) — no new options; `--feature-id` already exists
- **DI container** — `IPhaseTimingRepository` already registered; just needs injecting
- **Spec YAML parsers** — we read raw content, not parsed artifacts

## Truncation Strategy

GitHub issues have a ~65,535 character body limit. To prevent exceeding it:

```
MAX_WORKER_LOG_CHARS = 50_000    // per log entry
MAX_PROMPT_CHARS = 10_000        // per agent run detail
MAX_RESULT_CHARS = 10_000        // per agent run detail
MAX_CONVERSATION_CHARS = 20_000  // total conversation messages
MAX_PLAN_CHARS = 20_000          // total feature plan
```

When a field exceeds its limit, truncate and append: `\n... [truncated, {totalLength} chars total]`. The `WorkerLogEntry.truncated` boolean and `originalLength` field track this explicitly.

## Security Considerations

Agent prompts and results may contain sensitive data (API keys, repository secrets, internal paths). Since the diagnostic report is posted as a GitHub issue (potentially public):

- The existing `sanitizeRunSummary` approach (error-only) remains for `FailedRunSummary`
- The new `AgentRunDetail` intentionally includes prompt and result for diagnostic value
- Users invoke `shep doctor` explicitly — posting to GitHub requires `gh` auth, so users are aware of the visibility
- Future improvement: add a `--redact` flag to strip potential secrets before posting

## Key Decisions

1. **Raw YAML over parsed artifacts** — simpler, no parser coupling, issue readers see the original content
2. **`<details>` collapse for large sections** — keeps the issue scannable while including everything inline
3. **All new fields optional** — zero impact when `--feature-id` is not used
4. **Best-effort reads** — missing files/data gracefully become `undefined`, never block the report
5. **No new abstractions** — collection logic stays in the use case; extract later if needed
6. **JSON strings for complex fields** — `conversationMessages`, `featurePlan`, `phaseTimings` are stored as JSON strings rather than typed TypeSpec models to avoid importing many domain types into the diagnostic report model. The formatter serializes at render time. These are opaque diagnostic payloads, not structured data consumers need to parse.
7. **Multiple worker logs** — collect logs for ALL agent runs associated with the feature, not just the current one. A feature may go through multiple phases/retries.
8. **Separate `collectAgentRunDetails`** — distinct from `collectFailedRuns`; collects ALL runs (not just failed) with prompt/result context.
9. **Constructor change** — `IPhaseTimingRepository` added as a new `@inject` parameter in the use case constructor.

## Testing Strategy

Unit tests (extend existing test file):
1. Spec YAML collection — mock fs reads, verify all 5 files collected, graceful on missing
2. Worker log collection — mock fs read, verify content, graceful on missing
3. Phase timings collection — mock repository, verify JSON serialization
4. Feature context fields — verify extraction from Feature entity
5. AgentRunDetail enrichment — verify prompt + result included
6. No-feature-id regression — verify all new fields are `undefined`
7. Issue body formatting — verify new sections with `<details>` tags, omission when `undefined`

Integration test (extend existing test file):
8. Feature-scoped full diagnostic flow — feature with specPath, agentRunId, messages, plan
