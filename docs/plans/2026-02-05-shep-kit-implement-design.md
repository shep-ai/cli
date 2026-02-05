# Design: /shep-kit:implement - Autonomous Implementation Executor

**Date:** 2026-02-05
**Status:** Approved
**Author:** Claude (via brainstorming session)

## Overview

Bridge the gap between planning and implementation with intelligent validation, autonomous execution, and real-time status tracking.

### Core Capabilities

1. **Pre-Implementation Validation Gate**: Comprehensive checks before any code is written
2. **Autonomous Task Execution**: Fully automated implementation flow
3. **Machine-Readable Status Tracking**: `feature.yaml` as single source of truth

### Design Philosophy

Zero-friction autonomous execution with intelligent safety gates. The system should do the right thing automatically while preventing quality issues before they happen.

## feature.yaml Structure

### Schema

```yaml
feature:
  id: '006-cli-settings-commands'
  name: 'CLI Settings Commands'
  number: 6
  branch: 'feat/006-cli-settings-commands'
  lifecycle: 'implementation' # research | planning | implementation | review | complete
  createdAt: '2026-02-03T10:00:00Z'

status:
  phase: 'implementation' # Current phase
  progress:
    completed: 7
    total: 12
    percentage: 58
  currentTask: 'task-8'
  lastUpdated: '2026-02-05T14:30:00Z'
  lastUpdatedBy: 'shep-kit:implement'

validation:
  lastRun: '2026-02-04T16:45:00Z'
  gatesPassed:
    - 'spec-complete'
    - 'plan-finalized'
    - 'architecture-validated'
    - 'tdd-phases-defined'
    - 'typespec-contracts-defined'
  autoFixesApplied:
    - 'Added missing Open Questions section'
    - 'Closed empty checkboxes in spec.md'

tasks:
  current: 'task-8'
  blocked: [] # Task IDs that can't proceed
  failed: [] # Task IDs that failed

checkpoints:
  - phase: 'research'
    completedAt: '2026-02-03T16:00:00Z'
    completedBy: 'shep-kit:research'
  - phase: 'plan'
    completedAt: '2026-02-04T18:30:00Z'
    completedBy: 'shep-kit:plan'

errors:
  current: null
  history: []
```

### Key Decisions

- Tasks referenced by ID only (full definitions in `tasks.md`)
- Timestamps for audit trail
- Validation gates explicitly listed
- Error state tracked for debugging
- No duplication of task lists (tasks.md is source of truth)

## Validation Gate Design

### Pre-Implementation Validation Categories

**1. Basic Completeness**

- Required files exist: `spec.md`, `plan.md`, `tasks.md`
- All sections present in each file
- Open questions resolved (no unchecked `[ ]` with content)
- Tasks have acceptance criteria defined

**2. Architecture & Conventions**

- Clean Architecture rules documented in plan
  - Domain has no external dependencies
  - Application only depends on domain
  - Infrastructure implements ports/interfaces
- **TypeSpec contracts defined for new domain entities**
- **TDD phases explicitly outlined in plan (RED-GREEN-REFACTOR cycles)**
- **Test coverage targets specified**

**3. Cross-Document Consistency**

- Task count in `tasks.md` matches plan phases
- Acceptance criteria align with success criteria in spec
- Research decisions referenced in plan
- No contradictions between spec/plan/research

### Auto-Fix Capabilities

**Safe structural fixes only:**

- Add missing section headers (e.g., `## Open Questions`)
- Close empty checkbox lines `[ ]` → `[x] Resolved: <timestamp>`
- Add missing `tasks.md` template if only `plan.md` exists
- Fix heading level inconsistencies

**Manual Review Required (blocks implementation):**

- Open questions with actual content
- Architecture violations
- Cross-document contradictions
- Missing critical content (acceptance criteria, TDD phases)

### Validation Flow

1. Run all checks
2. If all pass → proceed to implementation
3. If auto-fixable issues found → apply fixes, show summary, require user approval
4. If blocking issues found → display report, stop, require manual fixes

## Implementation Execution Flow

### Autonomous Task Execution Algorithm

