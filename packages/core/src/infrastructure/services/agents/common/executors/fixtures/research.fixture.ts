/**
 * Research Fixture
 *
 * Realistic fixture for the fictional "Add dark-mode toggle to Shep Web UI" feature.
 * Passes validateResearch() with zero repair iterations.
 */

export const RESEARCH_FIXTURE = `name: dark-mode-toggle
summary: >
  The dark-mode implementation uses React context for theme state distribution,
  Tailwind CSS v4 class-based dark mode, and localStorage for preference persistence.
  No new npm dependencies are required. Three architectural decisions cover state
  management, CSS strategy, and persistence layer.

relatedFeatures: []

technologies:
  - React 19 context API
  - 'Tailwind CSS v4 (dark: modifier)'
  - localStorage Web API
  - shadcn/ui Switch component
  - Next.js App Router root layout

relatedLinks: []

decisions:
  - title: 'Theme State Management'
    chosen: >
      React context with a ThemeProvider component and useTheme hook. The provider
      reads the initial value from localStorage and sets the html element class on
      mount and on toggle.
    rejected:
      - >
        Zustand global store: adds a new state management library dependency for a
        single boolean value; over-engineered for this scope when React context
        achieves the same result in ~40 lines.
      - >
        next-themes library: a popular choice but adds a new npm package for
        functionality achievable in-house; the project guideline prefers no new
        dependencies when existing tools suffice (NFR-3).
    rationale: >
      The project already uses React context extensively (e.g., SettingsProvider).
      A simple context-based ThemeProvider follows the established pattern and
      requires zero new dependencies — consistent with NFR-3.

  - title: 'CSS Dark Mode Strategy'
    chosen: >
      Tailwind CSS v4 class-based dark mode: add the dark class to the html element
      and rely on Tailwind dark: variants already present in shadcn/ui components.
    rejected:
      - >
        CSS custom properties (CSS variables) approach: requires redefining all
        existing Tailwind color tokens as CSS variables and large changes to every
        styled component — disproportionate for this feature.
      - >
        Inline style overrides on individual components: does not scale; breaks
        existing Tailwind utility classes; produces unmaintainable ad-hoc styling.
    rationale: >
      Tailwind CSS v4 with darkMode: class is already configured in the project.
      All shadcn/ui components expose dark: variants. Toggling the html class is
      the minimal, canonical approach that requires no additional configuration.

  - title: 'Persistence Layer for Theme Preference'
    chosen: >
      localStorage Web API. Read on ThemeProvider mount to restore the preference;
      write on every toggleTheme() call. Key: shep-theme, values: light or dark.
    rejected:
      - >
        SQLite settings via backend API: requires a new settings field, API endpoint,
        and schema migration — out of scope for a client-side preference.
      - >
        sessionStorage: does not persist across browser sessions; the whole point
        is remembering the user preference between visits.
    rationale: >
      localStorage is the de-facto standard for persisting UI theme preferences
      client-side. It is synchronous, zero-dependency, available in all target
      browsers, and requires no backend changes — satisfying NFR-3.

openQuestions: []

content: |
  ## Technology Decisions

  ### 1. Theme State Management

  **Chosen:** React context ThemeProvider + useTheme hook

  **Rejected:**
  - Zustand global store — adds a new dependency for a single boolean
  - next-themes library — adds a package for functionality achievable in ~40 lines

  **Rationale:** Follows established SettingsProvider pattern. Zero new dependencies.

  ### 2. CSS Dark Mode Strategy

  **Chosen:** Tailwind CSS v4 dark: class-based (dark class on html element)

  **Rejected:**
  - CSS custom properties — requires redefining all color tokens (large change surface)
  - Inline style overrides — unmaintainable, breaks Tailwind utilities

  **Rationale:** Already configured; shadcn/ui components expose dark: variants natively.

  ### 3. Persistence Layer

  **Chosen:** localStorage (key: shep-theme, values: light | dark)

  **Rejected:**
  - SQLite settings via API — out of scope, requires migration
  - sessionStorage — does not survive browser restarts

  **Rationale:** De-facto standard for client-side theme persistence. Zero backend changes.

  ## Library Analysis

  | Library | Purpose | Decision | Reasoning |
  | ------- | ------- | -------- | --------- |
  | next-themes | SSR-safe theme management | Reject | Adds dependency for in-house functionality |
  | Tailwind CSS v4 | Dark mode via dark: class | Use (existing) | Already configured, shadcn/ui compatible |
  | shadcn/ui Switch | Toggle UI control | Use (existing) | Already a project dependency, accessible |
  | localStorage | Preference persistence | Use (built-in) | No dependency, synchronous, universally available |

  ## Security Considerations

  localStorage is readable by any JavaScript on the page. The stored value is
  light or dark — no sensitive data. The ThemeProvider must sanitize the retrieved
  value (only accept light or dark; default to light for any other value) to prevent
  unexpected CSS class injection.

  ## Performance Implications

  localStorage.getItem() is synchronous and executes in under 1ms. Setting the html
  class on mount avoids a flash of unstyled content (FOUC) provided the ThemeProvider
  is high enough in the component tree.

  ## Architecture Notes

  ThemeProvider wraps the root layout, making theme state available to all pages and
  components without prop drilling. The useTheme hook is consumed only by ThemeToggle
  and the root layout. This follows the existing SettingsProvider pattern.
`;
