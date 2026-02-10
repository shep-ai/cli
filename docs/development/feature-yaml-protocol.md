# feature.yaml Protocol

**Version:** 1.0.0
**Last Updated:** 2026-02-05

## Overview

`feature.yaml` is the machine-readable single source of truth for feature development state. It lives in each feature's spec directory (e.g., `specs/006-cli-settings-commands/feature.yaml`) and tracks progress from research through completion.

**Key Principles:**

- **First thing to read** when starting work on a feature in a new session
- **Updated by all shep-kit skills** as work progresses
- **Never edited manually** - only via automated skill updates
- **tasks.md is source of truth** for task definitions (feature.yaml only tracks status)

## Schema Reference

### Complete Structure

```yaml
feature:
  id: string # Feature ID (e.g., "006-cli-settings-commands")
  name: string # Human-readable name
  number: integer # Sequential feature number
  branch: string # Git branch name
  lifecycle: string # research | planning | implementation | review | complete
  createdAt: string # ISO 8601 timestamp

status:
  phase: string # Current phase within lifecycle
  progress:
    completed: integer # Number of completed tasks
    total: integer # Total number of tasks (from tasks.md)
    percentage: integer # Calculated: (completed/total)*100
  currentTask: string | null # Current task ID (e.g., "task-8")
  lastUpdated: string # ISO 8601 timestamp
  lastUpdatedBy: string # Skill that made the update

validation:
  lastRun: string | null # Last validation timestamp
  gatesPassed: string[] # List of passed validation gates
  autoFixesApplied: string[] # List of auto-fixes applied

tasks:
  current: string | null # Current task ID
  blocked: string[] # Task IDs that can't proceed
  failed: string[] # Task IDs that failed

checkpoints:
  - phase: string # Checkpoint name
    completedAt: string # ISO 8601 timestamp
    completedBy: string # Skill that created checkpoint

errors:
  current: object | null # Current error (if any)
  history: object[] # Past errors (for audit)
```

### Error Object Structure

```yaml
taskId: string # Task that failed
attempt: integer # Retry attempt number
error: string # Error description
details: string # Full error message/stack trace
timestamp: string # ISO 8601 timestamp
resolved: boolean # Whether error was resolved
resolvedAt: string # Resolution timestamp (if resolved)
```

## Lifecycle States

### State Machine

```
new-feature → research → planning → implementation → review → complete
```

### Phases by Lifecycle

| Lifecycle      | Valid Phases                              |
| -------------- | ----------------------------------------- |
| research       | research                                  |
| planning       | planning, ready-to-implement              |
| implementation | implementation, ready-for-review, blocked |
| review         | in-review, review-watching, review-fixing |
| complete       | complete                                  |

## Read Operations

### Loading feature.yaml

**Always the first operation when working on a feature:**

```bash
# Example pseudocode
feature_yaml_path="specs/$FEATURE_ID/feature.yaml"
if [[ -f "$feature_yaml_path" ]]; then
  # Parse YAML
  current_phase=$(yq '.status.phase' "$feature_yaml_path")
  current_task=$(yq '.status.currentTask' "$feature_yaml_path")
  progress=$(yq '.status.progress.completed' "$feature_yaml_path")
  total=$(yq '.status.progress.total' "$feature_yaml_path")

  echo "Feature $FEATURE_ID"
  echo "Phase: $current_phase"
  echo "Progress: $progress/$total tasks"
  echo "Current: $current_task"
else
  echo "ERROR: feature.yaml not found"
  exit 1
fi
```

### Validation Before Resume

**Check if current state is valid before continuing:**

```bash
# Verify files exist for completed work
# Run tests for completed tasks
# Ensure build passes
# If validation fails, re-attempt current task
```

## Update Operations

### Update Frequency

**CRITICAL: Update feature.yaml after EVERY logical task group completion:**

1. **After each TDD sub-phase** (RED, GREEN, REFACTOR)
2. **Before each commit** to ensure progress is tracked
3. **After completing a phase** (e.g., Phase 0, Phase 1)
4. **Not just at phase boundaries** - update incrementally

**Example pattern:**

