## Status

- **Phase:** Research
- **Updated:** 2026-02-11

## Current State Analysis

### Existing Components (13 shadcn/ui primitives)

| Component | Pattern                     | Variants            | Stories    |
| --------- | --------------------------- | ------------------- | ---------- |
| Button    | CVA + forwardRef            | 6 variants, 3 sizes | 11 stories |
| Card      | Compound (6 sub-components) | None                | Yes        |
| Badge     | CVA                         | 4 variants          | Yes        |
| Input     | forwardRef                  | None                | Yes        |
| Label     | Radix UI wrapper            | CVA                 | Yes        |
| Dialog    | Radix UI compound           | None                | Yes        |
| Select    | Radix UI compound           | None                | Yes        |
| Tabs      | Radix UI compound           | None                | Yes        |
| Accordion | Radix UI compound           | None                | Yes        |
| Alert     | CVA compound                | 2 variants          | 4 stories  |
| Popover   | Radix UI wrapper            | None                | Yes        |
| Sonner    | Toaster wrapper             | None                | Yes        |

### Existing Feature Components

- **ThemeToggle** — Client component using useTheme hook. Will move to `common/`.

### Current Import Map

Only 6 files import from `@/components`:

- `app/page.tsx` → Button
- `app/version/version-page-client.tsx` → Card, Badge, Button, Tabs
- `components/features/theme-toggle/theme-toggle.tsx` → Button

No external files import from `@/components/features` — ThemeToggle migration is safe.

## Technology Decisions

### 1. Component Tier Architecture

**Decision:** Four-tier hierarchy (`ui/` → `common/` → `layouts/` → `features/`)

**Import rules (strict dependency direction):**

| Tier | Directory   | Can Import From              |
| ---- | ----------- | ---------------------------- |
| 0    | `ui/`       | Nothing in `components/`     |
| 1    | `common/`   | `ui/` only                   |
| 2    | `layouts/`  | `ui/`, `common/`             |
| 3    | `features/` | `ui/`, `common/`, `layouts/` |

### 2. Storybook Framework Adapter

**Decision:** Keep `@storybook/react-vite`

`@storybook/nextjs-vite` has an active bug with Tailwind v4 PostCSS (storybook#31373).
Since we render UI components not pages with routing, losing Next.js mocking is acceptable.

### 3. Tailwind v4 in Storybook

**Decision:** Use `@tailwindcss/vite` plugin in `viteFinal` via dynamic import

```typescript
viteFinal: async (config) => {
  const { default: tailwindcss } = await import('@tailwindcss/vite');
  const { mergeConfig } = await import('vite');
  return mergeConfig(config, { plugins: [tailwindcss()] });
},
```

### 4. Story Organization

**Decision:** Category-based naming mapped to component tiers

| Tier      | Story Title Prefix | Example                  |
| --------- | ------------------ | ------------------------ |
| Docs      | `Design System/`   | `Design System/Colors`   |
| ui/       | `Primitives/`      | `Primitives/Button`      |
| common/   | `Composed/`        | `Composed/PageHeader`    |
| layouts/  | `Layout/`          | `Layout/DashboardLayout` |
| features/ | `Features/`        | `Features/SettingsForm`  |

Sidebar sorting via `storySort` in preview.tsx.

### 5. Storybook Addons

**Add:** `@storybook/addon-a11y`, `@storybook/addon-interactions`
**Keep:** `@storybook/addon-essentials`, `@storybook/addon-links`
**Skip:** addon-themes, storybook-design-token, Chromatic

### 6. Barrel Export Strategy

**Decision:** Per-component `index.ts` only, no tier-level barrels

- Remove `components/ui/index.ts` barrel
- Remove `components/features/index.ts` barrel
- Each component folder gets its own `index.ts`
- Direct imports: `import { Button } from '@/components/ui/button'`

### 7. Design System Documentation

**Decision:** MDX in `src/presentation/web/docs/` with Storybook doc blocks

- `docs/Colors.mdx` — ColorPalette + ColorItem
- `docs/Typography.mdx` — Typeset
- `docs/Shadows.mdx` — Shadow tokens
- `docs/GettingStarted.mdx` — Component usage guide

Stories glob updated to include `docs/**/*.mdx`.

### 8. Client/Server Component Boundaries

**Decision:** Push `"use client"` down to leaf components

| Scenario                                           | Needs `"use client"`? |
| -------------------------------------------------- | --------------------- |
| Uses hooks (useState, useEffect)                   | Yes                   |
| Has event handlers (onClick)                       | Yes                   |
| Wraps interactive shadcn primitive + manages state | Yes                   |
| Composes only static primitives (Card, Badge)      | No                    |
| Layout shell accepting children                    | No                    |

## Library Analysis

| Library                       | Version | Purpose               | Action  |
| ----------------------------- | ------- | --------------------- | ------- |
| @storybook/react-vite         | 8.6.14  | Storybook framework   | Keep    |
| @storybook/addon-essentials   | 8.6.14  | Core addons           | Keep    |
| @storybook/addon-links        | 8.6.14  | Story linking         | Keep    |
| @storybook/addon-a11y         | 8.6.x   | Accessibility checks  | **Add** |
| @storybook/addon-interactions | 8.6.x   | Play function testing | **Add** |
| @tailwindcss/vite             | ^4.1    | Tailwind in Storybook | **Add** |

## Security Considerations

No security implications. This feature is purely presentational — restructuring
component directories and Storybook configuration. No new data flows, authentication,
or external API integrations.

## Performance Implications

- **Barrel export removal**: Improves tree-shaking by preventing unnecessary module evaluation
- **Server Components**: Layout shells remain Server Components where possible, reducing client JS
- **Storybook build**: Moderate increase in story count with minimal build time impact

## Open Questions

All questions resolved.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
