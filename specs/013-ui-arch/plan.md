## Status

- **Phase:** Planning
- **Updated:** 2026-02-11

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     Component Architecture                       │
│                                                                  │
│  Tier 3 ┌─────────────────────────────────────────────────────┐ │
│         │ features/                                            │ │
│         │  settings/  │  version/  │  features/                │ │
│         │  (domain-specific UI bound to routes/data)           │ │
│         └───────────────────────┬─────────────────────────────┘ │
│                                 │ imports from ↓                 │
│  Tier 2 ┌───────────────────────▼─────────────────────────────┐ │
│         │ layouts/                                             │ │
│         │  dashboard-layout/  │  sidebar/  │  header/          │ │
│         │  (page shells, structural wrappers)                  │ │
│         └───────────────────────┬─────────────────────────────┘ │
│                                 │ imports from ↓                 │
│  Tier 1 ┌───────────────────────▼─────────────────────────────┐ │
│         │ common/                                              │ │
│         │  theme-toggle/ │ page-header/ │ empty-state/         │ │
│         │  loading-skeleton/ │ (cross-feature composed)        │ │
│         └───────────────────────┬─────────────────────────────┘ │
│                                 │ imports from ↓                 │
│  Tier 0 ┌───────────────────────▼─────────────────────────────┐ │
│         │ ui/                                                  │ │
│         │  button │ card │ badge │ input │ dialog │ tabs │ ... │ │
│         │  (shadcn/ui primitives, CLI-managed)                 │ │
│         └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

Import Rules (strict dependency direction):
┌──────────┬──────────────┬──────────────────────────┐
│ Tier     │ Directory    │ Can Import From           │
├──────────┼──────────────┼──────────────────────────┤
│ 0        │ ui/          │ Nothing in components/    │
│ 1        │ common/      │ ui/ only                  │
│ 2        │ layouts/     │ ui/, common/              │
│ 3        │ features/    │ ui/, common/, layouts/     │
└──────────┴──────────────┴──────────────────────────┘
```

## Storybook Architecture

```
.storybook/
├── main.ts          # Framework, addons, stories glob, viteFinal
└── preview.tsx      # Theme decorator, storySort, parameters