```
Complete Phase 0 (6 tasks) → Update feature.yaml → Commit
Complete Phase 1 RED (6 tasks) → Update feature.yaml → Commit
Complete Phase 1 GREEN (X tasks) → Update feature.yaml → Commit
Complete Phase 1 REFACTOR (Y tasks) → Update feature.yaml → Commit
```

### Update Patterns

**All updates should:**

1. Read current state
2. Make minimal changes
3. Update `status.lastUpdated` timestamp
4. Update `status.lastUpdatedBy` with skill name
5. Recalculate `status.progress.percentage` if tasks changed
6. Increment `status.progress.completed` by number of tasks just finished
7. Set `status.currentTask` to next task identifier

### Example: Update Progress

```yaml
# Before
status:
  progress:
    completed: 7
    total: 12
    percentage: 58
  currentTask: "task-8"
  lastUpdated: "2026-02-05T14:30:00Z"

# After (task-8 completed)
status:
  progress:
    completed: 8
    total: 12
    percentage: 67
  currentTask: "task-9"
  lastUpdated: "2026-02-05T15:45:00Z"
  lastUpdatedBy: "shep-kit:implement"
```

### Example: Add Checkpoint

```yaml
checkpoints:
  - phase: 'research'
    completedAt: '2026-02-03T16:00:00Z'
    completedBy: 'shep-kit:research'
  - phase: 'plan'
    completedAt: '2026-02-04T18:30:00Z'
    completedBy: 'shep-kit:plan'
  # NEW
  - phase: 'implementation-started'
    completedAt: '2026-02-05T09:00:00Z'
    completedBy: 'shep-kit:implement'
```

### Example: Record Error

```yaml
errors:
  current:
    taskId: 'task-8'
    attempt: 2
    error: '3 unit tests failing in ShowCommand'
    details: |
      FAIL tests/unit/presentation/cli/commands/settings/show.command.test.ts
        ShowCommand
          ✗ should format output as table
          ✗ should format output as JSON
          ✗ should format output as YAML
    timestamp: '2026-02-05T15:30:00Z'
    resolved: false
  history: []
```

### Example: Resolve Error

```yaml
errors:
  current: null
  history:
    - taskId: 'task-8'
      attempt: 2
      error: '3 unit tests failing in ShowCommand'
      timestamp: '2026-02-05T15:30:00Z'
      resolved: true
      resolvedAt: '2026-02-05T15:45:00Z'
      resolution: 'Fixed import paths in test file'
```

## Skill-Specific Instructions

### `/shep-kit:new-feature`

**When:** Creating new feature spec

**Updates:**

- Create `feature.yaml` from template
- Set `feature.*` metadata
- Set `lifecycle: "research"`, `phase: "research"`
- Add checkpoint: "feature-created"

**Example:**

```yaml
feature:
  id: '007-new-feature'
  name: 'New Feature'
  number: 7
  branch: 'feat/007-new-feature'
  lifecycle: 'research'
  createdAt: '2026-02-05T16:00:00Z'

status:
  phase: 'research'
  progress: { completed: 0, total: 0, percentage: 0 }
  currentTask: null
  lastUpdated: '2026-02-05T16:00:00Z'
  lastUpdatedBy: 'shep-kit:new-feature'

checkpoints:
  - phase: 'feature-created'
    completedAt: '2026-02-05T16:00:00Z'
    completedBy: 'shep-kit:new-feature'
```

### `/shep-kit:research`

**When:** Research phase completes

**Updates:**

- Set `lifecycle: "planning"`, `phase: "planning"`
- Add checkpoint: "research-complete"

### `/shep-kit:plan`

**When:** Plan and tasks.md written

**Updates:**

- Set `lifecycle: "implementation"`, `phase: "ready-to-implement"`
- Count tasks in `tasks.md` and set `progress.total`
- Add checkpoint: "plan-complete"
- Add validation gates if validation ran

**Task Counting:**

```bash
# Count tasks in tasks.md (assuming each task has "## Task N:" header)
total_tasks=$(grep -c "^## Task [0-9]" tasks.md)
```

### `/shep-kit:implement`

**When:** Starting implementation

**Updates on start:**

- Set `phase: "implementation"`
- Add checkpoint: "implementation-started"

**Updates during execution (after each task):**

- Increment `progress.completed`
- Update `progress.percentage`
- Set `currentTask` to next task ID
- Update `lastUpdated` timestamp

