/**
 * Spec (Analyze Phase) Fixture
 *
 * Realistic fixture for the fictional "Add dark-mode toggle to Shep Web UI" feature.
 * Passes validateSpecAnalyze() with zero repair iterations.
 */

export const SPEC_ANALYZE_FIXTURE = `name: dark-mode-toggle
number: '042'
branch: feat/042-dark-mode-toggle
oneLiner: Add a dark-mode toggle to the Shep web UI settings panel
summary: >
  Introduce a persistent dark-mode toggle to the Shep web UI settings panel that
  applies a CSS class-based theme, stores the user preference in localStorage, and
  is surfaced as a shadcn/ui Switch component with full Storybook coverage.
phase: Analysis
sizeEstimate: M

relatedFeatures: []

technologies:
  - React 19
  - Next.js 16 (App Router)
  - Tailwind CSS v4
  - shadcn/ui
  - Storybook
  - TypeScript

relatedLinks: []

openQuestions: []

content: |
  ## Problem Statement

  The Shep web UI currently renders only in light mode. Developers working in dark
  environments or those who prefer dark themes have no way to switch the UI appearance.
  Adding a first-class dark-mode toggle improves developer experience and demonstrates
  the Shep settings panel as a configurable surface.

  ## Codebase Analysis

  ### Project Structure

  The web UI lives in src/presentation/web/ following Next.js App Router conventions.
  Components are organized into four tiers: ui/ (Tier 0), common/ (Tier 1),
  layouts/ (Tier 2), and features/ (Tier 3). Storybook stories are mandatory for every
  component.

  ### Architecture Patterns

  The project uses shadcn/ui (Radix primitives + Tailwind CSS v4) for all UI components.
  Theme state would live in a React context provider wrapping the root layout, following
  the existing SettingsProvider pattern in the codebase. Clean Architecture layers keep
  theme state in the presentation layer only.

  ### Relevant Technologies

  Tailwind CSS v4 supports dark mode via the \`dark\` CSS class on the html element.
  shadcn/ui provides a Switch component suitable for the toggle control. localStorage
  provides client-side persistence without any backend changes.

  ## Affected Areas

  | Area | Impact | Reasoning |
  | ---- | ------ | --------- |
  | src/presentation/web/components/features/settings/ | High | Settings panel receives the toggle component |
  | src/presentation/web/app/layout.tsx | Medium | Root layout needs ThemeProvider wrapper |
  | src/presentation/web/components/common/ | Medium | ThemeToggle and ThemeProvider components created here |
  | tailwind.config.ts | Low | Verify darkMode: class is configured |

  ## Dependencies

  - shadcn/ui Switch component
  - React context for theme state distribution
  - localStorage Web API for persistence (built-in, no new dependency)

  ## Size Estimate

  **M (days)** — Context setup, toggle component, settings integration, Storybook stories,
  and tests across 3 phases add up to roughly 2 developer-days with TDD.
`;
