# Feature: web-ui-component-library

> Establish component library foundation with shadcn/ui, Storybook, and design system

## Status

- **Number:** 004
- **Created:** 2026-02-03
- **Branch:** feat/004-web-ui-component-library
- **Phase:** Complete

## Problem Statement

The web UI presentation layer (`src/presentation/web/`) doesn't exist yet. While package.json has scripts for Next.js and Storybook, the actual dependencies, configurations, and component infrastructure are missing. Without a component library foundation:

- No reusable UI components for building web interfaces
- No design system for consistent styling and theming
- No component documentation via Storybook
- No way to build web-based interfaces for the Shep AI platform

This feature establishes the foundational component library using shadcn/ui (Radix primitives + Tailwind) with Storybook for documentation.

## Success Criteria

- [x] Next.js 16 (latest) installed and configured with App Router
- [x] React 19 (stable) with Next.js 16 support
- [x] shadcn/ui CLI 3.7.0+ installed and initialized
- [x] Tailwind CSS v4 configured with design tokens (colors, spacing, typography, shadows)
- [x] **Dark mode support configured from the start** (Tailwind v4 dark mode + theme tokens)
- [x] Storybook 8.6.14 configured for React/Vite components (local development only)
- [x] Unified `radix-ui` package (not individual @radix-ui/react-\* packages)
- [x] Core shadcn/ui components installed: Button, Card, Input, Label, Select, Dialog
- [x] Additional components installed: Badge, Alert, Tabs, Accordion, Toast, Popover
- [x] Each component has Storybook stories with all variants (light + dark mode)
- [x] Design tokens documented in Storybook (colors, spacing, typography, shadows)
- [x] `src/presentation/web/` directory structure follows Clean Architecture
- [x] Component tests written following TDD principles (Vitest + React Testing Library 16+)
- [x] Playwright 1.58+ E2E test setup verified for web components
- [x] **pnpm compatibility** ensured for all web dependencies and scripts
- [x] E2E tests integrated into existing pnpm test commands (`pnpm test:e2e:web`)
- [x] CI/CD pipeline updated to run web UI tests (unit + E2E) and Storybook build

## Affected Areas

| Area                        | Impact | Reasoning                                                           |
| --------------------------- | ------ | ------------------------------------------------------------------- |
| `src/presentation/web/`     | High   | New directory - entire web UI layer foundation                      |
| `package.json`              | High   | Add Next.js 16, React 19, shadcn/ui, Storybook 10, Tailwind v4 deps |
| `.storybook/`               | High   | New directory - Storybook 10.x configuration                        |
| `tailwind.config.ts`        | High   | New file - Tailwind v4 with dark mode + design tokens               |
| `postcss.config.js`         | Medium | New file - PostCSS for Tailwind v4                                  |
| `components.json`           | Medium | New file - shadcn/ui configuration                                  |
| `src/presentation/web/lib/` | Medium | Utility functions (cn helper, theme utilities)                      |
| `tests/unit/presentation/`  | Medium | New test directory for component unit tests                         |
| `tests/e2e/web/`            | Medium | E2E test directory for web UI (Playwright)                          |
| `tsconfig.json`             | Low    | Add paths for @/components and @/lib aliases                        |
| `eslint.config.mjs`         | Low    | Add React/Next.js ESLint rules                                      |
| `.prettierrc`               | Low    | Add Tailwind Prettier plugin                                        |
| `.github/workflows/ci.yml`  | Medium | Update CI to run web UI tests and Storybook build                   |
| `package.json` (scripts)    | Medium | Add web-specific pnpm scripts (test:e2e:web, build:storybook, etc.) |
| `docs/development/`         | Low    | Document component library usage and design system                  |

## Dependencies

None identified. This is foundational infrastructure with no feature dependencies.

## Size Estimate

**L** - Large feature requiring:

- Multiple latest-version tool installations (Next.js 16, React 19, Storybook 10.x, Tailwind v4, shadcn/ui 3.7+)
- New directory structure following Clean Architecture
- Tailwind v4 design token system with light + dark mode themes
- Unified `radix-ui` package integration (cleaner dependency tree)
- 12 components total (6 core + 6 additional) with Storybook 10.x stories
- Component testing infrastructure following TDD (React Testing Library 16+, Playwright 1.57+)
- Dark mode configuration across all tools using modern CSS features
- Comprehensive documentation with migration notes for Tailwind v4 and unified Radix

This establishes the cutting-edge foundation for all future web UI work.

## Open Questions

None - requirements are clear after user decisions:

- ✅ Dark mode: Yes, configured from the start
- ✅ Component set: Core 6 + Badge, Alert, Tabs, Accordion, Toast, Popover
- ✅ Storybook deployment: Local development only
- ✅ Versions: Latest stable (Next.js 16, React 19, Storybook 10.x, Tailwind v4, shadcn/ui 3.7+)
- ✅ Radix UI: Unified `radix-ui` package (not individual @radix-ui/react-\* packages)

---

_Generated by `/shep-kit:new-feature` — proceed with `/shep-kit:research`_
