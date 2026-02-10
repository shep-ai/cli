---
name: shep-kit:implement
description: Validate specs and autonomously execute implementation tasks with status tracking. Use after /shep-kit:plan when ready to start implementation.
---

# Autonomous Implementation Executor

## When to Use

Use this skill after `/shep-kit:plan` has created `plan.yaml` and `tasks.yaml`, and you're ready to start implementation.

**Triggers:**

- User says "implement", "start implementation", "execute tasks"
- User runs `/shep-kit:implement` explicitly
- After completing planning phase and ready to write code

**Don't use if:**

- Planning is not complete (`plan.yaml` or `tasks.yaml` missing)
- Specs have open questions that need resolution
- Architecture decisions are not finalized

## What This Skill Does

1. **Pre-Implementation Validation** - Comprehensive quality gates
2. **Autonomous Task Execution** - Executes all tasks from `tasks.md` sequentially
3. **Real-Time Status Tracking** - Updates `feature.yaml` throughout execution
4. **Smart Error Handling** - Retry with debugging (max 3 attempts per task)
5. **Session Resumption** - Automatically continues from last task on re-run

## Prerequisites

**Required YAML source files in spec directory:**

- `spec.yaml` - Complete feature specification
- `research.yaml` - Technical decisions documented
- `plan.yaml` - Implementation strategy
- `tasks.yaml` - Task breakdown with acceptance criteria
- `feature.yaml` - Status tracking file (created by `:new-feature`)

## Workflow

### Phase 1: Validation Gate

**Run comprehensive validation BEFORE starting implementation:**

```bash
pnpm spec:validate <feature-id>
```

This script validates all 3 categories (completeness, architecture, consistency) against the YAML source files. See `validation/*.md` for the detailed rules it implements.

#### 1.1 Basic Completeness Check

- [ ] Required YAML files exist (`spec.yaml`, `research.yaml`, `plan.yaml`, `tasks.yaml`, `feature.yaml`)
- [ ] All required keys present in each YAML file
- [ ] Open questions resolved (`openQuestions[].resolved: true` in YAML)
- [ ] Tasks have clear acceptance criteria (`tasks.yaml` tasks[].acceptanceCriteria)
- [ ] Success criteria defined in `spec.yaml`

**Validation rules:** `validation/completeness.md`

#### 1.2 Architecture & Conventions Check

- [ ] Clean Architecture principles documented in `plan.yaml` content
- [ ] **TypeSpec contracts defined** for new domain entities
- [ ] **TDD phases explicitly outlined** (RED-GREEN-REFACTOR cycles) in `plan.yaml`
- [ ] **Test coverage targets specified**
- [ ] Repository pattern used for data access (if applicable)

**Validation rules:** `validation/architecture.md`

#### 1.3 Cross-Document Consistency Check

- [ ] Task count in `tasks.yaml` tasks[] matches `plan.yaml` phases[].taskIds
- [ ] Acceptance criteria align with spec success criteria
- [ ] Research decisions referenced in plan
- [ ] No contradictions between spec/plan/research YAML files
- [ ] Dependencies between tasks are valid (`tasks.yaml` tasks[].dependencies)

**Validation rules:** `validation/consistency.md`

#### 1.4 Auto-Fix (if needed)

**Apply ONLY safe structural fixes:**

- Add missing optional YAML keys with defaults
- Add missing `tasks.yaml` from template if only `plan.yaml` exists
- Regenerate Markdown from YAML: `pnpm spec:generate-md <feature-id>`

**Show summary of auto-fixes and require user approval before proceeding.**

#### 1.5 Blocking Issues

**If `pnpm spec:validate` finds blocking issues, STOP and report:**

- Unresolved open questions in YAML
- Missing critical YAML keys (acceptance criteria, TDD phases)
- Architecture violations
- Cross-document contradictions

**Display validation report (see `examples/validation-report.md`) and exit.**

### Phase 2: Session Resumption Check

**Read `feature.yaml` to determine state:**

```yaml
# Check current state
current_phase = feature.yaml:status.phase
current_task = feature.yaml:status.currentTask
progress = feature.yaml:status.progress
```

**Display status summary:**

```
Feature {ID}: {Name}
Progress: {completed}/{total} tasks ({percentage}%)
Current: {currentTask}
Last updated: {lastUpdated}
```

**Validate current state:**

1. If `currentTask` is not null, verify work is complete:
   - Check files exist for previous task
   - Run tests for completed work
   - Verify build passes
2. If validation passes → continue with `currentTask` or next task
3. If validation fails → re-attempt `currentTask`

**Auto-resume immediately (no user prompt).**

### Phase 3: Autonomous Task Execution

**Execute tasks from `tasks.yaml` in sequence:**

#### For each task:

**3.1 Update Status (Start)**

```yaml
# Update feature.yaml
status:
  currentTask: 'task-N'
  lastUpdated: '<timestamp>'
  lastUpdatedBy: 'shep-kit:implement'
```

**3.2 Read Task Definition**

