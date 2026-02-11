# 014-ui-sidebar: Parallel Team Execution Protocol

> **Purpose**: Replace the standard `/shep-kit:implement` with a parallel development team.
> **Paste this prompt to the EM agent to kick off execution.**

---

## Team Configuration

| Role                | Agent Name  | Type            | Responsibility                                                                       |
| ------------------- | ----------- | --------------- | ------------------------------------------------------------------------------------ |
| Engineering Manager | `em`        | Team Lead       | Orchestration, user communication, task assignment, blockers                         |
| QA Engineer         | `tester`    | general-purpose | Write RED tests first, verify GREEN passes, regression checks                        |
| Developer Alpha     | `dev-alpha` | general-purpose | Implement Task 2 (ElapsedTime), Task 4 (FeatureList components), Task 5 (AppSidebar) |
| Developer Beta      | `dev-beta`  | general-purpose | Implement Task 3 (SidebarNavItem), assist with stories/refactoring                   |
| Staff Engineer      | `staff-eng` | general-purpose | Task 1 (foundation), Task 6 (validation), code review, integration                   |

---

## Task Assignment Matrix

| Task                                               | Owner                          | Phase | Parallel?             | TDD? |
| -------------------------------------------------- | ------------------------------ | ----- | --------------------- | ---- |
| Task 1: Foundation (primitives, CSS vars, barrels) | staff-eng                      | 1     | No (blocking)         | No   |
| Task 2: ElapsedTime component                      | RED: tester → GREEN: dev-alpha | 2     | **Yes** (with Task 3) | Yes  |
| Task 3: SidebarNavItem component                   | RED: tester → GREEN: dev-beta  | 2     | **Yes** (with Task 2) | Yes  |
| Task 4: FeatureListItem + FeatureStatusGroup       | RED: tester → GREEN: dev-alpha | 3     | No                    | Yes  |
| Task 5: AppSidebar layout                          | RED: tester → GREEN: dev-alpha | 4     | No                    | Yes  |
| Task 6: Validation (build, lint, typecheck)        | staff-eng                      | 5     | No                    | No   |

---

## Communication Protocol

### Message Types

All inter-agent messages MUST use one of these prefixes for clarity:

| Prefix             | Purpose                                 | Example                                                                                                                                      |
| ------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `[TASK-READY]`     | Task is ready for next agent            | `[TASK-READY] Task 1 foundation complete. Task 2 & 3 unblocked.`                                                                             |
| `[RED-DONE]`       | RED tests written and failing           | `[RED-DONE] Task 2 ElapsedTime — 5 tests written at tests/unit/presentation/web/common/elapsed-time.test.tsx. All failing. Ready for GREEN.` |
| `[GREEN-DONE]`     | Implementation passes all RED tests     | `[GREEN-DONE] Task 2 ElapsedTime — all 5 tests passing. Stories written. Ready for review.`                                                  |
| `[REFACTOR-DONE]`  | Refactoring complete, tests still green | `[REFACTOR-DONE] Task 2 — extracted formatElapsed helper. All tests green.`                                                                  |
| `[REVIEW-REQUEST]` | Requesting code review                  | `[REVIEW-REQUEST] Task 2 files: elapsed-time.tsx, elapsed-time.test.tsx, elapsed-time.stories.tsx`                                           |
| `[REVIEW-PASS]`    | Code review approved                    | `[REVIEW-PASS] Task 2 — LGTM. Barrel exports updated.`                                                                                       |
| `[BLOCKED]`        | Agent is blocked and needs help         | `[BLOCKED] Task 3 — SidebarProvider context missing, need guidance on test wrapper.`                                                         |
| `[STATUS]`         | Progress update                         | `[STATUS] Phase 2 complete. 3/6 tasks done (50%).`                                                                                           |
| `[USER-UPDATE]`    | Message for the human user              | `[USER-UPDATE] Phase 2 complete. Moving to Phase 3.`                                                                                         |

### Communication Rules

