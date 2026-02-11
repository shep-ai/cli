## Status

- **Phase:** Implementation
- **Updated:** 2026-02-11

## Task List

### Phase 1: Foundation & Storybook Reset (No TDD)

- [ ] **Task 1:** Install Storybook addons and @tailwindcss/vite, create directory skeleton
- [ ] **Task 2:** Reconfigure Storybook main.ts and preview.tsx (addons, stories glob, viteFinal, storySort)
- [ ] **Task 3:** Create design system MDX documentation (Colors, Typography, GettingStarted)

### Phase 2: Migration & Barrel Cleanup (TDD Cycle 1)

**RED (Write Failing Tests First):**

- [ ] Run existing tests as baseline, update imports to new paths (should fail)

**GREEN (Implement to Pass Tests):**

- [ ] **Task 4:** Migrate ThemeToggle from features/ to common/, fix all imports
- [ ] **Task 5:** Remove tier-level barrel exports (ui/index.ts, features/index.ts), update all imports to direct paths

**REFACTOR (Clean Up):**

- [ ] Rename all 12 ui/ story titles from UI/ to Primitives/
- [ ] Rename ThemeToggle story to Composed/ThemeToggle

### Phase 3: Common Components (TDD Cycle 2) [P — Parallelizable]

**RED → GREEN → REFACTOR per component:**

- [ ] **Task 6 [P]:** Implement page-header (title, description, action slot) with tests + stories
- [ ] **Task 7 [P]:** Implement empty-state (icon, title, description, CTA) with tests + stories
- [ ] **Task 8 [P]:** Implement loading-skeleton (line/circle/card variants) with tests + stories

### Phase 4: Layout Components (TDD Cycle 3)

**RED → GREEN → REFACTOR:**

- [ ] **Task 9:** Implement sidebar (nav items, active state) and header (title, slots) with tests + stories
- [ ] **Task 10:** Implement dashboard-layout shell (sidebar + header + content) with tests + stories

### Phase 5: Feature Integration (TDD Cycle 4)

**RED → GREEN → REFACTOR:**

- [ ] **Task 11:** Reorganize feature components (version/, settings/), wire up DashboardLayout in app pages

### Phase 6: Validation & Cleanup

- [ ] **Task 12:** Run full validation suite, update documentation, verify all success criteria

## TDD Notes

- **MANDATORY**: All phases with code follow RED → GREEN → REFACTOR
- **RED**: Write failing tests FIRST (never skip this!)
- **GREEN**: Write minimal code to pass tests
- **REFACTOR**: Improve code while keeping tests green

## Progress Tracking (CRITICAL)

- **Update checkboxes FREQUENTLY** — as soon as each item is complete!
- **Don't batch updates** — check off items immediately, not at the end
- **Commit task.md updates** along with code changes to show progress

## Acceptance Checklist

Before marking feature complete:

- [ ] All 12 tasks completed
- [ ] Tests passing (`pnpm test`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Types valid (`pnpm typecheck && pnpm typecheck:web`)
- [ ] Storybook builds (`pnpm build:storybook`)
- [ ] Web app builds (`pnpm build:web`)
- [ ] Documentation updated (docs/ui/)
- [ ] All 10 success criteria from spec.yaml verified
- [ ] PR created and reviewed

---

_Task breakdown for implementation tracking_
