# Example Validation Report

## Scenario 1: All Validations Pass

```
🔍 Running Pre-Implementation Validation...

✓ Completeness Check
  ✓ All required files present
  ✓ All required sections present
  ✓ No unresolved open questions
  ✓ All tasks have acceptance criteria

✓ Architecture & Conventions Check
  ✓ Clean Architecture principles documented
  ✓ TypeSpec definitions planned for domain entities
  ✓ TDD phases defined in all implementation phases
  ✓ Test coverage targets specified
  ✓ Repository pattern used correctly

✓ Cross-Document Consistency Check
  ✓ Task count matches (12 tasks in both plan and tasks.md)
  ✓ Success criteria covered by acceptance criteria
  ✓ Research decisions referenced in plan
  ✓ No contradictions detected
  ✓ All dependencies valid

✅ Validation PASSED - Ready to implement!

Feature 006: CLI Settings Commands
Progress: 0/12 tasks (0%)
Current: task-1
Phase: ready-to-implement

Starting implementation...
```

---

## Scenario 2: Auto-Fixable Issues

```
🔍 Running Pre-Implementation Validation...

✓ Completeness Check
  ⚠️  spec.md missing "Open Questions" section
  ⚠️  3 empty checkbox lines in plan.md

✓ Architecture & Conventions Check
  ✓ Clean Architecture principles documented
  ✓ TypeSpec definitions planned
  ✓ TDD phases defined

✓ Cross-Document Consistency Check
  ✓ All checks passed

🔧 Auto-Fixable Issues Found

The following issues can be fixed automatically:

1. Add "Open Questions" section to spec.md with "None identified."
2. Close 3 empty checkbox lines in plan.md:
   - Line 45: - [ ]
   - Line 89: - [ ]
   - Line 102: - [ ]

Apply auto-fixes? (y/n): y

🔧 Applying fixes...
  ✓ Added "Open Questions" section to spec.md
  ✓ Closed empty checkboxes in plan.md

✅ All issues resolved - Ready to implement!

Starting implementation...
```

---

## Scenario 3: Blocking Issues

```
🔍 Running Pre-Implementation Validation...

❌ Completeness Check
  ❌ Missing required section in spec.md: "Success Criteria"
  ❌ tasks.md: Task 3 has no acceptance criteria
  ❌ spec.md has 2 unresolved open questions:
      - [ ] Which authentication method to use? OAuth2 or JWT?
      - [ ] Should we support SSO from the start?

❌ Architecture & Conventions Check
  ❌ Feature creates domain entities but no TypeSpec definitions planned
  ❌ plan.md missing TDD phases for Phase 2

✓ Cross-Document Consistency Check
  ✓ All checks passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Validation FAILED - Cannot proceed with implementation

Blocking Issues (5):

1. spec.md - Missing "Success Criteria" section
   → Add measurable success criteria with checkboxes

2. tasks.md - Task 3 has no acceptance criteria
   → Define clear acceptance criteria for task completion

3. spec.md - Unresolved open question: Authentication method
   → Decide between OAuth2 and JWT
   → Document decision in research.md
   → Close checkbox in spec.md

4. spec.md - Unresolved open question: SSO support
   → Decide if SSO should be in initial release
   → Document in "Out of Scope" if deferred
   → Close checkbox in spec.md

5. plan.md - Missing TypeSpec definitions for domain entities
   → Add TypeSpec files to "Files to Create" section
   → Include tsp:compile in build flow

6. plan.md - Phase 2 missing TDD phases
   → Add RED-GREEN-REFACTOR cycle for Phase 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fix these issues and re-run /shep-kit:implement
```

---

## Scenario 4: Mixed Issues (Auto-Fix + Blocking)