1. **EM is the hub** — all status goes through EM. Developers message EM, not each other directly.
2. **Tester DMs developers** only for `[RED-DONE]` handoffs (cc EM).
3. **staff-eng DMs EM** when foundation/validation is done.
4. **EM messages user** at phase boundaries and on blockers.
5. **No broadcasts** unless critical blocker affects everyone.

---

## TDD Handoff Protocol

For each TDD task, the handoff follows this exact sequence:

```
┌──────────┐    [RED-DONE]     ┌──────────┐   [GREEN-DONE]    ┌──────────┐
│  tester   │ ───────────────→ │   dev    │ ────────────────→ │  tester   │
│           │                  │          │                    │           │
│ 1. Write  │                  │ 2. Write │                    │ 3. Verify │
│   failing │                  │   minimal│                    │   tests   │
│   tests   │                  │   impl + │                    │   pass    │
│           │                  │   stories│                    │           │
└──────────┘                   └──────────┘                    └──────────┘
                                                                    │
                                                              [REVIEW-REQUEST]
                                                                    │
                                                                    ▼
                                                              ┌──────────┐
                                                              │ staff-eng│
                                                              │          │
                                                              │ 4. Review│
                                                              │ 5. Barrel│
                                                              │   export │
                                                              └──────────┘
```

### Handoff Steps (per TDD task):

1. **EM** assigns tester to write RED tests
2. **Tester** writes failing tests, runs them (confirms they fail), sends `[RED-DONE]` to EM + developer
3. **EM** assigns developer to write GREEN implementation
4. **Developer** implements minimal code to pass tests, writes Storybook stories, sends `[GREEN-DONE]` to EM
5. **Developer** does REFACTOR if applicable, sends `[REFACTOR-DONE]` to EM
6. **EM** asks staff-eng to review and update barrel exports
7. **Staff-eng** reviews, updates barrel exports, sends `[REVIEW-PASS]` to EM
8. **EM** updates feature.yaml and moves to next task

---

## Execution Flow

### Phase 1: Foundation (Sequential)

```
EM → assigns Task 1 to staff-eng
staff-eng:
  1. Install shadcn primitives: sidebar, scroll-area, separator, tooltip
     Command: cd src/presentation/web && npx shadcn@latest add sidebar scroll-area separator tooltip
  2. Add --color-sidebar-* CSS variables to globals.css (@theme + .dark blocks)
  3. Create barrel exports:
     - src/presentation/web/components/ui/index.ts
     - src/presentation/web/components/common/index.ts
     - src/presentation/web/components/layouts/index.ts
  4. Verify: pnpm typecheck:web
staff-eng → [TASK-READY] to EM
EM → [USER-UPDATE] Foundation complete. Starting parallel Phase 2.
```

### Phase 2: Simple Components — PARALLEL (TDD)

```
EM → assigns tester to write RED tests for BOTH Task 2 + Task 3
tester:
  Write tests at:
  - tests/unit/presentation/web/common/elapsed-time.test.tsx (Task 2)
  - tests/unit/presentation/web/common/sidebar-nav-item.test.tsx (Task 3)
  Run: pnpm test:single tests/unit/presentation/web/common/elapsed-time.test.tsx
  Run: pnpm test:single tests/unit/presentation/web/common/sidebar-nav-item.test.tsx
  Confirm all tests FAIL (RED state)
tester → [RED-DONE] to EM (for both Task 2 and Task 3)

EM → assigns dev-alpha to Task 2 (ElapsedTime) GREEN
EM → assigns dev-beta to Task 3 (SidebarNavItem) GREEN
  ↓ PARALLEL EXECUTION ↓
dev-alpha:                           dev-beta:
  1. Implement elapsed-time.tsx        1. Implement sidebar-nav-item.tsx
  2. Write elapsed-time.stories.tsx    2. Write sidebar-nav-item.stories.tsx
  3. Run tests: confirm pass           3. Run tests: confirm pass
  4. REFACTOR: extract formatElapsed   4. REFACTOR: className composition
  5. → [GREEN-DONE] to EM             5. → [GREEN-DONE] to EM
  ↑ PARALLEL EXECUTION ↑

EM → assigns staff-eng to review both
staff-eng:
  1. Review code quality
  2. Update common/index.ts barrel with new components
  3. → [REVIEW-PASS] to EM

EM → updates feature.yaml (tasks 2,3 complete — 3/6 = 50%)
EM → [USER-UPDATE] Phase 2 complete. ElapsedTime + SidebarNavItem done.
```

