# Research: add-dashboard-page

> Technical analysis for 011-add-dashboard-page

## Status

- **Phase:** Research
- **Updated:** 2026-02-08

## Technology Decisions

### 1. Component Architecture Pattern

**Options considered:**

1. **Server Component + Client Component (Hybrid)** - Server fetches data, Client handles interactivity
2. **Pure Client Component** - All data fetching and rendering client-side
3. **Pure Server Component** - Server-only with form actions for filtering

**Decision:** Server Component + Client Component (Hybrid)

**Rationale:**

- Follows existing pattern in `/version` page (version/page.tsx + version-page-client.tsx)
- Server Component handles initial data fetch (better performance, no loading states)
- Client Component enables polling, filtering, and interactive UI
- Leverages Next.js 16 App Router best practices
- Maintains consistency with existing codebase architecture

### 2. Data Layer Architecture

**Options considered:**

1. **Direct SQLite queries in page component** - No abstraction, inline SQL
2. **Repository pattern with use cases** - Clean Architecture approach
3. **Next.js API routes + React Query** - API-first approach

**Decision:** Repository pattern with use cases (Clean Architecture)

**Rationale:**

- Mandatory per CLAUDE.md: "All data access goes through repository interfaces"
- Maintains consistency with existing codebase (ISettingsRepository pattern)
- Will create:
  - `IFeatureRepository` interface in `application/ports/output/`
  - `GetDashboardDataUseCase` in `application/use-cases/dashboard/`
  - `SQLiteFeatureRepository` in `infrastructure/repositories/`
- Enables testability and dependency injection via tsyringe
- TypeSpec-first: Types generated from `tsp/domain/entities/feature.tsp`

### 3. Polling Implementation Strategy

**Options considered:**

1. **React useEffect + setInterval** - Manual polling with cleanup
2. **SWR library** - Stale-while-revalidate pattern
3. **React Query (TanStack Query)** - Full-featured data fetching
4. **Server-Sent Events (SSE)** - Push-based updates

**Decision:** React useEffect + setInterval

**Rationale:**

- No new dependencies required (keeps bundle size small)
- Simple implementation for MVP (30-second configurable interval)
- Easy to understand and maintain
- Aligns with "Static on page load + polling" requirement
- Future upgrade path to SSE or WebSockets if needed
- Proper cleanup in useEffect return prevents memory leaks

### 4. Filtering UI Pattern

**Options considered:**

1. **Tabs component** - Like `/version` page (Overview/System/Features)
2. **Select dropdown** - Compact, single-select filter
3. **Multi-select combobox** - Complex but flexible
4. **Button group** - Horizontal layout with active states

**Decision:** Tabs component with "All" + lifecycle phases

**Rationale:**

- Already used successfully in `/version` page
- shadcn/ui Tabs component available and tested
- Natural fit for mutually exclusive lifecycle phases
- Tabs: "All" | "Requirements" | "Research" | "Implementation" | "Review" | "Deploy & QA" | "Maintain"
- Visually clear, accessible, responsive
- Consistent with existing UI patterns

### 5. Lifecycle Phase Color Mapping

**Options considered:**

1. **Badge variant mapping** - Use existing badge variants (default/secondary/outline)
2. **Custom Tailwind colors** - Define new color palette
3. **Semantic color system** - Progress-based colors (blue → green)

**Decision:** Semantic color system with Badge component

**Rationale:**

- Lifecycle phases represent progression: Requirements (start) → Maintain (end)
- Color mapping (using Tailwind CSS v4 design tokens):
  - Requirements: `blue` (gathering)
  - Research: `purple` (analyzing)
  - Implementation: `yellow` (active work)
  - Review: `orange` (validating)
  - Deploy & QA: `green` (releasing)
  - Maintain: `slate` (stable)
- Use Badge component with custom className for colors
- Accessible color contrast ratios (WCAG AA compliant)

### 6. Agent Activity Logs Approach

**Options considered:**

1. **TimelineEvent entity from domain model** - Structured audit trail
2. **Git commit history parsing** - Derive from git log
3. **Separate ActivityLog table** - New domain entity

**Decision:** TimelineEvent entity from domain model

**Rationale:**

- Already defined in `tsp/domain/entities/timeline-event.tsp`
- Captures "significant events in a feature's timeline"
- Structure: `{ id, userQuery, timestamp }`
- Repository will query TimelineEvent table via IFeatureRepository
- Displays last N events (e.g., 10) in chronological order
- Future: Could link Feature → TimelineEvent in TypeSpec if needed

## Library Analysis

No new libraries required. All functionality achievable with existing dependencies:

| Library           | Version | Purpose                          | Already Available |
| ----------------- | ------- | -------------------------------- | ----------------- |
| Next.js           | ^16.1.6 | Server/Client Components, Router | ✓                 |
| React             | ^19.2.4 | UI framework, hooks              | ✓                 |
| shadcn/ui (Radix) | ^1.4.3  | Tabs, Card, Badge, Select        | ✓                 |
| Tailwind CSS      | ^4.1.18 | Styling and color system         | ✓                 |
| TypeScript        | ^5.3.0  | Type safety                      | ✓                 |
| tsyringe          | (CLI)   | Dependency injection             | ✓                 |
| better-sqlite3    | (CLI)   | SQLite database access           | ✓                 |

## Security Considerations

- **SQL Injection Prevention**: Use parameterized queries in SQLiteFeatureRepository (already standard practice)
- **Data Exposure**: Dashboard shows only repository-scoped data (no cross-repo data leaks)
- **Access Control**: Web UI runs locally (`localhost:3000`), no authentication needed for MVP
- **XSS Prevention**: React escapes content by default, avoid unsafe HTML rendering patterns
- **Repository Path Sanitization**: Validate repository paths in use case layer before database queries

## Performance Implications

- **Initial Page Load**: Server Component pre-renders with initial data (fast first paint)
- **Polling Overhead**: 30-second interval is reasonable (adjustable via constant)
  - Consider: Stop polling when tab inactive (Page Visibility API)
- **Database Queries**: SQLite queries should be indexed on:
  - `features.lifecycle` (for filtering)
  - `features.updated_at` (for recent activity sorting)
  - `tasks.state` (for progress calculations)
- **Component Rendering**: Use React.memo for FeatureCard if list grows large (premature optimization - skip for MVP)
- **Bundle Size**: No new dependencies added, minimal impact
- **Storybook Stories**: Each component isolated, no performance impact

## Open Questions

All questions resolved. Research complete.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
