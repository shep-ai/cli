# Plan: add-dashboard-page

> Implementation plan for 011-add-dashboard-page

## Status

- **Phase:** Planning
- **Updated:** 2026-02-08

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js App Router                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  app/page.tsx (Server Component)                          │  │
│  │  - Fetches initial dashboard data via use case            │  │
│  │  - Passes data to Client Component                        │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│                       v                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  dashboard-client.tsx (Client Component)                  │  │
│  │  - Renders feature cards with lifecycle badges            │  │
│  │  - Tabs for filtering by lifecycle phase                  │  │
│  │  - Task progress metrics                                  │  │
│  │  - Activity timeline                                      │  │
│  │  - Polling hook (useEffect + setInterval)                 │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
└───────────────────────┼──────────────────────────────────────────┘
                        │
                        v
┌─────────────────────────────────────────────────────────────────┐
│                   Application Layer (Use Cases)                  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  GetDashboardDataUseCase                                  │  │
│  │  - Orchestrates data fetching for dashboard              │  │
│  │  - Returns: features, task metrics, timeline events       │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
└───────────────────────┼──────────────────────────────────────────┘
                        │
                        v
┌─────────────────────────────────────────────────────────────────┐
│                 Application Ports (Interfaces)                   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  IFeatureRepository                                       │  │
│  │  - findAll(options)                                       │  │
│  │  - findByLifecycle(lifecycle)                            │  │
│  │  - getTaskMetrics(featureId)                             │  │
│  │  - getRecentTimeline(limit)                              │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
└───────────────────────┼──────────────────────────────────────────┘
                        │
                        v
┌─────────────────────────────────────────────────────────────────┐
│               Infrastructure Layer (Repositories)                │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SQLiteFeatureRepository                                  │  │
│  │  - Implements IFeatureRepository                          │  │
│  │  - Executes parameterized SQLite queries                  │  │
│  │  - Returns TypeSpec-generated types                       │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
└───────────────────────┼──────────────────────────────────────────┘
                        │
                        v
┌─────────────────────────────────────────────────────────────────┐
│                    SQLite Database (~/.shep/)                    │
│  - features table                                                │
│  - tasks table                                                   │
│  - timeline_events table                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Initial Load**: Server Component → Use Case → Repository → SQLite → TypeScript types → Client Component
2. **Polling**: Client Component → Server Action → Use Case → Repository → SQLite → Updated data
3. **Filtering**: Client Component state change → Re-render filtered features (no data refetch)

## Implementation Strategy

### Phase 1: Foundation Setup (No Tests Required)

**Purpose:** Set up configuration and constants

**What to do:**

- Create polling configuration constant (30-second default interval)
- Define lifecycle color mapping utility
- No tests needed (pure configuration)

**Deliverable:** Configuration files with typed constants

---

### Phase 2: Application Layer - Use Case (TDD Cycle)

**Purpose:** Create use case for fetching dashboard data

#### RED: Write Failing Tests FIRST

**Test file:** `tests/unit/application/use-cases/dashboard/get-dashboard-data.use-case.spec.ts`

**Tests to write:**

1. Should fetch all features with task progress
2. Should filter features by lifecycle phase
3. Should fetch recent timeline events (last 10)
4. Should handle empty database gracefully
5. Should call repository methods with correct parameters

**Mock:** `IFeatureRepository` interface

#### GREEN: Minimal Implementation

**Implementation file:** `src/application/use-cases/dashboard/get-dashboard-data.use-case.ts`

**What to implement:**

- Constructor with `@inject()` for IFeatureRepository
- `execute(filter?: SdlcLifecycle)` method
- Return type: `DashboardData { features, taskMetrics, recentActivity }`
- Aggregate data from repository calls

#### REFACTOR: Clean Up

- Extract helper methods if needed
- Improve type definitions
- Add JSDoc comments

---

### Phase 3: Application Ports - Repository Interface (No Tests - Interface Only)

**Purpose:** Define repository interface for data access

**File:** `src/application/ports/output/feature.repository.interface.ts`

**Interface methods:**

