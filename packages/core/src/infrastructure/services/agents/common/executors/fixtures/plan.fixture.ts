/**
 * Plan Fixture
 *
 * Realistic fixture for the fictional "Add dark-mode toggle to Shep Web UI" feature.
 * Passes validatePlan() with zero repair iterations.
 */

export const PLAN_FIXTURE = `name: dark-mode-toggle
summary: >
  Implement dark-mode toggle across 3 phases: ThemeProvider context foundation,
  ThemeToggle component, and settings panel integration. No interface changes
  required; the feature slots into existing React context and component patterns.

relatedFeatures: []

technologies:
  - React 19 context API
  - Tailwind CSS v4
  - shadcn/ui Switch
  - Next.js App Router
  - Storybook
  - Vitest

relatedLinks: []

phases:
  - id: phase-1
    name: 'Theme Context Foundation'
    description: >
      Create the ThemeProvider component and useTheme hook. This phase establishes
      the theme state management infrastructure that all subsequent phases depend on.
      ThemeProvider reads from localStorage on mount and writes on toggle.
    parallel: false

  - id: phase-2
    name: 'ThemeToggle Component'
    description: >
      Create the ThemeToggle UI component using shadcn/ui Switch and Label.
      Includes Storybook story with light and dark variant knobs and unit tests
      using jsdom for DOM interaction.
    parallel: false

  - id: phase-3
    name: 'Settings Panel Integration'
    description: >
      Mount ThemeProvider in the root layout and add ThemeToggle to the settings
      panel. Run full pnpm validate and pnpm test to confirm no regressions.
    parallel: false

filesToCreate:
  - src/presentation/web/components/common/theme/theme-provider.tsx
  - src/presentation/web/components/common/theme/use-theme.ts
  - src/presentation/web/components/common/theme/theme-toggle.tsx
  - src/presentation/web/components/common/theme/theme-toggle.stories.tsx

filesToModify:
  - src/presentation/web/app/layout.tsx
  - src/presentation/web/components/features/settings/settings-panel.tsx

openQuestions: []

content: |
  ## Architecture Overview

  The ThemeProvider wraps the Next.js App Router root layout, making the theme context
  available to the entire component tree via useTheme hook. The ThemeToggle component
  is a pure UI component that consumes useTheme and renders a shadcn/ui Switch with
  no business logic.

  ## Key Design Decisions

  **ThemeProvider in root layout**: Placing the provider at the top of the component
  tree avoids prop drilling and matches the SettingsProvider pattern already in use.

  **localStorage persistence**: Read on mount, write on toggle. No SSR conflicts
  because localStorage is only accessed in useEffect (client-side only).

  **Tailwind dark: class**: Toggling the html element class is the zero-config
  approach for Tailwind v4. No tailwind.config.ts changes needed.

  ## Implementation Strategy

  Phase 1 establishes the foundation (context, hook) before any UI is built.
  Phase 2 builds the UI component in isolation — fully testable without the settings
  panel. Phase 3 wires everything together and validates the full integration. This
  dependency ordering ensures each phase is independently verifiable.

  ## Risk Mitigation

  | Risk | Mitigation |
  | ---- | ---------- |
  | FOUC on initial load | ThemeProvider sets html class synchronously from localStorage on mount |
  | localStorage unavailable (SSR) | useEffect guard: only access localStorage in browser context |
  | shadcn/ui Switch not yet installed | Check if component exists; install via shadcn add switch if needed |
`;