- Load task from `tasks.yaml` (structured YAML data)
- Read: `tasks[N].description`, `tasks[N].acceptanceCriteria`, `tasks[N].tddPhases`, `tasks[N].dependencies`

**3.3 Execute TDD Cycle**

**CRITICAL: Follow TDD discipline EXACTLY as defined in plan:**

1. **RED Phase:**

   - Write failing tests FIRST (as specified in plan)
   - Ensure tests fail (expected behavior)
   - Commit failing tests

2. **GREEN Phase:**

   - Write minimal implementation to pass tests
   - Run tests until green
   - Do NOT add extra features

3. **REFACTOR Phase:**
   - Improve code quality
   - Keep tests green throughout
   - Extract helpers, improve naming, reduce duplication

**3.4 Run Verification**

```bash
pnpm test        # All tests must pass
pnpm build       # Build must succeed
pnpm typecheck   # No TypeScript errors
pnpm lint        # No lint errors
```

**3.5 Handle Result**

**If verification PASSES:**

```yaml
# Update feature.yaml
status:
  progress:
    completed: { N+1 }
    percentage: { calculated }
  currentTask: 'task-{N+1}'
  lastUpdated: '<timestamp>'
```

Regenerate Markdown to reflect updated status:

```bash
pnpm spec:generate-md <feature-id>
```

Continue to next task.

**If verification FAILS:**
→ Enter Error Handling (Phase 4)

### Phase 4: Error Handling (Retry with Debug Cycle)

**When task fails:**

**4.1 Capture Error**

```yaml
# Update feature.yaml
errors:
  current:
    taskId: 'task-N'
    attempt: 1
    error: '<concise description>'
    details: '<full error message/stack trace>'
    timestamp: '<timestamp>'
    resolved: false
```

**4.2 Run Systematic Debugging**

1. Analyze error root cause
2. Identify fix strategy
3. Apply fix
4. Re-run verification

**4.3 Check Retry Count**

- If fixed → clear `errors.current`, add to `errors.history`, continue
- If still failing AND attempt < 3 → increment attempt, retry from 4.2
- If still failing AND attempt >= 3 → STOP execution

**4.4 Stop After 3 Failed Attempts**

```yaml
# Update feature.yaml
status:
  phase: 'blocked'

tasks:
  failed: ['task-N']

errors:
  current:
    taskId: 'task-N'
    attempt: 3
    error: '<description>'
    details: '<full details>'
    timestamp: '<timestamp>'
    resolved: false
```

**Display error report to user:**

```
❌ Implementation blocked on task-N after 3 retry attempts

Error: <concise description>

Details:
<full error message>

Manual intervention required.

To resume: Fix the issue and re-run /shep-kit:implement
```

### Phase 5: Completion

**When all tasks complete successfully:**

**5.1 Update feature.yaml**

```yaml
status:
  phase: 'ready-for-review'
  progress:
    completed: { total }
    percentage: 100
  currentTask: null

checkpoints:
  - phase: 'implementation-complete'
    completedAt: '<timestamp>'
    completedBy: 'shep-kit:implement'
```

**5.2 Display completion summary:**

```
✅ Feature {ID}: Implementation complete!

Summary:
- {total} tasks completed
- All tests passing
- Build successful
- Ready for code review

Next steps:
1. Review all changes
2. Run `/shep-kit:commit-pr` to create pull request
```

## Important Rules

### TDD Discipline

**NEVER skip RED-GREEN-REFACTOR cycle:**

- RED: Tests ALWAYS come first
- GREEN: Implement minimal code to pass
- REFACTOR: Improve while keeping tests green

**If plan doesn't specify TDD phases, STOP and ask user to update plan.**

### Task Execution Order

**Execute tasks STRICTLY in order from `tasks.yaml`:**

- Respect task dependencies (`tasks[].dependencies`)
- Do not skip tasks
- Do not reorder tasks

### Status Tracking

**Update `feature.yaml` after EVERY state change:**

- Starting new task
- Completing task
- Recording error
- Resolving error

**See `docs/development/feature-yaml-protocol.md` for update patterns.**

### Error Boundaries

**Maximum 3 automatic retry attempts per task:**

- Prevents infinite loops
- Allows self-correction for common issues
- Requires human intervention for persistent problems

### Autonomous Execution

**No user prompts during execution (except for auto-fix approval):**

- Show status summaries
- Display progress updates
- Continue automatically
- Only stop on blocking errors

## Reference Documentation

- **Feature YAML Protocol:** `docs/development/feature-yaml-protocol.md`
- **Validation Rules:** `validation/*.md` in this skill directory
- **Spec-Driven Workflow:** `docs/development/spec-driven-workflow.md`
- **TDD Guide:** `docs/development/tdd-guide.md`

## Examples

See `examples/validation-report.md` for example validation output and error handling scenarios.

---

**Remember:** This skill bridges planning and implementation. Validation ensures quality gates are met before any code is written. Autonomous execution with bounded retries maximizes velocity while maintaining safety.