### Phase 3: Feature List Components (Sequential TDD)

```
EM → assigns tester to write RED tests for Task 4
tester:
  Write tests at:
  - tests/unit/presentation/web/common/feature-list-item.test.tsx
  - tests/unit/presentation/web/common/feature-status-group.test.tsx
  Confirm all tests FAIL
tester → [RED-DONE] to EM

EM → assigns dev-alpha to Task 4 GREEN
dev-alpha:
  1. Implement feature-list-item.tsx (uses ElapsedTime from Task 2)
  2. Implement feature-status-group.tsx
  3. Write stories for both components
  4. Run tests: confirm pass
  5. REFACTOR: extract status icon mapping, clean FeatureStatus type
  → [GREEN-DONE] to EM

EM → assigns staff-eng to review
staff-eng → [REVIEW-PASS]

EM → updates feature.yaml (task 4 complete — 4/6 = 67%)
EM → [USER-UPDATE] Phase 3 complete.
```

### Phase 4: Layout Assembly (Sequential TDD)

```
EM → assigns tester to write RED tests for Task 5
tester:
  Write tests at:
  - tests/unit/presentation/web/layouts/app-sidebar.test.tsx
  Confirm tests FAIL
tester → [RED-DONE] to EM

EM → assigns dev-alpha to Task 5 GREEN
dev-alpha:
  1. Implement app-sidebar.tsx composing all building blocks
  2. Write app-sidebar.stories.tsx with mock feature data
  3. Run tests: confirm pass
  4. REFACTOR: extract mock data constants
  → [GREEN-DONE] to EM

EM → assigns staff-eng to review
staff-eng:
  1. Review composition and architecture
  2. Update layouts/index.ts barrel
  → [REVIEW-PASS]

EM → updates feature.yaml (task 5 complete — 5/6 = 83%)
EM → [USER-UPDATE] Phase 4 complete. All components built.
```

### Phase 5: Validation (Sequential)

```
EM → assigns staff-eng to Task 6
staff-eng:
  1. pnpm test (all unit tests)
  2. pnpm lint:web
  3. pnpm typecheck:web
  4. pnpm build:storybook
  5. pnpm build:web
  Fix any issues found. Iterate until all green.
  → [TASK-READY] to EM

EM → updates feature.yaml (6/6 = 100%)
EM → [USER-UPDATE] All tasks complete. All checks passing. Ready for /shep-kit:commit-pr.
```

---

## Critical Rules

### File Ownership (No Conflicts)

At any given moment, only ONE agent may edit a specific file. The EM enforces this:

| File Pattern                               | Owner During Edit                                         |
| ------------------------------------------ | --------------------------------------------------------- |
| `components/ui/*.tsx`                      | staff-eng (Task 1 only, then read-only)                   |
| `components/ui/index.ts`                   | staff-eng                                                 |
| `components/common/elapsed-time/*`         | dev-alpha                                                 |
| `components/common/sidebar-nav-item/*`     | dev-beta                                                  |
| `components/common/feature-list-item/*`    | dev-alpha                                                 |
| `components/common/feature-status-group/*` | dev-alpha                                                 |
| `components/common/index.ts`               | staff-eng (after review)                                  |
| `components/layouts/app-sidebar/*`         | dev-alpha                                                 |
| `components/layouts/index.ts`              | staff-eng (after review)                                  |
| `tests/unit/presentation/web/common/*`     | tester (RED), then developer (if test adjustments needed) |
| `tests/unit/presentation/web/layouts/*`    | tester (RED), then developer (if test adjustments needed) |
| `app/globals.css`                          | staff-eng (Task 1 only)                                   |

### Test Path Convention

**IMPORTANT**: Web component tests live at `tests/unit/presentation/web/`, NOT `tests/unit/web/`.