```typescript
export interface IFeatureRepository {
  findAll(): Promise<Feature[]>;
  findByLifecycle(lifecycle: SdlcLifecycle): Promise<Feature[]>;
  getTaskMetrics(featureId: string): Promise<TaskMetrics>;
  getRecentTimeline(limit: number): Promise<TimelineEvent[]>;
}
```

**Export:** Add to `src/application/ports/output/index.ts`

---

### Phase 4: Infrastructure Layer - Repository Implementation (TDD Cycle)

**Purpose:** Implement SQLite repository for dashboard data

#### RED: Write Failing Tests FIRST

**Test file:** `tests/integration/infrastructure/repositories/sqlite-feature.repository.spec.ts`

**Tests to write:**

1. Should find all features from database
2. Should filter features by lifecycle phase
3. Should calculate task metrics correctly (completed/total)
4. Should fetch timeline events ordered by timestamp DESC
5. Should handle SQL errors gracefully
6. Should use parameterized queries (SQL injection prevention)

**Setup:** Use in-memory SQLite database for tests

#### GREEN: Minimal Implementation

**Implementation file:** `src/infrastructure/repositories/sqlite-feature.repository.ts`

**What to implement:**

- Class with `@injectable()` decorator
- Inject Database instance
- Implement IFeatureRepository interface
- Use parameterized queries with `db.prepare().all()`
- Map SQLite rows to TypeScript types

#### REFACTOR: Clean Up

- Extract SQL query builders if needed
- Add database indexes (features.lifecycle, features.updated_at)
- Optimize joins for task metrics

---

### Phase 5: Infrastructure - DI Container Registration (No Tests)

**Purpose:** Register repository and use case in DI container

**File to modify:** `src/infrastructure/di/container.ts`

**Changes:**

- Import IFeatureRepository and SQLiteFeatureRepository
- Register singleton: `container.register<IFeatureRepository>("IFeatureRepository", { useClass: SQLiteFeatureRepository })`
- Import and register GetDashboardDataUseCase

---

### Phase 6: Presentation Layer - UI Components (TDD Cycle)

**Purpose:** Build reusable dashboard components

#### RED: Write Failing Tests FIRST

**Test files:**

1. `tests/unit/presentation/web/components/features/feature-card.spec.tsx`
2. `tests/unit/presentation/web/components/features/lifecycle-badge.spec.tsx`
3. `tests/unit/presentation/web/components/features/task-progress.spec.tsx`
4. `tests/unit/presentation/web/components/features/activity-timeline.spec.tsx`

**Tests to write per component:**

- Renders with correct props
- Displays data accurately
- Applies correct styles/colors
- Handles edge cases (empty data, nulls)

#### GREEN: Minimal Implementation

**Implementation files:**

1. `src/presentation/web/components/features/feature-card.tsx`
2. `src/presentation/web/components/features/lifecycle-badge.tsx`
3. `src/presentation/web/components/features/task-progress.tsx`
4. `src/presentation/web/components/features/activity-timeline.tsx`

**What to implement:**

- TypeScript React components with typed props
- Use shadcn/ui components (Card, Badge, Tabs)
- Apply Tailwind CSS classes
- Implement lifecycle color mapping

#### REFACTOR: Clean Up

- Extract shared utilities (color mapping function)
- Optimize rendering (React.memo if needed - skip for MVP)
- Improve accessibility (ARIA labels)

---

### Phase 7: Presentation Layer - Client Component (TDD Cycle)

**Purpose:** Build interactive dashboard client component

#### RED: Write Failing Tests FIRST

**Test file:** `tests/unit/presentation/web/components/features/dashboard-client.spec.tsx`

**Tests to write:**

1. Should render feature list initially
2. Should filter features when tab changes
3. Should poll for updates every 30 seconds
4. Should stop polling when component unmounts
5. Should handle empty feature list
6. Should display task metrics correctly

**Mock:** Polling fetch function

#### GREEN: Minimal Implementation

**Implementation file:** `src/presentation/web/app/dashboard-client.tsx`

**What to implement:**

