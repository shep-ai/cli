# Tasks: web-ui-component-library

> Task breakdown for 004-web-ui-component-library

## Status

- **Phase:** Implementation
- **Updated:** 2026-02-03

## Task List

### Phase 1: Foundation & Dependencies

- [ ] **1.1** Install Next.js 16 and React 19 dependencies
  - `pnpm add next@latest react@latest react-dom@latest`
  - Verify package.json has correct versions
- [ ] **1.2** Create web presentation layer directory structure
  - `src/presentation/web/app/`
  - `src/presentation/web/components/ui/`
  - `src/presentation/web/components/features/`
  - `src/presentation/web/components/layouts/`
  - `src/presentation/web/lib/`
  - `src/presentation/web/hooks/`
  - `src/presentation/web/types/`
- [ ] **1.3** Configure Tailwind CSS v4
  - Create `tailwind.config.ts` with v4 configuration
  - Create `postcss.config.js`
  - Install `pnpm add -D tailwindcss@latest postcss autoprefixer`
- [ ] **1.4** Create globals.css with @theme design tokens
  - Define color tokens (primary, surface, on-surface, etc.)
  - Define spacing tokens (xs, sm, md, lg, xl)
  - Define typography tokens (font-sans, text sizes)
  - Define shadow tokens
  - Add .dark @theme block for dark mode
- [ ] **1.5** Create Next.js App Router files
  - `src/presentation/web/app/layout.tsx` (root layout)
  - `src/presentation/web/app/page.tsx` (home page placeholder)
  - Import globals.css in layout
- [ ] **1.6** Configure TypeScript path aliases
  - Add paths to tsconfig.json: @/components, @/lib, @/hooks, @/types
- [ ] **1.7** Add ESLint React/Next.js rules
  - Update eslint.config.mjs with React and Next.js plugins
  - `pnpm add -D eslint-plugin-react eslint-plugin-react-hooks @next/eslint-plugin-next`
- [ ] **1.8** Add Prettier Tailwind plugin
  - Update .prettierrc with tailwindcss plugin
  - `pnpm add -D prettier-plugin-tailwindcss`
- [ ] **1.9** Create utility functions (lib/utils.ts)
  - Implement cn() helper using clsx and tailwind-merge
  - `pnpm add clsx tailwind-merge`
- [ ] **1.10** Verify build succeeds
  - Run `pnpm build` and fix any errors
  - Run `pnpm typecheck` and fix any type errors

### Phase 2: shadcn/ui & Component Installation

- [ ] **2.1** Initialize shadcn/ui with unified radix-ui
  - Run `npx shadcn@latest init`
  - Select: TypeScript, new-york style, globals.css path, tailwind.config path
  - Verify components.json created
- [ ] **2.2** Install core shadcn/ui components [P]
  - `npx shadcn@latest add button` + write render test
  - `npx shadcn@latest add card` + write render test
  - `npx shadcn@latest add input` + write render test
  - `npx shadcn@latest add label` + write render test
  - `npx shadcn@latest add select` + write render test
  - `npx shadcn@latest add dialog` + write render test
- [ ] **2.3** Install additional shadcn/ui components [P]
  - `npx shadcn@latest add badge` + write render test
  - `npx shadcn@latest add alert` + write render test
  - `npx shadcn@latest add tabs` + write render test
  - `npx shadcn@latest add accordion` + write render test
  - `npx shadcn@latest add toast` + write render test (with sonner)
  - `npx shadcn@latest add popover` + write render test
- [ ] **2.4** Create useTheme hook
  - Implement in `src/presentation/web/hooks/useTheme.ts`
  - Support light/dark/system modes
  - Persist to localStorage
  - Apply .dark class to document.documentElement
- [ ] **2.5** Create ThemeToggle component
  - Implement in `src/presentation/web/components/features/theme-toggle.tsx`
  - Use Button component with icon
  - Toggle between light/dark modes
  - Show current theme state
