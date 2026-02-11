## Status

- **Phase:** Implementation
- **Updated:** 2026-02-11

## Task List

### Phase 1: Foundation

- [ ] **Task 1:** Install shadcn primitives, add CSS variables, create barrel exports
  - Install shadcn sidebar, scroll-area, separator, tooltip
  - Add `--color-sidebar-*` CSS variables to globals.css
  - Create barrel exports: `ui/index.ts`, `common/index.ts`, `layouts/index.ts`
  - Note: `common/` and `layouts/` directories already exist from 013-ui-arch

### Phase 2: Simple Composed Components (TDD) [P]

**ElapsedTime — Task 2:**

**RED (Write Failing Tests First):**

- [ ] Test initial render shows 00:00
- [ ] Test timer ticks to 00:01 after 1 second
- [ ] Test formats as mm:ss (e.g., 05:30)
- [ ] Test switches to Xh format for >= 1 hour
- [ ] Test interval cleanup on unmount

**GREEN (Implement to Pass Tests):**

- [ ] Implement ElapsedTime with useState + useEffect + setInterval
- [ ] Implement formatElapsed function

**REFACTOR:**

- [ ] Extract formatElapsed as standalone pure function

- [ ] Add Storybook stories (default, running 5min, running 2h)

---

**SidebarNavItem — Task 3:**

**RED (Write Failing Tests First):**

- [ ] Test renders label text
- [ ] Test renders icon element
- [ ] Test active state styling
- [ ] Test link with correct href

**GREEN (Implement to Pass Tests):**

- [ ] Implement SidebarNavItem with SidebarMenuButton

**REFACTOR:**

- [ ] Clean up className composition

- [ ] Add Storybook stories (default, active, various icons)

### Phase 3: Feature List Components (TDD)

**FeatureListItem + FeatureStatusGroup — Task 4:**

**RED (Write Failing Tests First):**

- [ ] Test FeatureListItem renders name
- [ ] Test action-needed shows pending icon
- [ ] Test in-progress shows ElapsedTime
- [ ] Test done shows duration string
- [ ] Test onClick fires
- [ ] Test FeatureStatusGroup renders label
- [ ] Test FeatureStatusGroup shows count badge
- [ ] Test FeatureStatusGroup renders children

**GREEN (Implement to Pass Tests):**

- [ ] Implement FeatureListItem with status-conditional rendering
- [ ] Implement FeatureStatusGroup with SidebarGroup + Badge

**REFACTOR:**

- [ ] Extract status icon mapping
- [ ] Clean up FeatureStatus type

- [ ] Add Storybook stories for both components (all variants)

### Phase 4: Layout Assembly (TDD)

**AppSidebar — Task 5:**

**RED (Write Failing Tests First):**

- [ ] Test header renders Control Center nav item
- [ ] Test header renders Memory nav item
- [ ] Test content renders Features label
- [ ] Test features grouped by status
- [ ] Test footer renders New feature button
- [ ] Test onNewFeature callback fires

**GREEN (Implement to Pass Tests):**

- [ ] Implement AppSidebar composing all building blocks

**REFACTOR:**

- [ ] Extract mock data to constants
- [ ] Optimize component structure

- [ ] Add Storybook story with mock feature data

### Phase 5: Validation & Polish

- [ ] **Task 6:** Run verification
  - [ ] `pnpm build:storybook` passes
  - [ ] `pnpm build:web` passes
  - [ ] `pnpm lint:web` passes
  - [ ] `pnpm typecheck:web` passes
  - [ ] `pnpm test` passes

## TDD Notes

- **MANDATORY**: All phases with code follow RED -> GREEN -> REFACTOR
- **RED**: Write failing tests FIRST (never skip this!)
- **GREEN**: Write minimal code to pass tests
- **REFACTOR**: Improve code while keeping tests green

## Progress Tracking (CRITICAL)

- **Update checkboxes FREQUENTLY** - as soon as each item is complete!
- **Don't batch updates** - check off items immediately, not at the end
- **Commit task.md updates** along with code changes to show progress

## Acceptance Checklist

Before marking feature complete:

- [ ] All tasks completed
- [ ] Tests passing (`pnpm test`)
- [ ] Linting clean (`pnpm lint:web`)
- [ ] Types valid (`pnpm typecheck:web`)
- [ ] Storybook builds (`pnpm build:storybook`)
- [ ] Web app builds (`pnpm build:web`)
- [ ] PR created and reviewed

---

_Task breakdown for implementation tracking_
