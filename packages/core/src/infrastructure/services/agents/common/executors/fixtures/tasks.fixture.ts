/**
 * Tasks Fixture — fictional "Add dark-mode toggle to Shep Web UI" feature.
 * Passes validateTasks() against plan phase IDs [phase-1, phase-2, phase-3].
 */

export const TASKS_FIXTURE = `name: dark-mode-toggle
summary: >
  8 tasks across 3 phases: ThemeProvider context (phase-1), ThemeToggle component
  (phase-2), settings panel integration and validation (phase-3).

relatedFeatures: []
technologies: []
relatedLinks: []

tasks:
  - id: task-1
    phaseId: phase-1
    title: 'Create ThemeProvider and useTheme hook'
    description: 'ThemeProvider managing light/dark state via React context with localStorage persistence.'
    state: Todo
    dependencies: []
    acceptanceCriteria:
      - 'ThemeProvider renders children without error'
      - 'useTheme returns { theme, toggleTheme } where theme is "light" or "dark"'
      - 'toggleTheme() switches theme and toggles html element dark class'
      - 'Theme persists to localStorage key "shep-theme" on toggle'
    tdd:
      red: ['Write test: useTheme default is "light" with no localStorage entry', 'Write test: toggleTheme() adds dark class to html element']
      green: ['Implement ThemeProvider reading localStorage and calling classList.toggle', 'Implement useTheme hook calling useContext(ThemeContext)']
      refactor: ['Extract THEME_KEY constant; add sanitization for non-light/dark values']
    estimatedEffort: '2h'

  - id: task-2
    phaseId: phase-1
    title: 'Write unit tests for ThemeProvider edge cases'
    description: 'Cover edge cases: invalid stored value, double-toggle cycle, SSR safety.'
    state: Todo
    dependencies: ['task-1']
    acceptanceCriteria:
      - 'Test: invalid localStorage value "purple" defaults to "light"'
      - 'Test: toggling twice returns to original theme'
      - 'Test: ThemeProvider handles window being undefined (SSR safety)'
    tdd:
      red: ['Write test: localStorage "purple" → theme defaults to "light"']
      green: ['Sanitization branch handles all non-light/dark values']
      refactor: ['Consolidate theme validation into isValidTheme() helper']
    estimatedEffort: '1h'

  - id: task-3
    phaseId: phase-2
    title: 'Create ThemeToggle component'
    description: 'shadcn/ui Switch + Label component wired to useTheme(). onClick calls toggleTheme().'
    state: Todo
    dependencies: ['task-1']
    acceptanceCriteria:
      - 'ThemeToggle renders a Switch with aria-label "Toggle dark mode"'
      - 'Switch checked reflects current theme ("dark" = checked)'
      - 'Clicking Switch calls toggleTheme() exactly once'
      - 'Component file is <= 50 lines'
    tdd:
      red: ['Write test: Switch checked is false when theme is "light"', 'Write test: Switch click triggers toggleTheme()']
      green: ['Implement ThemeToggle with Switch checked wired to theme === "dark"']
      refactor: ['Extract aria-label constant; remove any inline styles']
    estimatedEffort: '1h'

  - id: task-4
    phaseId: phase-2
    title: 'Create Storybook story for ThemeToggle'
    description: 'theme-toggle.stories.tsx with Default and DarkMode variants using ThemeProvider decorator.'
    state: Todo
    dependencies: ['task-3']
    acceptanceCriteria:
      - 'Story includes Default and DarkMode variants with ThemeProvider decorator'
      - 'pnpm dev:storybook runs without error for the new story'
    tdd: null
    estimatedEffort: '30min'

  - id: task-5
    phaseId: phase-2
    title: 'Write integration test for ThemeToggle + ThemeProvider'
    description: 'Mount ThemeProvider wrapping ThemeToggle; assert full toggle cycle including localStorage.'
    state: Todo
    dependencies: ['task-3']
    acceptanceCriteria:
      - 'After clicking Toggle: html has dark class, localStorage has "dark"'
      - 'After clicking Toggle again: html has no dark class, localStorage has "light"'
    tdd:
      red: ['Write integration test: html class and localStorage after two toggle cycles']
      green: ['Test passes with existing ThemeProvider + ThemeToggle implementations']
      refactor: ['Extract renderWithTheme() test helper for reuse']
    estimatedEffort: '45min'

  - id: task-6
    phaseId: phase-3
    title: 'Wrap root layout in ThemeProvider'
    description: 'Update app/layout.tsx to wrap children with ThemeProvider.'
    state: Todo
    dependencies: ['task-1']
    acceptanceCriteria:
      - 'layout.tsx imports ThemeProvider and wraps children'
      - 'Existing Playwright e2e tests continue to pass'
    tdd:
      red: ['Write e2e test: dark class persists after page reload when toggled']
      green: ['Add ThemeProvider wrapping children in layout.tsx']
      refactor: ['Ensure import order follows project eslint rules']
    estimatedEffort: '30min'

  - id: task-7
    phaseId: phase-3
    title: 'Add ThemeToggle to settings panel'
    description: 'Add ThemeToggle to the Appearance section of settings-panel.tsx.'
    state: Todo
    dependencies: ['task-3', 'task-6']
    acceptanceCriteria:
      - 'settings-panel.tsx imports and renders ThemeToggle in the Appearance section'
      - 'ThemeToggle is visible and functional in the running web UI'
    tdd:
      red: ['Write unit test: ThemeToggle is present in rendered SettingsPanel']
      green: ['Add import and render ThemeToggle in the Appearance section']
      refactor: ['Ensure Appearance section heading is semantically correct (h2/h3)']
    estimatedEffort: '30min'

  - id: task-8
    phaseId: phase-3
    title: 'Run full validation and fix any issues'
    description: 'Run pnpm validate and pnpm test; fix any failures before marking complete.'
    state: Todo
    dependencies: ['task-6', 'task-7']
    acceptanceCriteria:
      - 'pnpm lint passes with no errors'
      - 'pnpm typecheck passes with no errors'
      - 'pnpm test passes with no failures'
      - 'pnpm build completes successfully'
    tdd: null
    estimatedEffort: '30min'

totalEstimate: '7.25h'
openQuestions: []

content: |
  ## Summary

  Phase-1 builds ThemeProvider + useTheme hook with full test coverage.
  Phase-2 creates ThemeToggle in isolation with Storybook stories and integration tests.
  Phase-3 wires the provider into the root layout, adds the toggle to the settings panel,
  then validates with pnpm validate + pnpm test.
`;