**Updates on completion:**

- Set `phase: "ready-for-review"`
- Add checkpoint: "implementation-complete"

**Updates on error:**

- Add error to `errors.current`
- If blocked after 3 retries:
  - Set `phase: "blocked"`
  - Add task ID to `tasks.failed`

### `/shep-kit:commit-pr`

**When:** PR created and review loop running

**Updates on PR creation:**

- Set `lifecycle: "review"`, `phase: "in-review"`
- Add `prUrl: "https://github.com/..."`
- Add checkpoint: "pr-created"

**Updates during review loop:**

- Set `phase: "review-watching"` when waiting for reviews
- Set `phase: "review-fixing"` when applying fixes
- Add `reviewLoop` field to track iteration state
- Add checkpoint: "review-loop-started" when loop begins
- Add checkpoint: "review-fixes-applied-N" after each fix iteration (N = iteration number)
- Add checkpoint: "review-approved" when PR receives APPROVED status
- Add checkpoint: "review-loop-exhausted" when max iterations reached

**`reviewLoop` field schema:**

```yaml
reviewLoop:
  iteration: 0 # Current iteration number (0-based)
  maxIterations: 5 # Configurable max review-fix cycles
  commentsAddressed: [] # Comment IDs fixed so far
  commentsRemaining: [] # Comment IDs still open
  status: 'watching' # watching | fixing | approved | exhausted | failed
```

**Review loop state transitions:**

```
in-review → review-watching → review-fixing → review-watching (loop)
                                    ↓
                              review-watching → in-review (approved / no issues)
```

### `/shep-kit:merged`

**When:** PR merged

**Updates:**

- Set `lifecycle: "complete"`, `phase: "complete"`
- Add `mergedAt: "<timestamp>"`
- Add checkpoint: "feature-merged"

## Validation Rules

### Required Fields

All `feature.yaml` files MUST have:

- `feature.id`
- `feature.name`
- `feature.branch`
- `feature.lifecycle`
- `status.phase`
- `status.lastUpdated`

### Consistency Checks

- `lifecycle` must be valid state (research | planning | implementation | review | complete)
- `phase` must be valid for current `lifecycle`
- `progress.percentage` must equal `(completed/total)*100` (rounded)
- `currentTask` must exist in `tasks.md` (if not null)
- Checkpoint phases must be unique

### Error States

- If `errors.current` is not null, `phase` should be "blocked"
- If `tasks.failed` is not empty, review is required
- Max retry attempts should not exceed 3 per task

## Best Practices

### DO

✅ Read `feature.yaml` first when resuming work
✅ Update immediately after state changes
✅ Use ISO 8601 timestamps consistently
✅ Record all errors (even resolved ones) in history
✅ Add descriptive checkpoint phases
✅ Keep error messages concise in `error` field, details in `details` field

### DON'T

❌ Manually edit `feature.yaml` (use skills)
❌ Duplicate task definitions (use tasks.md)
❌ Skip updating `lastUpdated` timestamp
❌ Leave `errors.current` populated after resolution
❌ Add checkpoints without timestamps
❌ Modify `progress.total` during implementation (only during planning)

## Troubleshooting

### feature.yaml is missing

**Cause:** Feature created before protocol was implemented

**Solution:** Create from template manually or re-run `/shep-kit:new-feature`

### State is stale/incorrect

**Cause:** Manual edits or interrupted execution

**Solution:**

1. Read `tasks.md` to understand actual progress
2. Run validation to verify completed work
3. Update `feature.yaml` to match reality
4. Resume from correct task

### Percentage calculation is wrong

**Cause:** Manual update or floating-point error

**Solution:** Recalculate: `Math.round((completed/total)*100)`

### Checkpoint duplicates

**Cause:** Skill ran multiple times

**Solution:** Deduplicate by `phase` (keep most recent)

## Examples

See `.claude/skills/shep-kit:implement/examples/validation-report.md` for complete examples of validation output and error handling.

## Version History

| Version | Date       | Changes                     |
| ------- | ---------- | --------------------------- |
| 1.0.0   | 2026-02-05 | Initial protocol definition |

---

**Reference:** This protocol is used by all shep-kit skills. See skill-specific SKILL.md files for detailed implementation instructions.
