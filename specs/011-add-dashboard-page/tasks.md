# Tasks: add-dashboard-page

> Task breakdown for 011-add-dashboard-page

## Status

- **Phase:** Implementation
- **Updated:** 2026-02-08

## Task List

### Phase 1: Foundation Setup

- [ ] Create `src/presentation/web/lib/dashboard-config.ts` with polling interval constant (30s)
- [ ] Create `src/presentation/web/lib/lifecycle-colors.ts` with color mapping function

### Phase 2: Application Layer - Use Case (TDD)

- [ ] **RED**: Write `tests/unit/application/use-cases/dashboard/get-dashboard-data.use-case.spec.ts` with 5 test cases
- [ ] **GREEN**: Implement `src/application/use-cases/dashboard/get-dashboard-data.use-case.ts` to pass tests
- [ ] **REFACTOR**: Clean up use case, add JSDoc comments
- [ ] Create `src/application/use-cases/dashboard/index.ts` barrel export

### Phase 3: Application Ports - Repository Interface

- [ ] Create `src/application/ports/output/feature.repository.interface.ts` with IFeatureRepository interface
- [ ] Export IFeatureRepository in `src/application/ports/output/index.ts`

### Phase 4: Infrastructure Layer - Repository (TDD)

- [ ] **RED**: Write `tests/integration/infrastructure/repositories/sqlite-feature.repository.spec.ts` with 6 test cases
- [ ] **GREEN**: Implement `src/infrastructure/repositories/sqlite-feature.repository.ts` to pass tests
- [ ] **REFACTOR**: Optimize SQL queries, add database indexes

### Phase 5: Infrastructure - DI Container

- [ ] Register IFeatureRepository in `src/infrastructure/di/container.ts`
- [ ] Register GetDashboardDataUseCase in `src/infrastructure/di/container.ts`
- [ ] Export GetDashboardDataUseCase in `src/application/use-cases/index.ts`

### Phase 6: Presentation Layer - UI Components (TDD) [P]

**All tasks in Phase 6 can be done in parallel:**

- [ ] **RED**: Write `tests/unit/presentation/web/components/features/feature-card.spec.tsx`
- [ ] **GREEN**: Implement `src/presentation/web/components/features/feature-card.tsx`
- [ ] **REFACTOR**: Clean up FeatureCard component
- [ ] **RED**: Write `tests/unit/presentation/web/components/features/lifecycle-badge.spec.tsx`
- [ ] **GREEN**: Implement `src/presentation/web/components/features/lifecycle-badge.tsx`
- [ ] **REFACTOR**: Clean up LifecycleBadge component
- [ ] **RED**: Write `tests/unit/presentation/web/components/features/task-progress.spec.tsx`
- [ ] **GREEN**: Implement `src/presentation/web/components/features/task-progress.tsx`
- [ ] **REFACTOR**: Clean up TaskProgress component
- [ ] **RED**: Write `tests/unit/presentation/web/components/features/activity-timeline.spec.tsx`
- [ ] **GREEN**: Implement `src/presentation/web/components/features/activity-timeline.tsx`
- [ ] **REFACTOR**: Clean up ActivityTimeline component
- [ ] Export all components in `src/presentation/web/components/features/index.ts`

### Phase 7: Presentation Layer - Client Component (TDD)

- [ ] **RED**: Write `tests/unit/presentation/web/app/dashboard-client.spec.tsx` with 6 test cases
- [ ] **GREEN**: Implement `src/presentation/web/app/dashboard-client.tsx` to pass tests
- [ ] **REFACTOR**: Extract `useDashboardPolling` hook, add Page Visibility API

### Phase 8: Presentation Layer - Server Component Page (TDD)

- [ ] Backup existing `src/presentation/web/app/page.tsx` (save content for potential `/about` page)
- [ ] **RED**: Write `tests/integration/presentation/web/app/page.spec.tsx` with 4 test cases
- [ ] **GREEN**: Implement new `src/presentation/web/app/page.tsx` (Server Component) to pass tests
- [ ] **REFACTOR**: Add error handling UI

### Phase 9: E2E Tests (TDD)

- [ ] **RED**: Write `tests/e2e/dashboard.spec.ts` with 6 test cases
- [ ] **GREEN**: Fix any integration bugs found during E2E tests
- [ ] **REFACTOR**: Add test helpers for seeding data, improve test stability

### Phase 10: Storybook Stories [P]

**All tasks in Phase 10 can be done in parallel:**

- [ ] Create `src/presentation/web/components/features/feature-card.stories.tsx` with variants
- [ ] Create `src/presentation/web/components/features/lifecycle-badge.stories.tsx` with lifecycle phases
- [ ] Create `src/presentation/web/components/features/task-progress.stories.tsx` with edge cases
- [ ] Create `src/presentation/web/components/features/activity-timeline.stories.tsx` with empty state
- [ ] Create `src/presentation/web/app/dashboard-client.stories.tsx` with filters

---

## Task Count Summary

**Total Tasks**: 42

**By Phase:**

- Phase 1: 2 tasks
- Phase 2: 4 tasks
- Phase 3: 2 tasks
- Phase 4: 3 tasks
- Phase 5: 3 tasks
- Phase 6: 13 tasks [P]
- Phase 7: 3 tasks
- Phase 8: 4 tasks
- Phase 9: 3 tasks
- Phase 10: 5 tasks [P]

---

## Parallelization Notes

- **Phase 6 [P]**: All UI component tasks (feature-card, lifecycle-badge, task-progress, activity-timeline) can be executed concurrently since they are independent components with no shared dependencies
- **Phase 10 [P]**: All Storybook story tasks can be executed concurrently since they are documentation-only and don't affect each other

**Suggested parallelization strategy:**

1. Phases 1-5: Execute sequentially (foundational work)
2. Phase 6: Split into 4 parallel tracks (one per component)
3. Phases 7-9: Execute sequentially (integration work)
4. Phase 10: Split into 5 parallel tracks (one per story file)

---

## Acceptance Checklist

Before marking feature complete:

- [ ] All 42 tasks completed
- [ ] All tests passing (`pnpm test`)
- [ ] All tests passing in web package (`pnpm --filter @shepai/web test`)
- [ ] Linting clean (`pnpm lint` and `pnpm lint:web`)
- [ ] Types valid (`pnpm typecheck` and `pnpm typecheck:web`)
- [ ] TypeSpec compiles (`pnpm tsp:compile`)
- [ ] Storybook builds (`pnpm build:storybook`)
- [ ] E2E tests pass (`pnpm test:e2e`)
- [ ] All spec file statuses updated to "Complete"
- [ ] PR created with `/shep-kit:commit-pr`

---

_Task breakdown for implementation tracking_
