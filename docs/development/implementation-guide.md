# Implementation Guide

This guide provides detailed instructions for executing implementation plans created via `/shep-kit:plan`.

**Prerequisites**: Completed plan.md and tasks.md in `specs/NNN-feature-name/`

## Overview

Implementation follows a strict discipline:

1. **TDD MANDATORY** - RED → GREEN → REFACTOR for all code phases
2. **Frequent Progress Updates** - Update tasks.md as you work
3. **Phase-by-Phase CI Validation** - Watch CI after each phase, fix-loop until green
4. **Never skip phases** - Each phase builds on the previous one

## The Implementation Loop

```
┌─────────────────────────────────────────────┐
│ For Each Phase in tasks.md:                │
│                                             │
│  1. Work through RED-GREEN-REFACTOR         │
│  2. UPDATE tasks.md checkboxes FREQUENTLY   │
│  3. Commit phase completion                 │
│  4. Push to remote                          │
│  5. Watch CI (gh run watch --exit-status)   │
│  6. IF CI fails: Fix-Commit-Push-Watch      │
│  7. ONLY proceed when CI passes             │
└─────────────────────────────────────────────┘
```

## Phase Execution: Step-by-Step

### Before Starting Phase

1. **Read the phase tasks** in tasks.md
2. **Understand dependencies** - What does this phase build on?
3. **Review TDD structure** - What tests come first?

### During Phase: TDD Cycle (For Code Phases)

#### RED: Write Failing Tests First

```bash
# Example: Domain entity tests
pnpm test:watch  # Start watch mode

# Write test first (it will fail - that's expected!)
# tests/unit/domain/entities/feature.test.ts
```

**CRITICAL**: As soon as you write a test:

1. Run `pnpm test` to confirm it fails
2. **Update tasks.md immediately**:
   ```markdown
   - [x] Write unit test: feature.test.ts
   ```
3. Commit the test:
   ```bash
   git add tests/unit/domain/entities/feature.test.ts specs/NNN-feature-name/tasks.md
   git commit -m "test(domain): add failing test for Feature entity (RED phase)"
   ```

#### GREEN: Minimal Implementation

```bash
# Write minimal code to pass the test
# src/domain/entities/feature.ts
```

**CRITICAL**: As soon as the test passes:

1. Run `pnpm test` to confirm it passes
2. **Update tasks.md immediately**:
   ```markdown
   - [x] Implement Feature entity
   ```
3. Commit the implementation:
   ```bash
   git add src/domain/entities/feature.ts specs/NNN-feature-name/tasks.md
   git commit -m "feat(domain): implement Feature entity (GREEN phase)"
   ```

#### REFACTOR: Clean Up

```bash
# Improve code structure, extract helpers, etc.
# Keep tests running (pnpm test:watch)
```

**CRITICAL**: After refactoring:

1. Ensure `pnpm test` still passes
2. **Update tasks.md immediately**:
   ```markdown
   - [x] Refactor Feature entity for clarity
   ```
3. Commit the refactor:
   ```bash
   git add src/domain/entities/feature.ts specs/NNN-feature-name/tasks.md
   git commit -m "refactor(domain): improve Feature entity structure (REFACTOR phase)"
   ```

### After Phase: CI Validation Loop

**MANDATORY**: Every phase completion MUST follow this workflow.

#### 1. Final Phase Commit

```bash
# If you haven't committed recently, do a final phase commit
git add .
git commit -m "feat(scope): complete phase N - <brief description>"
```

#### 2. Push to Remote

```bash
git push
```

#### 3. Watch CI Immediately

```bash
# Get the run ID and watch
gh run watch --exit-status
```

**CRITICAL**: You MUST wait for CI to complete. Don't move to the next phase!

#### 4. If CI Passes ✅

Move to the next phase. Update tasks.md:

```markdown
### Phase 2: Domain Layer (TDD Cycle 1) ✅

**RED (Write Failing Tests First):**

- [x] Write unit test: feature.test.ts

...
```

#### 5. If CI Fails ❌

**Enter Fix Loop** - Do NOT proceed to next phase:

```bash
# Step 1: Get failure logs
gh run view <run-id> --log-failed

# Step 2: Analyze the error
# Read the logs, understand what failed

# Step 3: Fix the issue
# Make necessary code changes

# Step 4: Commit the fix
git add .
git commit -m "fix(scope): resolve CI failure - <what you fixed>"

# Step 5: Push
git push

# Step 6: Watch CI again
gh run watch --exit-status

# Step 7: Repeat Steps 1-6 until CI passes
```