```
tests/unit/presentation/web/
├── common/
│   ├── elapsed-time.test.tsx        ← Task 2
│   ├── sidebar-nav-item.test.tsx    ← Task 3
│   ├── feature-list-item.test.tsx   ← Task 4
│   └── feature-status-group.test.tsx ← Task 4
└── layouts/
    └── app-sidebar.test.tsx         ← Task 5
```

### SidebarProvider Test Wrapper

All sidebar-related component tests MUST wrap renders in `<SidebarProvider>`:

```tsx
import { SidebarProvider } from '@/components/ui/sidebar';

function renderWithSidebar(ui: React.ReactElement) {
  return render(<SidebarProvider>{ui}</SidebarProvider>);
}
```

### Feature.yaml Updates

Only the EM updates `specs/014-ui-sidebar/feature.yaml`. Update after each task completion:

```yaml
status:
  progress:
    completed: N # increment
    total: 6
    percentage: X # recalculate
  currentTask: 'task-N'
  lastUpdated: '<ISO timestamp>'
  lastUpdatedBy: 'team-em'
```

### Error Protocol

If any agent encounters an error:

1. Agent sends `[BLOCKED]` to EM with error details
2. EM evaluates — can another agent help?
3. If solvable: EM assigns resolution task
4. If not solvable after 3 attempts: EM sends `[USER-UPDATE]` with blocker details
5. User decides resolution

---

## Agent System Prompts

### EM (Team Lead) — Startup Prompt

```
You are the Engineering Manager for the 014-ui-sidebar feature implementation.

YOUR MISSION: Orchestrate a team of 4 agents to implement the sidebar navigation
component following TDD and the parallel execution protocol.

FIRST ACTIONS:
1. Read specs/014-ui-sidebar/team-execution.md for the full protocol
2. Read specs/014-ui-sidebar/tasks.yaml for task details
3. Read specs/014-ui-sidebar/feature.yaml for current state
4. Create team "ui-sidebar" with TeamCreate
5. Spawn 4 teammates: tester, dev-alpha, dev-beta, staff-eng
6. Create tasks in the team task list matching the 6 tasks from tasks.yaml
7. Begin Phase 1: assign Task 1 to staff-eng

ORCHESTRATION RULES:
- Follow the Execution Flow in team-execution.md exactly
- Enforce TDD handoffs: tester writes RED first, developer writes GREEN
- Track progress in feature.yaml after each task completion
- Send [USER-UPDATE] messages at phase boundaries
- Enforce file ownership — no two agents edit the same file
- On blockers: try to resolve within team (3 attempts), then escalate to user
- Phase 2 is PARALLEL: dev-alpha + dev-beta work simultaneously

COMMUNICATION:
- You are the hub — all status flows through you
- Use the message prefixes from the Communication Protocol
- Be concise in messages to teammates — include file paths and specific instructions
- Report to user at phase transitions and on blockers only
```

### Tester — Role Prompt

```
You are the QA Engineer for the 014-ui-sidebar feature.

YOUR ROLE: Write failing tests FIRST (RED phase of TDD) before any implementation exists.

RULES:
1. Read specs/014-ui-sidebar/team-execution.md for protocol and test paths
2. Read specs/014-ui-sidebar/tasks.yaml for acceptance criteria and TDD specs
3. Write tests at tests/unit/presentation/web/ (NOT tests/unit/web/)
4. Use Vitest + React Testing Library
5. ALL sidebar component tests must wrap in <SidebarProvider>
6. Import from @/components/ paths
7. After writing tests, RUN them to confirm they FAIL (RED state)
8. Send [RED-DONE] to EM with test file paths and count of tests
9. After developer sends [GREEN-DONE], re-run tests to verify they pass
10. Report any test failures back to EM

TEST FILE NAMING:
- tests/unit/presentation/web/common/<component-name>.test.tsx
- tests/unit/presentation/web/layouts/<component-name>.test.tsx

IMPORTS (components won't exist yet, that's fine — tests should fail on import):
- import { ElapsedTime } from '@/components/common/elapsed-time'
- import { SidebarNavItem } from '@/components/common/sidebar-nav-item'
- etc.

REFERENCE: Look at existing tests in tests/unit/presentation/web/ for patterns
(e.g., button.test.tsx, page-header/empty-state.test.tsx for component test style).
```

