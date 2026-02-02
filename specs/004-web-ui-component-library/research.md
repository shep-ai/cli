# Research: web-ui-component-library

> Technical analysis for 004-web-ui-component-library

## Status

- **Phase:** Research
- **Updated:** 2026-02-03

## Technology Decisions

### 1. Next.js 16 Setup Approach

**Options considered:**

1. **Manual installation** with `npm install next@latest` + manual config
2. **create-next-app** with `npx create-next-app@latest` (includes defaults)
3. **Automated upgrade** with `npx @next/codemod@canary upgrade latest` (for upgrades)

**Decision:** Use **create-next-app@latest** for fresh setup

**Rationale:**

- Template includes App Router by default with TypeScript-first config
- Comes with Tailwind CSS pre-configured
- ESLint setup included
- Turbopack stable and enabled by default in Next.js 16
- React 19.2 integration included with View Transitions, useEffectEvent, Activity support
- System requirements: Node.js 20.9.0+ (v18 no longer supported)
- Browser support aligns with Tailwind v4: Chrome 111+, Edge 111+, Firefox 111+, Safari 16.4+

**Sources:** [Next.js 16 Docs](https://nextjs.org/blog/next-16) | [Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) | [Getting Started](https://nextjs.org/docs/app/getting-started/installation)

### 2. Tailwind CSS v4 Configuration & Dark Mode Strategy

**Options considered:**

1. **light-dark() CSS function** - Single variable with automatic light/dark values
2. **prefers-color-scheme media query** - CSS-based theme switching
3. **Manual class-based (.dark)** - Class toggle on root element with theme variables

**Decision:** Use **manual class-based (.dark) with @theme blocks**

**Rationale:**

- Manual dark mode provides user control (not tied to OS preference)
- CSS-first configuration using `@theme` blocks in v4:
  ```css
  .dark {
    @theme {
      --color-surface: #1f2937;
      --color-on-surface: #f9fafb;
    }
  }
  ```
- Migration via `npx @tailwindcss/upgrade@next` automates config conversion
- v4 performance: 5x faster full builds, 100x faster incremental builds
- Requires modern CSS: @property, color-mix(), cascade layers
- Browser requirements match our targets (Safari 16.4+, Chrome 111+, Firefox 128+)

**Trade-offs:**

- Pro: Full user control, consistent with most design systems
- Con: More complex than `light-dark()` for simple use cases
- Note: Maintainers warn that swapping colors between modes can be tricky at scale

**Sources:** [Tailwind v4 Dark Mode](https://tailwindcss.com/docs/dark-mode) | [Migration Guide](https://tailwindcss.com/docs/upgrade-guide) | [Comprehensive v4 Guide](https://staticblock.tech/posts/comprehensive-guide-tailwind-v4)

### 3. shadcn/ui with Unified Radix UI Package

**Options considered:**

1. **Traditional approach** - Individual `@radix-ui/react-*` packages per component
2. **Unified radix-ui package** - Single `radix-ui` package (new-york style, Feb 2026)
3. **Base UI alternative** - Use Base UI instead of Radix primitives

**Decision:** Use **unified `radix-ui` package (new-york style)**

**Rationale:**

- shadcn/ui 3.7.0+ supports unified package out of the box
- Cleaner dependency tree: 1 package vs dozens of `@radix-ui/react-*` packages
- New-york style uses `radix-ui` imports automatically
- Migration command available: `npx shadcn@latest migrate radix` for existing projects
- Installation: `npx shadcn@latest init` (auto-configures unified package)
- Simpler package.json with single radix-ui dependency

**Trade-offs:**

- Pro: Cleaner dependencies, easier maintenance, smaller node_modules
- Pro: Aligned with latest shadcn/ui best practices (Feb 2026 update)
- Con: Requires migration for existing projects using individual packages
- Con: New approach (released Feb 2026), less historical documentation

**Sources:** [shadcn/ui Unified Radix UI](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui) | [Changelog](https://ui.shadcn.com/docs/changelog) | [Installation](https://ui.shadcn.com/docs/installation)

### 4. Storybook 10 Integration with Next.js 16

**Options considered:**

1. **Storybook with Webpack** - Traditional Next.js integration
2. **Storybook with Vite** - Faster builds, modern tooling (recommended)
3. **Skip Storybook** - Use only Next.js dev server for component development

**Decision:** Use **Storybook 10 with Vite** (recommended framework)

**Rationale:**

- Storybook 10.1.11 has official Next.js 16 and Vitest 4 support
- Vite integration provides faster builds and modern tooling
- React 19.2 compatibility confirmed
- ESM-only requirement (Node 20.16+, 22.19+, or 24+) matches our stack
- React Server Components (RSC) support via `experimentalRSC` flag
- Installation: `npx storybook@latest init` (auto-detects Next.js)

**Known Issues:**

- React version inconsistency warning: Storybook forces Next.js bundled React version
- Not critical for our use case (local development only)
- RSC support still experimental but available

**Trade-offs:**

- Pro: Faster builds with Vite, better developer experience
- Pro: Official support for Next.js 16 and React 19
- Con: ESM-only (breaking change), requires modern Node
- Con: React version inconsistency in some edge cases

**Sources:** [Storybook 10 Docs](https://storybook.js.org/blog/storybook-10/) | [Next.js Integration](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite) | [Migration Guide](https://storybook.js.org/docs/releases/migration-guide)

### 5. Testing Infrastructure (Vitest + RTL + Playwright)

**Options considered:**

1. **Jest + RTL + Cypress** - Traditional combo (widely documented)
2. **Vitest + RTL + Playwright** - Modern stack (faster, better DX)
3. **Jest + RTL + Playwright** - Mixed approach

**Decision:** Use **Vitest + React Testing Library 16+ + Playwright 1.57+**

**Rationale:**

**Vitest for Unit/Component Tests:**

- Native ESM support (aligns with Next.js 16 and Storybook 10)
- Faster than Jest (designed for Vite-based projects)
- Official Next.js guide: [Testing with Vitest](https://nextjs.org/docs/app/guides/testing/vitest)
- Installation: `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`
- Note: React Server Components (async) not yet supported by Vitest - use E2E for these

**React Testing Library 16.3.1:**

- Requires explicit `@testing-library/dom` peer dependency
- Requires React 18+ (we're using React 19, so compatible)
- User-focused component testing approach

**Playwright 1.57+:**

- E2E tests for critical flows (3-5 key scenarios)
- Official Next.js guide: [Testing with Playwright](https://nextjs.org/docs/pages/guides/testing/playwright)
- Installation: `pnpm create playwright`
- Chrome for Testing builds (switched from Chromium in 1.57)

**pnpm Compatibility:**

- All tools support pnpm natively
- Use pnpm workspace commands for monorepo-like structure

**Trade-offs:**

- Pro: Modern, fast, ESM-first stack aligned with Next.js 16
- Pro: Official Next.js documentation for both Vitest and Playwright
- Con: Vitest doesn't support async Server Components yet (use E2E instead)
- Con: Requires learning Vitest API if team familiar with Jest

**Sources:** [Next.js Vitest Guide](https://nextjs.org/docs/app/guides/testing/vitest) | [Next.js Playwright Guide](https://nextjs.org/docs/pages/guides/testing/playwright) | [Testing in 2026 Strategies](https://www.nucamp.co/blog/testing-in-2026-jest-react-testing-library-and-full-stack-testing-strategies)

### 6. CI/CD Integration Strategy

**Options considered:**

1. **Separate web-specific workflow** - New `.github/workflows/web.yml`
2. **Extend existing ci.yml** - Add web jobs to current workflow
3. **No CI integration** - Run tests locally only

**Decision:** **Extend existing ci.yml with web test jobs**

**Rationale:**

- Consistent with existing CI/CD structure (specs 002, 003)
- Run web tests in parallel with existing tests (CLI, TUI, unit, integration)
- Add jobs:
  - `web-unit-tests`: Vitest tests for components
  - `web-e2e-tests`: Playwright tests for critical flows
  - `storybook-build`: Verify Storybook builds successfully
- All jobs run on PR and main pushes
- Use pnpm cache for faster CI runs
- Matrix strategy for Node versions (20.x, 22.x)

**Trade-offs:**

- Pro: Single workflow, easier maintenance
- Pro: Consistent with existing patterns
- Con: Longer CI run time (mitigated by parallel jobs)
- Con: More complex workflow file

### 7. Design Token System

**Options considered:**

1. **Tailwind defaults only** - Use built-in scale, no customization
2. **CSS variables in globals.css** - Manual token definitions
3. **Tailwind v4 @theme blocks** - Define tokens in CSS with @theme directive

**Decision:** **Tailwind v4 @theme blocks for design tokens**

**Rationale:**

- Native Tailwind v4 approach using CSS-first configuration
- Define tokens in `src/presentation/web/app/globals.css`:

  ```css
  @import 'tailwindcss';

  @theme {
    /* Colors */
    --color-primary: #3b82f6;
    --color-surface: #ffffff;
    --color-on-surface: #111827;

    /* Spacing */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;

    /* Typography */
    --font-sans: 'Inter', system-ui, sans-serif;
    --text-base: 1rem;

    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  }

  .dark {
    @theme {
      --color-surface: #111827;
      --color-on-surface: #f9fafb;
    }
  }
  ```

- Tokens accessible via Tailwind utilities: `bg-surface`, `text-on-surface`, etc.
- Documented in Storybook via MDX pages showing all tokens
- Follows shadcn/ui conventions (compatible with new-york style)

**Trade-offs:**

- Pro: Leverages Tailwind v4's modern CSS features
- Pro: Clean separation of tokens from component code
- Pro: Easy to document and visualize in Storybook
- Con: Requires understanding Tailwind v4's @theme syntax

### 8. pnpm Workspaces Integration

**Options considered:**

1. **Single package** - Keep web UI in root package (current structure)
2. **Separate workspace package** - Move to `packages/web/` or `apps/web/`
3. **Hybrid** - Web UI in root, but use workspace protocol for internal deps

**Decision:** **Single package (root) with future workspace readiness**

**Rationale:**

- Project already has `pnpm-workspace.yaml` configured for future expansion
- Current structure: single-package workspace (`packages: ['.']`)
- Web UI at `src/presentation/web/` keeps it alongside CLI and TUI presentation layers
- Clean Architecture principle: All presentation layers at same level
- Future-ready: Can move to `packages/web/` if needed without breaking changes
- pnpm commands work the same (root is a workspace member)
- Dependency management: Use standard `pnpm add` (no `workspace:` protocol needed yet)

**pnpm Workspace Features Used:**

- Single `pnpm-lock.yaml` in root (already configured)
- Single `node_modules` in root (efficient)
- Filter flag available: `pnpm --filter web <command>` (if we add workspace packages later)
- Parallel execution: `pnpm -r --parallel` (for future workspaces)

**Trade-offs:**

- Pro: Simpler structure, no monorepo overhead yet
- Pro: Consistent with existing CLI/TUI presentation layers
- Pro: Easy migration to separate workspace package later
- Con: Miss out on some monorepo benefits (independent versioning, etc.)

**Future Migration Path:**

If we need separate web package:

```yaml
# pnpm-workspace.yaml
packages:
  - '.'
  - 'apps/web' # Next.js app
  - 'packages/*' # Shared packages
```

**Sources:** [pnpm Workspaces](https://pnpm.io/next/workspaces) | [Monorepo Guide 2025](https://jsdev.space/complete-monorepo-guide/) | [Next.js pnpm Monorepo](https://medium.com/@bashorundolapo/how-to-create-a-simple-next-js-monorepo-with-pnpm-82af37289b50)

### 9. Clean Architecture Structure for Web Components

**Options considered:**

1. **Flat structure** - All components in `src/presentation/web/components/`
2. **Feature-based** - Group by feature (auth, dashboard, etc.)
3. **Atomic design** - atoms/molecules/organisms/templates/pages
4. **Clean Architecture adapted** - Align with existing domain/application/infrastructure layers

**Decision:** **Clean Architecture adapted structure**

**Rationale:**

- Align with existing project architecture (CLAUDE.md mandates Clean Architecture)
- Structure:
  ```
  src/presentation/web/
  ├── app/                    # Next.js App Router (routes)
  │   ├── layout.tsx          # Root layout with providers
  │   ├── page.tsx            # Home page
  │   └── globals.css         # Tailwind + design tokens
  ├── components/             # UI components (presentation layer)
  │   ├── ui/                 # shadcn/ui components (Button, Card, etc.)
  │   ├── features/           # Feature-specific components
  │   └── layouts/            # Layout components (Header, Footer, etc.)
  ├── lib/                    # Utilities (cn helper, theme utils)
  │   └── utils.ts
  ├── hooks/                  # React hooks (useTheme, etc.)
  └── types/                  # TypeScript types for web layer
  ```
- Components depend on use cases from `application/` layer (via props/hooks)
- No business logic in presentation components (follows Clean Architecture dependency rule)
- shadcn/ui components live in `components/ui/` (generated by CLI)

**Trade-offs:**

- Pro: Consistent with existing architecture
- Pro: Clear separation of concerns
- Pro: Easy to test (components are pure presentation)
- Con: More directories than flat structure
- Con: Requires discipline to avoid business logic in components

## Library Analysis

| Library                | Version | Purpose                     | Pros                                       | Cons                                     |
| ---------------------- | ------- | --------------------------- | ------------------------------------------ | ---------------------------------------- |
| next                   | 16.x    | React framework, App Router | Turbopack stable, React 19 support, fast   | Node 18 dropped, requires 20.9.0+        |
| react                  | 19.2    | UI library                  | Latest features (View Transitions, etc.)   | New major version, potential edge cases  |
| react-dom              | 19.2    | React DOM renderer          | Paired with React 19                       | -                                        |
| tailwindcss            | 4.x     | CSS framework               | 5x faster builds, modern CSS features      | Breaking changes, CSS-first config       |
| radix-ui               | 1.4.3   | Unified Radix primitives    | Single package, cleaner deps               | New approach (Feb 2026), less docs       |
| shadcn                 | 3.7.0+  | Component CLI               | Supports unified radix-ui, well-maintained | Not a traditional npm package (CLI tool) |
| @storybook/nextjs      | 10.1.11 | Component documentation     | Next 16 support, Vite integration, fast    | ESM-only, React version inconsistency    |
| vitest                 | 4.x     | Unit test runner            | Fast, ESM-native, Vite integration         | No async Server Component support        |
| @testing-library/react | 16.3.1  | Component testing utilities | User-focused testing, React 19 compatible  | Requires @testing-library/dom peer dep   |
| playwright             | 1.57+   | E2E testing                 | Chrome for Testing, unified API            | Heavier than unit tests, slower          |
| typescript             | 5.3+    | Type safety                 | Existing project standard                  | -                                        |

## Security Considerations

- **Dependency vulnerabilities**: All libraries are latest stable versions with recent security patches
  - Next.js 15.5+ includes critical CVE fixes (CVE-2025-55184, CVE-2025-55183)
  - Use `pnpm audit` and Trivy scans in CI (existing security gates from spec 003)
- **XSS prevention**: React 19 escapes content by default, Radix UI components are XSS-safe
- **Dark mode security**: No security implications (client-side theme switching only)
- **Client-side secrets**: No API keys or secrets in web layer (handled by application layer)
- **CSP headers**: Configure Content Security Policy in Next.js middleware if needed
- **Storybook deployment**: Local development only (not publicly deployed), no security risk

## Performance Implications

**Positive:**

- **Tailwind v4**: 5x faster full builds, 100x faster incremental builds (microsecond-level)
- **Next.js 16 Turbopack**: Stable and enabled by default, significant build speed improvements
- **Unified radix-ui package**: Smaller bundle size (1 package vs dozens), faster install times
- **Vitest**: Faster than Jest, parallel test execution
- **Storybook with Vite**: Faster builds compared to Webpack

**Negative:**

- **Playwright E2E tests**: Slower than unit tests (acceptable trade-off for confidence)
- **React 19 bundle size**: Slightly larger than React 18 (new features included)

**Optimizations:**

- Code splitting via Next.js App Router (automatic)
- Tree shaking with ESM (all libraries support ESM)
- Lazy loading for Storybook stories (via `import()`)
- Playwright parallelization (run tests concurrently in CI)

**Bundle size targets:**

- Initial page load: < 200KB (gzipped)
- Component library: < 50KB per component (with tree shaking)

## Open Questions

All questions resolved. Key decisions finalized:

- ✅ Next.js 16 setup approach (create-next-app)
- ✅ Tailwind v4 dark mode strategy (manual class-based)
- ✅ shadcn/ui installation (unified radix-ui package)
- ✅ Storybook integration (v10 with Vite)
- ✅ Testing stack (Vitest + RTL 16 + Playwright 1.57+)
- ✅ CI/CD approach (extend existing ci.yml)
- ✅ Design token system (@theme blocks)
- ✅ pnpm workspaces integration (single package, root-level)
- ✅ Clean Architecture structure (adapted for web layer)

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