**DO NOT SKIP THE FIX LOOP**. A failing phase blocks all subsequent work.

## Progress Tracking: tasks.md Updates

### Rule: Immediate Updates

**WRONG** ❌:

```
- Work on 5 tasks
- Complete all 5 tasks
- Update tasks.md with all 5 checkboxes at once
```

**RIGHT** ✅:

```
- Complete task 1
- Immediately check it off in tasks.md
- Commit code + tasks.md together
- Complete task 2
- Immediately check it off in tasks.md
- Commit code + tasks.md together
...
```

### Benefits of Frequent Updates

1. **Real-time progress tracking** - Anyone can see current status
2. **Commit history matches progress** - Each commit shows what was done
3. **Easier recovery** - If something breaks, you know exactly where you were
4. **Better reviews** - Reviewers can see incremental progress

### Example: Good Commit Pattern

```bash
# Commit 1: RED phase
git add tests/unit/feature.test.ts specs/NNN-feature-name/tasks.md
git commit -m "test(domain): add Feature entity test (RED)"

# Commit 2: GREEN phase
git add src/domain/entities/feature.ts specs/NNN-feature-name/tasks.md
git commit -m "feat(domain): implement Feature entity (GREEN)"

# Commit 3: REFACTOR phase
git add src/domain/entities/feature.ts specs/NNN-feature-name/tasks.md
git commit -m "refactor(domain): extract helper methods (REFACTOR)"
```

Notice how **every commit includes tasks.md** with updated checkboxes!

## Foundational Phases (No Tests)

Some phases don't require tests (TypeSpec models, build config, etc.).

**Still follow the update discipline**:

1. Complete a foundational task
2. **Update tasks.md immediately**
3. Commit:
   ```bash
   git add <files> specs/NNN-feature-name/tasks.md
   git commit -m "feat(tsp): add Feature domain model"
   ```
4. After phase completion: Push + Watch CI + Fix-loop

## Common Mistakes

### Mistake 1: Batch Updates

❌ Working for hours, then updating tasks.md at the end

✅ Update tasks.md after each item completion

### Mistake 2: Skipping CI Watch

❌ Push and immediately start next phase

✅ Push, watch CI, fix-loop if needed, only then proceed

### Mistake 3: Implementation Before Tests

❌ Write entity, then write tests

✅ Write tests FIRST (RED), then implement (GREEN)

### Mistake 4: Moving On with Red CI

❌ "CI is flaky, I'll fix it later"

✅ Fix immediately in a loop until green

## Quick Reference

### Commands

| Command                            | Purpose                   |
| ---------------------------------- | ------------------------- |
| `pnpm test:watch`                  | TDD mode - auto-run tests |
| `pnpm test`                        | Run all tests             |
| `git add <files> specs/*/tasks.md` | Stage code + task updates |
| `git push`                         | Push to trigger CI        |
| `gh run watch --exit-status`       | Watch CI, exit 1 if fails |
| `gh run view <id> --log-failed`    | Get CI failure logs       |
| `gh run list --limit 5`            | List recent CI runs       |

### TDD Mantra

```
RED (write test, see it fail)
  ↓
GREEN (write code, make it pass)
  ↓
REFACTOR (improve while keeping tests green)
  ↓
UPDATE tasks.md + COMMIT
  ↓
PUSH + WATCH CI
  ↓
FIX-LOOP if needed
  ↓
NEXT PHASE
```

## Integration Tests & E2E

For integration and E2E test phases, the same discipline applies:

1. **RED**: Write failing integration/E2E test
2. **GREEN**: Implement to pass
3. **REFACTOR**: Clean up
4. **Update tasks.md**
5. **Commit + Push + Watch CI**

## When Complete

After all phases are done:

1. **Final validation**:
   ```bash
   pnpm validate  # lint + format + typecheck + tsp
   pnpm test      # all tests pass
   ```
2. **Update spec files** to "Complete" phase
3. **Use `/shep-kit:commit-pr`** for final PR creation with CI validation

## Related Docs

- [Spec-Driven Workflow](./spec-driven-workflow.md) - Overview of the full process
- [TDD Guide](./tdd-guide.md) - Deep dive into Test-Driven Development

---

**Remember**: Implementation discipline prevents bugs, makes reviews easier, and keeps the project maintainable. Follow the rules, update frequently, watch CI always.
