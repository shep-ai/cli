# Plan: web-ui-component-library

> Implementation plan for 004-web-ui-component-library

## Status

- **Phase:** Planning
- **Updated:** 2026-02-03

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           src/presentation/web/                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        app/ (Next.js App Router)                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────────┐ │    │
│  │  │ layout.tsx  │  │  page.tsx   │  │  globals.css (@theme tokens) │ │    │
│  │  │ (providers) │  │  (home)     │  │  - light mode vars           │ │    │
│  │  │ - Theme     │  │             │  │  - dark mode vars (.dark)    │ │    │
│  │  └─────────────┘  └─────────────┘  └──────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          components/                                  │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │    │
│  │  │      ui/         │  │    features/     │  │    layouts/      │  │    │
│  │  │ (shadcn/ui)      │  │ (app-specific)   │  │ (Header, etc.)   │  │    │
│  │  │                  │  │                  │  │                  │  │    │
│  │  │ • Button         │  │ • ThemeToggle    │  │ • RootLayout     │  │    │
│  │  │ • Card           │  │ • (future)       │  │ • PageHeader     │  │    │
│  │  │ • Input          │  │                  │  │                  │  │    │
│  │  │ • Label          │  │                  │  │                  │  │    │
│  │  │ • Select         │  │                  │  │                  │  │    │
│  │  │ • Dialog         │  │                  │  │                  │  │    │
│  │  │ • Badge          │  │                  │  │                  │  │    │
│  │  │ • Alert          │  │                  │  │                  │  │    │
│  │  │ • Tabs           │  │                  │  │                  │  │    │
│  │  │ • Accordion      │  │                  │  │                  │  │    │
│  │  │ • Toast          │  │                  │  │                  │  │    │
│  │  │ • Popover        │  │                  │  │                  │  │    │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  lib/                       hooks/                    types/          │   │
│  │  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────┐ │   │
│  │  │ utils.ts        │       │ useTheme.ts     │       │ theme.ts    │ │   │
│  │  │ • cn() helper   │       │ • toggle dark   │       │ • types     │ │   │
│  │  │ • theme utils   │       │ • persist pref  │       │             │ │   │
│  │  └─────────────────┘       └─────────────────┘       └─────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              External Tools                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐  │
│  │   .storybook/    │    │ tailwind.config  │    │  tests/              │  │
│  │                  │    │                  │    │                      │  │
│  │ • main.ts        │    │ • v4 config      │    │ • unit/presentation/ │  │
│  │ • preview.tsx    │    │ • @theme refs    │    │   - component tests  │  │
│  │ • theme addon    │    │ • dark mode      │    │ • e2e/web/           │  │
│  │                  │    │                  │    │   - playwright tests │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Action → React Component → Tailwind Classes → CSS Variables (@theme)
     │                                                       │
     │            ┌─────────────────────────────────────────┘
     │            ▼
     │    Theme Toggle (useTheme)
     │            │
     │            ▼
     │    document.documentElement.classList.toggle('dark')
     │            │
     │            ▼
     │    .dark @theme { ... } applied
     │            │
     └────────────┘