- [ ] **2.6** Write theme type definitions
  - Create `src/presentation/web/types/theme.ts`
  - Define Theme type ('light' | 'dark' | 'system')
  - Define ThemeContext type
- [ ] **2.7** Add ThemeProvider to root layout
  - Wrap app in ThemeProvider
  - Handle hydration mismatch (suppressHydrationWarning)

### Phase 3: Storybook Setup & Stories [P]

- [ ] **3.1** Install Storybook 10.x
  - `npx storybook@latest init`
  - Select: React, Vite, TypeScript
  - Verify `.storybook/` directory created
- [ ] **3.2** Configure Storybook for Next.js 16
  - Update `.storybook/main.ts` with @storybook/nextjs-vite framework
  - Configure stories path: `src/presentation/web/**/*.stories.tsx`
  - Add Tailwind CSS support
- [ ] **3.3** Configure Storybook dark mode
  - Update `.storybook/preview.tsx`
  - Add globals.css import
  - Add dark mode toolbar toggle (storybook-dark-mode addon)
  - `pnpm add -D storybook-dark-mode`
- [ ] **3.4** Create Button stories
  - All variants: default, destructive, outline, secondary, ghost, link
  - All sizes: default, sm, lg, icon
  - States: disabled, loading
- [ ] **3.5** Create Card stories
  - Basic card, with header, with footer
  - Composition examples
- [ ] **3.6** Create Input stories
  - Default, with label, with error, disabled
- [ ] **3.7** Create Label stories
  - Default, required indicator
- [ ] **3.8** Create Select stories
  - With options, placeholder, disabled
- [ ] **3.9** Create Dialog stories
  - Default, with form, controlled state
- [ ] **3.10** Create Badge stories
  - Variants: default, secondary, destructive, outline
- [ ] **3.11** Create Alert stories
  - Variants: default, destructive
  - With icon, with description
- [ ] **3.12** Create Tabs stories
  - Default, controlled, vertical orientation
- [ ] **3.13** Create Accordion stories
  - Single, multiple, default open
- [ ] **3.14** Create Toast stories
  - Variants, with action, duration
- [ ] **3.15** Create Popover stories
  - Default, with form, positioning
- [ ] **3.16** Create ThemeToggle stories
  - Light, dark, system modes
- [ ] **3.17** Create Design Tokens documentation (MDX)
  - Colors (light + dark)
  - Spacing scale
  - Typography scale
  - Shadows
- [ ] **3.18** Verify Storybook build succeeds
  - Run `pnpm build:storybook`
  - Fix any build errors

### Phase 4: Testing Infrastructure

- [ ] **4.1** Configure Vitest for web components
  - Update `vitest.config.ts` with web-specific test settings
  - Add jsdom environment for component tests
  - Configure @vitejs/plugin-react
- [ ] **4.2** Install React Testing Library dependencies
  - `pnpm add -D @testing-library/react @testing-library/dom @testing-library/user-event`
- [ ] **4.3** Create test setup file
  - `tests/unit/presentation/web/setup.ts`
  - Configure testing-library, jest-dom matchers
  - `pnpm add -D @testing-library/jest-dom`
- [ ] **4.4** Write Button component tests
  - Test all variants render correctly
  - Test click handler fires
  - Test disabled state
  - Test accessibility (role="button")
- [ ] **4.5** Write Card component tests
  - Test renders children
  - Test Card.Header, Card.Content, Card.Footer
- [ ] **4.6** Write Input component tests
  - Test value change
  - Test disabled state
  - Test placeholder
- [ ] **4.7** Write Label component tests
  - Test htmlFor attribute
  - Test renders children
- [ ] **4.8** Write Select component tests
  - Test option selection
  - Test disabled state
- [ ] **4.9** Write Dialog component tests
  - Test open/close
  - Test escape key dismissal
  - Test focus trap
- [ ] **4.10** Write Badge component tests
  - Test all variants
- [ ] **4.11** Write Alert component tests
  - Test all variants
  - Test with icon