```
1. Load feature.yaml to get current state
2. Load tasks.md as task definition source
3. For each task in sequence:
   a. Update feature.yaml (currentTask: "task-N")
   b. Read task definition from tasks.md
   c. Execute TDD cycle:
      - RED: Write failing tests first
      - GREEN: Implement minimal code to pass
      - REFACTOR: Improve while keeping tests green
   d. Run verification (tests, build, typecheck)
   e. If success:
      - Update feature.yaml progress (completed: N+1)
      - Continue to next task
   f. If failure:
      - Enter error handling (retry with debug cycle)
4. When all tasks complete:
   - Update feature.yaml (phase: "ready-for-review")
   - Add checkpoint (implementation-complete)
```

### Task Definition Source

`tasks.md` contains full task details:

- Description
- Acceptance criteria
- TDD phases
- Dependencies

`/shep-kit:implement` reads from this file but **never modifies it** - it's the immutable plan.

### Progress Tracking

After each task completion, `feature.yaml` is updated with:

- Incremented `status.progress.completed` count
- Updated `status.progress.percentage`
- New `status.currentTask` (next task ID)
- Updated `status.lastUpdated` timestamp

## Session Resumption

### Smart Auto-Resume Flow

```
1. Read feature.yaml first (ALWAYS)

2. Display summary:
   "Feature 006: CLI Settings Commands
    Progress: 7/12 tasks (58%)
    Current: task-8
    Last updated: 2026-02-05 14:30"

3. Validate current task state:
   - Check if files from task-7 exist
   - Run tests for completed work
   - Verify build passes

4. Determine resume point:
   - If validation passes → continue with task-8
   - If validation fails → re-attempt task-7

5. Auto-resume (no user prompt)
   - Start execution from determined task
   - Update feature.yaml (lastUpdated timestamp)
```

### Stale State Detection

If `feature.yaml` shows a task as current but validation reveals it's incomplete, the system automatically marks it as pending and re-executes it.

### No Interruption

The system shows status summary but immediately proceeds with execution - no "Ready to continue?" prompts.

## Error Handling

### Retry with Debug Cycle

```
When task fails (tests fail, build breaks, validation errors):

1. Capture error details (stack trace, test output, build logs)

2. Update feature.yaml:
   errors.current:
     taskId: "task-8"
     attempt: 1
     error: "3 unit tests failing"
     timestamp: "2026-02-05T15:00:00Z"

3. Run systematic debugging:
   - Analyze error root cause
   - Identify fix strategy
   - Apply fix

4. Re-run verification

5. If fixed:
   - Clear errors.current
   - Add to errors.history (for audit)
   - Continue to next task

6. If still failing:
   - Increment attempt counter
   - If attempt < 3: goto step 3 (retry)
   - If attempt >= 3: STOP execution

7. When stopped after 3 failed attempts:
   - Update feature.yaml:
     phase: "blocked"
     tasks.failed: ["task-8"]
     errors.current: <full error details>
   - Display error report to user
   - Require manual intervention
```

### Retry Bounds

Maximum **3 automatic fix attempts** per task prevents infinite loops while allowing self-correction for common issues (typos, missing imports, test setup).

### Error History

All errors (even resolved ones) are logged to `errors.history` for debugging patterns and improving the system.

## Pipeline Integration

### Lifecycle State Machine

```
new-feature → research → planning → implementation → review → complete
```

### How All Skills Update feature.yaml

**`/shep-kit:new-feature`**:

- Creates `specs/NNN-feature-name/feature.yaml` from template
- Sets initial state: lifecycle: "research", phase: "research"
- Adds checkpoint: "feature-created"

**`/shep-kit:research`**:

- When research completes, updates: lifecycle: "planning", phase: "planning"
- Adds checkpoint: "research-complete"

**`/shep-kit:plan`**:

- When plan and tasks.md are written, updates: lifecycle: "implementation", phase: "ready-to-implement"
- Sets progress.total from task count in tasks.md
- Adds checkpoint: "plan-complete"

**`/shep-kit:implement`** (NEW):