```

## Implementation Strategy

### Phase 1: Foundation & Dependencies (TDD: Config Tests)

**Goal:** Set up the foundational infrastructure - Next.js 16, React 19, Tailwind v4, and directory structure.

**TDD Approach:**

- Write configuration validation tests first
- Verify build works after each addition

**Tasks:**

1. Install Next.js 16 and React 19 dependencies
2. Configure Tailwind v4 with @theme design tokens
3. Set up PostCSS configuration
4. Create directory structure (components/, lib/, hooks/, types/)
5. Configure TypeScript paths for @/ aliases
6. Add ESLint React/Next.js rules
7. Add Prettier Tailwind plugin

**Exit Criteria:** `pnpm build` succeeds, Tailwind v4 compiles, directory structure in place.

### Phase 2: shadcn/ui & Component Installation (TDD: Component Tests)

**Goal:** Initialize shadcn/ui with unified radix-ui package and install all 12 components.

**TDD Approach:**

- Write component render tests before installing each component
- Write accessibility tests (ARIA attributes, keyboard navigation)

**Tasks:**

1. Initialize shadcn/ui (`npx shadcn@latest init` with new-york style)
2. Install core components: Button, Card, Input, Label, Select, Dialog
3. Install additional components: Badge, Alert, Tabs, Accordion, Toast, Popover
4. Create ThemeToggle component for dark mode switching
5. Implement useTheme hook with localStorage persistence
6. Write component tests (render, variants, accessibility)

**Exit Criteria:** All 12 components installed, ThemeToggle works, component tests pass.

### Phase 3: Storybook Setup & Stories [P]

**Goal:** Set up Storybook 10.x with Vite and create stories for all components.

**TDD Approach:**

- Stories serve as visual tests
- Use Storybook play functions for interaction tests

**Tasks:**

1. Install Storybook 10.x with Vite framework
2. Configure Storybook for Next.js 16 and dark mode
3. Create stories for all 12 components (variants, states)
4. Create design token documentation page (MDX)
5. Add dark mode toggle to Storybook toolbar
6. Verify Storybook build succeeds

**Exit Criteria:** `pnpm dev:storybook` runs, all stories render, `pnpm build:storybook` succeeds.

### Phase 4: Testing Infrastructure (TDD: Core)

**Goal:** Set up Vitest for component testing and Playwright for E2E tests.

**TDD Approach:**

- Component tests with React Testing Library
- E2E tests for critical user flows

**Tasks:**

1. Configure Vitest for React component testing
2. Set up React Testing Library with Vitest
3. Configure Playwright for E2E tests
4. Write component unit tests (all 12 + ThemeToggle)
5. Write E2E test for theme toggle flow
6. Add pnpm scripts: test:unit:web, test:e2e:web

**Exit Criteria:** All tests pass, `pnpm test:e2e:web` executes successfully.

### Phase 5: CI/CD Integration & Documentation

**Goal:** Update CI/CD pipeline and add documentation.

**Tasks:**

1. Update `.github/workflows/ci.yml` with web test jobs
2. Add web-unit-tests job (Vitest)
3. Add web-e2e-tests job (Playwright)
4. Add storybook-build job (verify build)
5. Update package.json scripts for pnpm compatibility
6. Create docs/development/web-component-library.md
7. Verify CI passes on feature branch

**Exit Criteria:** CI pipeline green, documentation complete.

## Files to Create/Modify

### New Files

| File                                                        | Purpose                              |
| ----------------------------------------------------------- | ------------------------------------ |
| `src/presentation/web/app/layout.tsx`                       | Root layout with ThemeProvider       |
| `src/presentation/web/app/page.tsx`                         | Home page placeholder                |
| `src/presentation/web/app/globals.css`                      | Tailwind + @theme design tokens      |
| `src/presentation/web/components/ui/*.tsx`                  | shadcn/ui components (12 files)      |
| `src/presentation/web/components/features/theme-toggle.tsx` | Dark mode toggle component           |
| `src/presentation/web/lib/utils.ts`                         | cn() helper and utilities            |
| `src/presentation/web/hooks/useTheme.ts`                    | Theme state management hook          |
| `src/presentation/web/types/theme.ts`                       | Theme type definitions               |
| `.storybook/main.ts`                                        | Storybook configuration              |
| `.storybook/preview.tsx`                                    | Storybook preview with theme support |
| `tailwind.config.ts`                                        | Tailwind v4 configuration            |
| `postcss.config.js`                                         | PostCSS for Tailwind                 |
| `components.json`                                           | shadcn/ui configuration              |
| `tests/unit/presentation/web/*.test.tsx`                    | Component unit tests                 |
| `tests/e2e/web/theme-toggle.spec.ts`                        | E2E test for theme toggle            |
| `playwright.config.ts`                                      | Playwright configuration             |
| `docs/development/web-component-library.md`                 | Component library documentation      |

### Modified Files

| File                       | Changes                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| `package.json`             | Add Next.js 16, React 19, Storybook 10, Tailwind v4, testing deps |
| `tsconfig.json`            | Add path aliases (@/components, @/lib, etc.)                      |
| `eslint.config.mjs`        | Add React/Next.js ESLint rules                                    |
| `.prettierrc`              | Add Tailwind prettier plugin                                      |
| `.github/workflows/ci.yml` | Add web-unit-tests, web-e2e-tests, storybook-build jobs           |
| `vitest.config.ts`         | Add web component test configuration                              |

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)

- **Button:** Render variants (default, destructive, outline, secondary, ghost, link), click handlers, disabled state
- **Card:** Render with children, Card.Header, Card.Content, Card.Footer composition
- **Input:** Render with placeholder, value change, disabled state, error state
- **Label:** Render with htmlFor, required indicator
- **Select:** Render options, selection change, disabled state
- **Dialog:** Open/close state, focus trap, escape key dismissal
- **Badge:** Render variants (default, secondary, destructive, outline)
- **Alert:** Render variants (default, destructive), with icon
- **Tabs:** Tab switching, controlled/uncontrolled state
- **Accordion:** Expand/collapse, single/multiple mode
- **Toast:** Show/dismiss, variants, duration
- **Popover:** Open/close, positioning, focus management
- **ThemeToggle:** Toggle dark mode, persist preference

### Integration Tests (Vitest)

- Theme persistence across page reload (localStorage)
- shadcn/ui component composition (Card with Button, Dialog with Input)

### E2E Tests (Playwright)

- **Theme Toggle Flow:** Click toggle → verify dark mode applied → refresh → verify persistence
- **Component Interaction:** Open dialog → fill form → submit → verify toast appears
- **Keyboard Navigation:** Tab through focusable elements, escape to close dialogs
- **Visual Regression:** Compare screenshots in light/dark mode (optional, via Storybook)

## Risk Mitigation

| Risk                                     | Mitigation                                                   |
| ---------------------------------------- | ------------------------------------------------------------ |
| Next.js 16 breaking changes              | Pin exact version, follow upgrade guide, test thoroughly     |
| Tailwind v4 migration complexity         | Use upgrade tool, test CSS output, document differences      |
| Storybook React version inconsistency    | Accept for local dev, document known issue, monitor releases |
| shadcn/ui unified radix-ui compatibility | Use new-york style, follow Feb 2026 changelog                |
| CI runtime increase                      | Parallelize jobs, use pnpm cache, matrix strategy            |
| Bundle size increase                     | Tree shaking, code splitting, monitor with size-limit        |

## Rollback Plan

**If major issues arise:**

1. **Dependencies:** Revert package.json changes, run `pnpm install --force`
2. **Configuration:** Files are new, simply delete if needed
3. **CI/CD:** Revert ci.yml changes, existing jobs unaffected
4. **Git:** All changes on feature branch, main branch untouched

**Incremental approach:** Each phase is independently revertable. If Phase 3 (Storybook) fails, Phases 1-2 still provide working component library.

## Dependencies Between Phases

```
Phase 1 (Foundation)
    │
    ├───► Phase 2 (shadcn/ui) ───► Phase 4 (Testing)
    │                                    │
    └───► Phase 3 (Storybook) ◄──────────┘
                │
                ▼
          Phase 5 (CI/CD)
```

- Phase 2 depends on Phase 1 (needs Tailwind v4, directory structure)
- Phase 3 depends on Phase 1 (needs build working)
- Phase 3 can run parallel with Phase 2 [P]
- Phase 4 depends on Phase 2 (needs components to test)
- Phase 5 depends on Phases 3 & 4 (needs tests and Storybook)

---

_Updated by `/shep-kit:plan` — see tasks.md for detailed breakdown_