- 'use client' directive
- Props: `initialData: DashboardData`
- State: `filter: SdlcLifecycle | "All"`, `data: DashboardData`
- useEffect hook with setInterval for polling
- Tabs component for filtering
- Render FeatureCard list
- Render ActivityTimeline

#### REFACTOR: Clean Up

- Extract custom hook: `useDashboardPolling`
- Extract filter logic
- Add Page Visibility API (pause polling when tab inactive)

---

### Phase 8: Presentation Layer - Server Component Page (TDD Cycle)

**Purpose:** Create dashboard page with server-side data fetching

#### RED: Write Failing Tests FIRST

**Test file:** `tests/integration/presentation/web/app/page.spec.tsx`

**Tests to write:**

1. Should fetch dashboard data on server
2. Should pass data to client component
3. Should handle use case errors
4. Should render dashboard client component

**Setup:** Mock DI container and use case

#### GREEN: Minimal Implementation

**Implementation files:**

1. `src/presentation/web/app/page.tsx` (Server Component)
2. Move existing home page content to `/about` or remove

**What to implement:**

- Resolve GetDashboardDataUseCase from DI container
- Call `useCase.execute()` to fetch data
- Render `<DashboardClient initialData={data} />`
- Handle errors with error boundary

#### REFACTOR: Clean Up

- Add error handling UI
- Add loading states if needed
- Extract data fetching to utility

---

### Phase 9: E2E Tests (TDD Cycle)

**Purpose:** Validate end-to-end dashboard functionality

#### RED: Write Failing Tests FIRST

**Test file:** `tests/e2e/dashboard.spec.ts`

**Tests to write:**

1. Should display dashboard as landing page
2. Should show feature cards with lifecycle badges
3. Should filter features by lifecycle tab
4. Should display task progress metrics
5. Should show activity timeline
6. Should update data on polling interval

**Setup:** Seed test database with sample features

#### GREEN: Fix Issues

- Run E2E tests
- Fix any integration bugs found
- Ensure polling works correctly

#### REFACTOR: Clean Up

- Add test helpers for seeding data
- Improve test stability (wait for polling)

---

### Phase 10: Storybook Stories (No Tests Required)

**Purpose:** Document components in Storybook

**Story files to create:**

1. `src/presentation/web/components/features/feature-card.stories.tsx`
2. `src/presentation/web/components/features/lifecycle-badge.stories.tsx`
3. `src/presentation/web/components/features/task-progress.stories.tsx`
4. `src/presentation/web/components/features/activity-timeline.stories.tsx`
5. `src/presentation/web/app/dashboard-client.stories.tsx`

**What to create:**

- Default story with sample data
- Variants for each lifecycle phase
- Edge cases (empty, loading, error states)

---

## Files to Create/Modify

### New Files