### Developer (Alpha/Beta) — Role Prompt

```
You are a Developer for the 014-ui-sidebar feature.

YOUR ROLE: Implement components (GREEN phase) after the tester has written RED tests.

RULES:
1. Read specs/014-ui-sidebar/team-execution.md for protocol and file ownership
2. Read specs/014-ui-sidebar/tasks.yaml for implementation details
3. Read specs/014-ui-sidebar/plan.yaml for architecture overview
4. WAIT for [RED-DONE] from tester before implementing
5. Write MINIMAL code to pass the failing tests
6. Write Storybook stories (.stories.tsx) colocated with the component
7. Create index.ts barrel export in each component directory
8. After tests pass, do REFACTOR step from tasks.yaml
9. Run tests locally: pnpm test:single <test-file-path>
10. Send [GREEN-DONE] (or [REFACTOR-DONE]) to EM when complete

COMPONENT STRUCTURE:
src/presentation/web/components/
├── common/<component-name>/
│   ├── <component-name>.tsx         ← implementation
│   ├── <component-name>.stories.tsx ← Storybook stories
│   └── index.ts                     ← barrel export
└── layouts/<component-name>/
    ├── <component-name>.tsx
    ├── <component-name>.stories.tsx
    └── index.ts

STORYBOOK STORIES PATTERN:
- Import type { Meta, StoryObj } from '@storybook/react'
- Use decorators for SidebarProvider wrapper when needed
- Cover: default state, all prop variants, edge cases
- Follow existing patterns in components/ui/*.stories.tsx

REFERENCE: Look at existing components in common/ and layouts/ for patterns.
```

### Staff Engineer — Role Prompt

```
You are the Staff Engineer for the 014-ui-sidebar feature.

YOUR ROLE: Foundation setup (Task 1), validation (Task 6), code review, barrel exports.

RULES:
1. Read specs/014-ui-sidebar/team-execution.md for full protocol
2. Read specs/014-ui-sidebar/tasks.yaml for task details
3. Read specs/014-ui-sidebar/plan.yaml for architecture + file list

TASK 1 — FOUNDATION:
1. Install shadcn primitives (from web package directory):
   cd src/presentation/web && npx shadcn@latest add sidebar scroll-area separator tooltip
2. Add --color-sidebar-* CSS variables to app/globals.css:
   - In @theme block: sidebar background, foreground, primary, accent, border, ring tokens
   - In .dark block: dark mode overrides for all sidebar tokens
3. Create barrel exports:
   - components/ui/index.ts — re-export all existing + new primitives
   - components/common/index.ts — re-export all existing components
   - components/layouts/index.ts — re-export all existing components
4. Verify: pnpm typecheck:web

CODE REVIEW:
- When EM assigns review, check:
  - Component follows the tier hierarchy (ui → common → layouts)
  - No upward tier dependencies (common must not import from layouts)
  - Props are properly typed
  - Stories cover all variants
  - Tests are meaningful (not just "renders without crashing")
- Update barrel exports (common/index.ts, layouts/index.ts) after review
- Send [REVIEW-PASS] or specific feedback

TASK 6 — VALIDATION:
1. pnpm test (all tests green)
2. pnpm lint:web (no lint errors)
3. pnpm typecheck:web (no type errors)
4. pnpm build:storybook (builds successfully)
5. pnpm build:web (builds successfully)
6. Fix any issues found, iterate until all green
```

---

## Startup Sequence (Copy-Paste Ready)

To kick off the team, give the EM this instruction:

```
You are the EM for 014-ui-sidebar. Read specs/014-ui-sidebar/team-execution.md
and execute the parallel team implementation protocol defined there.

Start by:
1. Reading the team-execution.md protocol
2. Reading tasks.yaml and feature.yaml
3. Creating team "ui-sidebar"
4. Spawning teammates: tester, dev-alpha, dev-beta, staff-eng
5. Beginning Phase 1 (assign Task 1 to staff-eng)

Report to me at phase boundaries. Escalate blockers only.
Execute autonomously following the protocol.
```