- [ ] **4.12** Write Tabs component tests
  - Test tab switching
  - Test keyboard navigation
- [ ] **4.13** Write Accordion component tests
  - Test expand/collapse
  - Test single/multiple mode
- [ ] **4.14** Write Toast component tests
  - Test show/dismiss
  - Test auto-dismiss duration
- [ ] **4.15** Write Popover component tests
  - Test open/close
  - Test positioning
- [ ] **4.16** Write ThemeToggle component tests
  - Test toggle between modes
  - Test localStorage persistence
- [ ] **4.17** Write useTheme hook tests
  - Test initial state from localStorage
  - Test toggle function
  - Test system preference detection
- [ ] **4.18** Configure Playwright
  - Create `playwright.config.ts`
  - Configure for web UI testing
  - `pnpm create playwright` (if not exists)
- [ ] **4.19** Write E2E theme toggle test
  - Navigate to home page
  - Click theme toggle
  - Verify dark mode class applied
  - Refresh page
  - Verify dark mode persisted
- [ ] **4.20** Add pnpm test scripts
  - `test:unit:web` - Vitest for web components
  - `test:e2e:web` - Playwright for web E2E

### Phase 5: CI/CD Integration & Documentation

- [ ] **5.1** Update ci.yml with web-unit-tests job
  - Run on push/PR
  - Use pnpm cache
  - Run `pnpm test:unit:web`
- [ ] **5.2** Update ci.yml with web-e2e-tests job
  - Run on push/PR
  - Install Playwright browsers
  - Run `pnpm test:e2e:web`
- [ ] **5.3** Update ci.yml with storybook-build job
  - Run on push/PR
  - Run `pnpm build:storybook`
  - Verify build succeeds
- [ ] **5.4** Add jobs to release dependency chain (if on main)
  - web-unit-tests, web-e2e-tests, storybook-build must pass before release
- [ ] **5.5** Update package.json scripts
  - Ensure all scripts work with pnpm
  - Add missing scripts (dev:web, build:web, test:unit:web, test:e2e:web)
- [ ] **5.6** Create component library documentation
  - `docs/development/web-component-library.md`
  - Getting started guide
  - Component usage examples
  - Design token reference
  - Testing guide
- [ ] **5.7** Verify CI passes on feature branch
  - Push all changes
  - Monitor CI run
  - Fix any failures
- [ ] **5.8** Update spec phase status to Complete
  - spec.md Phase: Complete
  - research.md Phase: Complete
  - plan.md Phase: Complete

## Parallelization Notes

- Tasks marked [P] can be executed concurrently
- **Phase 2.2 & 2.3**: Component installations can run in parallel (different components)
- **Phase 3**: Can start after Phase 1, run parallel with Phase 2 component installation
- **Phase 3.4-3.16**: Stories can be written in parallel (one person per component)
- **Phase 4.4-4.17**: Component tests can be written in parallel

## Effort Estimates

| Phase     | Tasks  | Estimated Effort  |
| --------- | ------ | ----------------- |
| Phase 1   | 10     | Foundation setup  |
| Phase 2   | 7      | Component setup   |
| Phase 3   | 18     | Storybook setup   |
| Phase 4   | 20     | Testing setup     |
| Phase 5   | 8      | CI/CD & docs      |
| **Total** | **63** | **Large feature** |

## Acceptance Checklist

Before marking feature complete:

- [ ] All tasks completed (63/63)
- [ ] All unit tests passing (`pnpm test:unit:web`)
- [ ] All E2E tests passing (`pnpm test:e2e:web`)
- [ ] Storybook builds (`pnpm build:storybook`)
- [ ] Web app builds (`pnpm build:web` or `pnpm build`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Types valid (`pnpm typecheck`)
- [ ] CI pipeline green on feature branch
- [ ] Documentation complete (`docs/development/web-component-library.md`)
- [ ] PR created and reviewed
- [ ] All spec file phases updated to Complete

---

_Task breakdown for implementation tracking - 63 tasks across 5 phases_