| File                                                                              | Purpose                           |
| --------------------------------------------------------------------------------- | --------------------------------- |
| `src/application/use-cases/dashboard/get-dashboard-data.use-case.ts`              | Use case for dashboard data       |
| `src/application/use-cases/dashboard/index.ts`                                    | Barrel export                     |
| `src/application/ports/output/feature.repository.interface.ts`                    | Feature repository interface      |
| `src/infrastructure/repositories/sqlite-feature.repository.ts`                    | SQLite repository implementation  |
| `src/presentation/web/app/dashboard-client.tsx`                                   | Client component for dashboard    |
| `src/presentation/web/components/features/feature-card.tsx`                       | Feature card component            |
| `src/presentation/web/components/features/lifecycle-badge.tsx`                    | Lifecycle badge component         |
| `src/presentation/web/components/features/task-progress.tsx`                      | Task progress component           |
| `src/presentation/web/components/features/activity-timeline.tsx`                  | Activity timeline component       |
| `src/presentation/web/lib/dashboard-config.ts`                                    | Dashboard configuration constants |
| `src/presentation/web/lib/lifecycle-colors.ts`                                    | Lifecycle color mapping utility   |
| `tests/unit/application/use-cases/dashboard/get-dashboard-data.use-case.spec.ts`  | Use case unit tests               |
| `tests/integration/infrastructure/repositories/sqlite-feature.repository.spec.ts` | Repository integration tests      |
| `tests/unit/presentation/web/components/features/feature-card.spec.tsx`           | Feature card tests                |
| `tests/unit/presentation/web/components/features/lifecycle-badge.spec.tsx`        | Badge tests                       |
| `tests/unit/presentation/web/components/features/task-progress.spec.tsx`          | Progress tests                    |
| `tests/unit/presentation/web/components/features/activity-timeline.spec.tsx`      | Timeline tests                    |
| `tests/unit/presentation/web/app/dashboard-client.spec.tsx`                       | Dashboard client tests            |
| `tests/integration/presentation/web/app/page.spec.tsx`                            | Page integration tests            |
| `tests/e2e/dashboard.spec.ts`                                                     | E2E tests                         |
| `src/presentation/web/components/features/feature-card.stories.tsx`               | Storybook stories                 |
| `src/presentation/web/components/features/lifecycle-badge.stories.tsx`            | Storybook stories                 |
| `src/presentation/web/components/features/task-progress.stories.tsx`              | Storybook stories                 |
| `src/presentation/web/components/features/activity-timeline.stories.tsx`          | Storybook stories                 |
| `src/presentation/web/app/dashboard-client.stories.tsx`                           | Storybook stories                 |

### Modified Files

| File                                                | Changes                                                 |
| --------------------------------------------------- | ------------------------------------------------------- |
| `src/presentation/web/app/page.tsx`                 | Replace home page with dashboard server component       |
| `src/infrastructure/di/container.ts`                | Register IFeatureRepository and GetDashboardDataUseCase |
| `src/application/ports/output/index.ts`             | Export IFeatureRepository                               |
| `src/application/use-cases/index.ts`                | Export GetDashboardDataUseCase                          |
| `src/presentation/web/components/features/index.ts` | Export new feature components                           |

---

## Testing Strategy

### Unit Tests (Write FIRST - RED phase)

**Application Layer:**

- `GetDashboardDataUseCase` with mocked IFeatureRepository
- Test all use case methods and error handling

**Presentation Layer:**

- All React components with React Testing Library
- Test rendering, props, state, and user interactions
- Mock data and callbacks

### Integration Tests (Write FIRST - RED phase)

**Infrastructure Layer:**

- `SQLiteFeatureRepository` with in-memory SQLite database
- Test SQL queries, data mapping, and error handling
- Verify parameterized queries (SQL injection prevention)

**Presentation Layer:**

- Dashboard page with mocked DI container
- Test server-side data fetching and component integration

### E2E Tests (Write FIRST - RED phase)

**Full Stack:**

- Playwright tests for dashboard functionality
- Test navigation, filtering, polling, and data display
- Seed test database with sample features

---

## Risk Mitigation

| Risk                                         | Mitigation                                                           |
| -------------------------------------------- | -------------------------------------------------------------------- |
| Polling causes performance issues            | Use 30-second interval, stop when tab inactive (Page Visibility API) |
| SQLite queries slow with large datasets      | Add indexes on `features.lifecycle` and `features.updated_at`        |
| Feature table doesn't exist in database      | Check schema, may need migration (not in scope for MVP)              |
| Existing home page content is important      | Review with user before replacing, or move to `/about`               |
| DI container resolution fails in web context | Ensure web server initializes DI container on startup                |
| TypeScript compilation errors                | Keep tests and types aligned throughout TDD process                  |

---

## Rollback Plan

If critical issues arise:

1. **Revert commits:** Use `git revert` to undo changes
2. **Restore home page:** Keep backup of original `app/page.tsx`
3. **Remove DI registrations:** Comment out feature repository registration
4. **Hide dashboard route:** Add dashboard to `/dashboard` instead of `/`

**Rollback is safe because:**

- No database schema changes (using existing tables)
- No external dependencies added
- Changes are isolated to new files (minimal modification to existing code)

---

_Updated by `/shep-kit:plan` — see tasks.md for detailed breakdown_