```
🔍 Running Pre-Implementation Validation...

⚠️  Completeness Check
  ⚠️  spec.md missing "Open Questions" section (auto-fixable)
  ❌ tasks.md: Task 8 has no acceptance criteria (blocking)

✓ Architecture & Conventions Check
  ✓ All checks passed

⚠️  Cross-Document Consistency Check
  ⚠️  Task count mismatch (blocking):
      - tasks.md: 12 tasks
      - plan.md references: 11 tasks
  ⚠️  Size estimate 'M' but complexity seems higher (warning):
      - 18 files planned (M is typically 9-15)
      - 6 phases (M is typically 3-5)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 Auto-Fixable Issues (1):

1. Add "Open Questions" section to spec.md

Apply auto-fixes? (y/n): y

🔧 Applying fixes...
  ✓ Added "Open Questions" section to spec.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Blocking Issues Remain (2):

1. tasks.md - Task 8 has no acceptance criteria
   → Define clear acceptance criteria

2. Task count mismatch between plan and tasks.md
   → Verify correct task count (12 or 11?)
   → Update plan.md or tasks.md accordingly

⚠️  Warnings (1):

1. Size estimate may be understated
   → Consider updating to 'L' (18 files, 6 phases)
   → Or reduce scope to match 'M' estimate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Validation FAILED - Fix blocking issues and re-run
```

---

## Scenario 5: Resuming with Error State

```
🔍 Checking feature.yaml state...

Feature 006: CLI Settings Commands
Progress: 7/12 tasks (58%)
Current: task-8
Phase: blocked

⚠️  Feature is currently BLOCKED

Last error:
  Task: task-8
  Attempt: 3 (max retries exceeded)
  Error: 3 unit tests failing in ShowCommand
  Timestamp: 2026-02-05T15:45:00Z

Error details:
  FAIL tests/unit/presentation/cli/commands/settings/show.command.test.ts
    ShowCommand
      ✗ should format output as table
      ✗ should format output as JSON
      ✗ should format output as YAML

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Manual intervention required.

Options:
1. Fix the issue and re-run /shep-kit:implement (will resume from task-8)
2. Review error details in feature.yaml
3. Run tests manually: pnpm test tests/unit/presentation/cli/commands/settings/show.command.test.ts

After fixing, /shep-kit:implement will automatically resume from task-8.
```

---

## Scenario 6: Successful Resume After Fix

```
🔍 Checking feature.yaml state...

Feature 006: CLI Settings Commands
Progress: 7/12 tasks (58%)
Current: task-8
Phase: implementation

Last error: Resolved at 2026-02-05T16:00:00Z
  (3 unit tests fixed - import paths corrected)

Validating current state...
  ✓ Files for task-7 exist
  ✓ Tests for completed work passing
  ✓ Build succeeds

✅ Resuming from task-8

Starting task-8: "Implement init command"...
```

---

## Scenario 7: Warnings Only (Non-Blocking)

```
🔍 Running Pre-Implementation Validation...

✓ Completeness Check
  ✓ All checks passed

✓ Architecture & Conventions Check
  ⚠️  Testing strategy doesn't mention integration tests (warning)
  ⚠️  Phase 3 missing REFACTOR phase (recommended)

✓ Cross-Document Consistency Check
  ⚠️  Technology 'cli-table3' chosen in research but not mentioned in plan (warning)
  ⚠️  Affected area 'domain/' not represented in planned files (warning)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Validation PASSED with warnings

⚠️  4 warnings found (non-blocking):

1. Testing strategy doesn't mention integration tests
   → Consider adding integration tests for repository

2. Phase 3 missing REFACTOR phase
   → Add REFACTOR step after tests pass

3. Technology 'cli-table3' not mentioned in plan
   → Ensure plan reflects research decisions

4. Affected area 'domain/' not in planned files
   → Verify if domain changes are needed

Continue with implementation? (y/n): y

Starting implementation...
```

---

## Summary

**Exit Codes:**

- `0` - Validation passed, implementation starts
- `1` - Blocking issues found, implementation stopped
- `2` - Auto-fixes applied, user approval required

**Report Sections:**

1. **Check Results** - ✓ passed, ⚠️ warnings, ❌ failures
2. **Auto-Fixes** - Applied fixes (with user approval)
3. **Blocking Issues** - Must be fixed manually
4. **Warnings** - Recommendations (non-blocking)
5. **Next Steps** - Clear action items