Story Categories (sidebar):
├── Design System/   # MDX docs (Colors, Typography, Getting Started)
├── Primitives/      # ui/ components (Button, Card, Badge, ...)
├── Composed/        # common/ components (PageHeader, EmptyState, ...)
├── Layout/          # layouts/ components (DashboardLayout, Sidebar, ...)
└── Features/        # features/ components (SettingsForm, VersionPage, ...)
```

## Implementation Strategy

**MANDATORY TDD**: All implementation phases with executable code follow RED-GREEN-REFACTOR cycles.

### Phase 1: Foundation & Storybook Reset (No TDD)

**Goal:** Set up the infrastructure for the new architecture — install addons,
create directory skeleton, reconfigure Storybook, and establish design system docs.

**Steps:**

1. Install `@storybook/addon-a11y`, `@storybook/addon-interactions`, `@tailwindcss/vite`
2. Create `components/common/` and `components/layouts/` directories
3. Update `.storybook/main.ts`: add addons, expand stories glob to include `docs/**/*.mdx`,
   add `@tailwindcss/vite` plugin via `viteFinal` dynamic import
4. Update `.storybook/preview.tsx`: add `storySort` for category ordering, improve theme decorator
5. Move `components/design-tokens.mdx` → `docs/Colors.mdx` and split into MDX pages
   (Colors, Typography, GettingStarted) using Storybook doc blocks

**Deliverables:** Working Storybook with new addon panel tabs (a11y, interactions),
design system documentation pages in sidebar, Tailwind v4 rendering correctly.

### Phase 2: Migration & Barrel Cleanup (TDD Cycle 1)

**Goal:** Migrate ThemeToggle to `common/`, remove tier-level barrels,
update all import paths, and rename story title prefixes.

**TDD Workflow:**

1. **RED:** Run existing tests to confirm they pass, then update imports to new paths
   (tests should fail pointing to moved files)
2. **GREEN:** Move ThemeToggle to `common/`, delete tier-level barrels, update all imports
   in app/ and test files to use direct paths
3. **REFACTOR:** Rename story title prefixes from `UI/` → `Primitives/` and
   `Features/ThemeToggle` → `Composed/ThemeToggle`

**Deliverables:** All existing components working at new paths, no barrel exports at
tier level, story sidebar organized by category.

### Phase 3: Common Components (TDD Cycle 2) [P — Parallelizable]

**Goal:** Implement 3 cross-feature composed components: page-header, empty-state,
loading-skeleton. Each follows independent TDD cycles.

**TDD Workflow (per component):**

1. **RED:** Write unit tests for rendering, props, variants, accessibility
2. **GREEN:** Implement minimal component to pass all tests
3. **REFACTOR:** Extract shared patterns, add Storybook stories with autodocs

**Component Specs:**

- **PageHeader**: Title, optional description, optional action slot. Server Component compatible.
- **EmptyState**: Icon, title, description, optional CTA button. Server Component compatible.
- **LoadingSkeleton**: Configurable width/height/shape (line, circle, card). Client or Server.

**Deliverables:** 3 common components with unit tests, stories (with autodocs), and
per-component index.ts exports.

### Phase 4: Layout Components (TDD Cycle 3)

**Goal:** Build the layout shell — sidebar navigation, top header, and the
dashboard-layout that composes them together.

**TDD Workflow:**

1. **RED:** Write tests for sidebar (nav items, active state, collapse), header (title,
   actions slot, theme toggle integration), dashboard-layout (renders sidebar + header + children)
2. **GREEN:** Implement sidebar, header, then dashboard-layout composing both
3. **REFACTOR:** Extract shared layout utilities, ensure Server Component boundaries are correct

**Component Specs:**

- **Sidebar**: Nav items with icons, active state highlighting, collapsible. Server Component shell.
- **Header**: Page title, breadcrumbs slot, actions slot (theme toggle). Server Component shell.
- **DashboardLayout**: Composes sidebar + header + main content area. Server Component.

**Deliverables:** 3 layout components with tests, stories, responsive behavior.

### Phase 5: Feature Integration (TDD Cycle 4)

**Goal:** Reorganize existing feature components into domain directories and wire up
the new layouts in app pages.

**TDD Workflow:**

1. **RED:** Write integration tests verifying app pages render correctly with new layouts
2. **GREEN:** Create `features/version/` directory, move version page client component,
   update `app/layout.tsx` and route pages to use DashboardLayout
3. **REFACTOR:** Clean up unused files, verify all import paths, ensure no regressions

**Deliverables:** App pages using DashboardLayout, feature components organized by
domain (version/, settings/ placeholder), all existing functionality preserved.

### Phase 6: Validation & Cleanup (No TDD)

**Goal:** Full build verification and documentation updates.

**Steps:**

1. Run full test suite (`pnpm test`)
2. Verify Storybook build (`pnpm build:storybook`)
3. Verify web app build (`pnpm build:web`)
4. Run linting and type checking (`pnpm validate`)
5. Update `docs/ui/architecture.md` and `docs/ui/components.md`
6. Verify all success criteria from spec.yaml

**Deliverables:** All builds green, all tests passing, documentation current.

## Files to Create/Modify

### New Files

| File                                    | Purpose                                         |
| --------------------------------------- | ----------------------------------------------- |
| `components/common/theme-toggle/*`      | Migrated from features/                         |
| `components/common/page-header/*`       | Title + description + action composed component |
| `components/common/empty-state/*`       | Empty content placeholder with icon + CTA       |
| `components/common/loading-skeleton/*`  | Configurable skeleton loader                    |
| `components/layouts/sidebar/*`          | Navigation sidebar component                    |
| `components/layouts/header/*`           | Page header bar component                       |
| `components/layouts/dashboard-layout/*` | Full page shell (sidebar + header + content)    |
| `docs/Colors.mdx`                       | Design system color documentation               |
| `docs/Typography.mdx`                   | Design system typography documentation          |
| `docs/GettingStarted.mdx`               | Component usage guide                           |
| `tests/unit/.../common/*`               | Common component unit tests                     |
| `tests/unit/.../layouts/*`              | Layout component unit tests                     |

### Modified Files

| File                                  | Changes                                               |
| ------------------------------------- | ----------------------------------------------------- |
| `.storybook/main.ts`                  | Add addons, @tailwindcss/vite, docs glob              |
| `.storybook/preview.tsx`              | storySort, improved theme decorator                   |
| `package.json`                        | Add addon-a11y, addon-interactions, @tailwindcss/vite |
| `ui/*.stories.tsx` (12 files)         | Rename title prefix `UI/` → `Primitives/`             |
| `app/page.tsx`                        | Update import paths (remove barrel)                   |
| `app/version/version-page-client.tsx` | Update import paths (remove barrel)                   |
| `app/layout.tsx`                      | Wrap with DashboardLayout                             |
| `tests/unit/.../web/*.test.tsx`       | Update import paths                                   |

### Deleted Files

| File                                 | Reason                           |
| ------------------------------------ | -------------------------------- |
| `components/ui/index.ts`             | Tier-level barrel export removed |
| `components/features/index.ts`       | Tier-level barrel export removed |
| `components/features/theme-toggle/*` | Moved to common/theme-toggle/    |
| `components/design-tokens.mdx`       | Replaced by docs/ MDX pages      |

## Testing Strategy (TDD: Tests FIRST)

**CRITICAL:** Tests are written FIRST in each TDD cycle.

### Unit Tests (RED → GREEN → REFACTOR)

Write FIRST for:

- Common components: rendering, props, variants, className merging, accessibility attributes
- Layout components: renders children, active nav state, responsive behavior
- Integration: app pages render with new layout wrappers

### Storybook Stories

Every component gets:

- Default story with autodocs tag
- Variant stories (sizes, states)
- Dark mode story via background toggle
- Accessibility panel verification (addon-a11y)

### Existing Test Preservation

- All 5 existing unit tests (button, badge, card, alert, input) must pass after import path updates
- useTheme hook test must pass unchanged
- Storybook build must succeed

## Risk Mitigation

| Risk                                            | Mitigation                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| Import path breakage across many files          | Limited to 6 app/component files + 5 test files. All imports identified in research. |
| Storybook build failure after addon changes     | Test Storybook build after each phase, not just at the end                           |
| Tailwind v4 + Storybook Vite integration        | Use proven @tailwindcss/vite approach from research (not PostCSS)                    |
| Server/Client component boundary errors         | Follow research decision: push "use client" to leaves only                           |
| Story rendering regressions after prefix rename | Verify each renamed story renders correctly in Storybook                             |

## Rollback Plan

Feature is additive and reversible. All changes are on the `feat/ui-arch` branch.
Rollback by reverting the branch. No database migrations, no infrastructure changes,
no external API integrations. Existing functionality can be restored by reverting
import path changes and restoring barrel exports.

---

_Updated by `/shep-kit:plan` — see tasks.md for detailed breakdown_