- When starting, updates: phase: "implementation"
- Adds checkpoint: "implementation-started"
- During execution, continuously updates: progress, currentTask, blocked/failed, errors
- When complete, updates: phase: "ready-for-review"
- Adds checkpoint: "implementation-complete"

**`/shep-kit:commit-pr`**:

- When PR created, updates: lifecycle: "review", phase: "in-review", prUrl
- Adds checkpoint: "pr-created"

**`/shep-kit:merged`**:

- When PR merged, updates: lifecycle: "complete", phase: "complete", mergedAt
- Adds checkpoint: "feature-merged"

### Shared Protocol

All skills reference `docs/development/feature-yaml-protocol.md` for standardized read/update instructions.

## Template and Documentation Structure

### Centralized Templates

```
.claude/skills/shep-kit:new-feature/
├── SKILL.md
├── templates/
│   ├── spec.md
│   ├── research.md
│   ├── plan.md
│   ├── tasks.md
│   ├── feature.yaml          # NEW
│   └── data-model.md
├── scripts/
│   └── init-feature.sh        # Modified to create feature.yaml
└── examples/
    └── 001-sample-feature/
        ├── spec.md
        └── feature.yaml       # NEW: Example

docs/development/
├── spec-driven-workflow.md    # Updated with implement step
└── feature-yaml-protocol.md   # NEW: Shared instructions
```

### feature.yaml Template

Template file with placeholders:

- `{{FEATURE_ID}}`
- `{{FEATURE_NAME}}`
- `{{FEATURE_NUMBER}}`
- `{{BRANCH_NAME}}`
- `{{TIMESTAMP}}`

### Shared Protocol Documentation

`feature-yaml-protocol.md` contains:

- YAML structure reference
- Read/update patterns
- Validation rules
- Error handling guidelines
- Examples for each skill

## Implementation Files

### New Files (7 files)

| File                                                              | Purpose                          |
| ----------------------------------------------------------------- | -------------------------------- |
| `.claude/skills/shep-kit:implement/SKILL.md`                      | Main skill implementation        |
| `.claude/skills/shep-kit:implement/validation/completeness.md`    | Completeness validation rules    |
| `.claude/skills/shep-kit:implement/validation/architecture.md`    | Architecture validation rules    |
| `.claude/skills/shep-kit:implement/validation/consistency.md`     | Consistency validation rules     |
| `.claude/skills/shep-kit:implement/examples/validation-report.md` | Example validation output        |
| `docs/development/feature-yaml-protocol.md`                       | Shared feature.yaml instructions |
| `.claude/skills/shep-kit:new-feature/templates/feature.yaml`      | Initial feature.yaml template    |

### Modified Files (8 files)

| File                                                          | Changes                              |
| ------------------------------------------------------------- | ------------------------------------ |
| `.claude/skills/shep-kit:new-feature/scripts/init-feature.sh` | Add feature.yaml creation            |
| `.claude/skills/shep-kit:new-feature/SKILL.md`                | Reference feature.yaml protocol      |
| `.claude/skills/shep-kit:research/SKILL.md`                   | Add feature.yaml update instructions |
| `.claude/skills/shep-kit:plan/SKILL.md`                       | Add feature.yaml update instructions |
| `.claude/skills/shep-kit:commit-pr/SKILL.md`                  | Add feature.yaml update instructions |
| `.claude/skills/shep-kit:merged/SKILL.md`                     | Add feature.yaml update instructions |
| `docs/development/spec-driven-workflow.md`                    | Add :implement step                  |
| `CLAUDE.md`                                                   | Reference validation gates           |

## Summary

This design provides:

✅ Comprehensive validation gate (completeness + architecture + consistency)
✅ Auto-fix for safe structural issues
✅ Autonomous batch execution with TDD discipline
✅ Smart auto-resume from feature.yaml
✅ Bounded retry with debug cycles
✅ Machine-readable status tracking (feature.yaml)
✅ Pipeline integration (all skills update feature.yaml)
✅ Centralized templates and shared protocol

---

**Next Steps:** Implementation of all files and modifications per this design.
