# UI Architecture

Component architecture patterns and conventions for the Shep AI web interface.

## Four-Tier Component Hierarchy

Components are organized into four tiers with strict dependency direction. Higher tiers may import from lower tiers, but never the reverse.

```
Tier 0: ui/        → shadcn/ui primitives (CLI-managed, no business logic)
Tier 1: common/    → Cross-feature composed components (combine ui/ primitives)
Tier 2: layouts/   → Page shells, structural wrappers (use ui/ + common/)
Tier 3: features/  → Domain-specific UI bound to routes/data (use all lower tiers)
```

### Import Rules

| Tier        | Can Import From                     | Cannot Import From                 |
| ----------- | ----------------------------------- | ---------------------------------- |
| `ui/`       | External packages only              | `common/`, `layouts/`, `features/` |
| `common/`   | `ui/`, hooks, external packages     | `layouts/`, `features/`            |
| `layouts/`  | `ui/`, `common/`, hooks             | `features/`                        |
| `features/` | `ui/`, `common/`, `layouts/`, hooks | (no restrictions)                  |

## Directory Structure

```
components/
├── ui/                           # Tier 0: shadcn/ui primitives (CLI-managed)
│   ├── accordion.tsx
│   ├── accordion.stories.tsx
│   ├── alert.tsx
│   ├── alert.stories.tsx
│   ├── badge.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── popover.tsx
│   ├── select.tsx
│   ├── sonner.tsx
│   └── tabs.tsx
├── common/                       # Tier 1: Cross-feature composed components
│   ├── theme-toggle/
│   │   ├── theme-toggle.tsx
│   │   ├── theme-toggle.stories.tsx
│   │   └── index.ts
│   ├── page-header/
│   │   ├── page-header.tsx
│   │   ├── page-header.stories.tsx
│   │   └── index.ts
│   ├── empty-state/
│   │   ├── empty-state.tsx
│   │   ├── empty-state.stories.tsx
│   │   └── index.ts
│   └── loading-skeleton/
│       ├── loading-skeleton.tsx
│       ├── loading-skeleton.stories.tsx
│       └── index.ts
├── layouts/                      # Tier 2: Page shells, structural wrappers
│   ├── sidebar/
│   │   ├── sidebar.tsx
│   │   ├── sidebar.stories.tsx
│   │   └── index.ts
│   ├── header/
│   │   ├── header.tsx
│   │   ├── header.stories.tsx
│   │   └── index.ts
│   ├── dashboard-layout/
│   │   ├── dashboard-layout.tsx
│   │   ├── dashboard-layout.stories.tsx
│   │   └── index.ts
│   └── app-shell/
│       ├── app-shell.tsx
│       └── index.ts
└── features/                     # Tier 3: Domain-specific UI
    ├── version/
    │   └── version-page-client.tsx
    └── settings/
        └── .gitkeep
```

## Export Pattern

Each component directory uses a per-component `index.ts` barrel export. There are **no tier-level barrel files** (no `common/index.ts` or `layouts/index.ts`).

```typescript
// Per-component barrel (e.g., common/page-header/index.ts)
export { PageHeader } from './page-header';

// Import from the component directory
import { PageHeader } from '@/components/common/page-header';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
```

## Storybook Categories

Stories are organized to mirror the tier structure:

| Storybook Category          | Component Tier | Description                         |
| --------------------------- | -------------- | ----------------------------------- |
| `Design System/Primitives/` | `ui/`          | shadcn/ui base components           |
| `Common/`                   | `common/`      | Shared composed components          |
| `Layouts/`                  | `layouts/`     | Page shells and structural wrappers |
| `Features/`                 | `features/`    | Domain-specific components          |

## Component Patterns

### UI Components (Tier 0)

shadcn/ui primitives managed by the CLI. Do not manually modify these -- use `pnpm dlx shadcn@latest add [name]` to add new ones.

```typescript
// components/ui/button.tsx - CVA-based variants
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
```

### Common Components (Tier 1)

Each component in its own subfolder with colocated stories and barrel export:

```
components/common/[name]/
├── [name].tsx              # Component implementation
├── [name].stories.tsx      # Storybook stories
└── index.ts                # Re-export for clean imports
```

### Layout Components (Tier 2)

Same subfolder pattern as common. Compose `ui/` and `common/` components into page structures.

### Feature Components (Tier 3)

Organized by domain bounded context. May contain client components, data fetching logic, and route-specific UI.

```
components/features/[domain]/
├── [component].tsx
└── index.ts
```

## State Management

### Local State

Use React hooks for component-local state:

```typescript
const [isOpen, setIsOpen] = useState(false);
```

### Shared State

For state shared across components, use custom hooks with context:

```typescript
// hooks/useTheme.ts
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const resolvedTheme = useResolvedTheme(theme);
  return { theme, setTheme, resolvedTheme };
}
```

### Server State

For data fetching, use Next.js Server Components where possible:

```typescript
// app/features/page.tsx (Server Component)
export default async function FeaturesPage() {
  const features = await getFeatures();
  return <FeatureList features={features} />;
}
```

## Server vs Client Components

### Server Components (Default)

- No `'use client'` directive
- Can be async, fetch data directly
- Cannot use hooks or browser APIs
- Smaller bundle size

### Client Components

- Add `'use client'` at top of file
- Required for: hooks, event handlers, browser APIs
- Keep as small as possible

## File Naming Conventions

| Type       | Convention            | Example                    |
| ---------- | --------------------- | -------------------------- |
| Components | kebab-case            | `theme-toggle.tsx`         |
| Stories    | `.stories.tsx` suffix | `theme-toggle.stories.tsx` |
| Tests      | `.test.tsx` suffix    | `theme-toggle.test.tsx`    |
| Hooks      | `use` prefix          | `useTheme.ts`              |

## Import Conventions

### Path Aliases

```typescript
// Prefer aliases over relative paths
import { Button } from '@/components/ui/button'; // Good
import { Button } from '../../../components/ui/button'; // Avoid
```

### Import Order

1. React/Next.js
2. External libraries
3. Internal aliases (`@/`)
4. Relative imports
5. Types

## Adding New Components

### Add shadcn/ui Component (Tier 0)

```bash
pnpm dlx shadcn@latest add [component-name]
```

### Create Common Component (Tier 1)

1. Create subfolder: `components/common/[name]/`
2. Add component file: `[name].tsx`
3. Add stories: `[name].stories.tsx`
4. Add barrel export: `index.ts`

### Create Layout Component (Tier 2)

Same pattern as common, in `components/layouts/[name]/`.

### Create Feature Component (Tier 3)

1. Create domain subfolder: `components/features/[domain]/`
2. Add component files as needed
3. Add barrel export: `index.ts`

## Mandatory Storybook Stories

**Every web UI component MUST have a colocated `.stories.tsx` file.** This is a non-negotiable requirement for all component work.

### Rules

1. **New components**: Must include a `.stories.tsx` file in the same commit
2. **Modified components**: If behavior or props change, stories must be updated
3. **All tiers apply**: Tier 0 (`ui/`), Tier 1 (`common/`), Tier 2 (`layouts/`), and Tier 3 (`features/`)
4. **Story coverage**: Stories should cover all variants, sizes, and key states (default, hover, disabled, loading)

### Story File Pattern

```
# Tier 0 (ui/) - flat colocated
components/ui/
├── button.tsx
└── button.stories.tsx

# Tier 1-3 - subfolder colocated
components/common/page-header/
├── page-header.tsx
├── page-header.stories.tsx
└── index.ts
```

### Verification

```bash
pnpm dev:storybook     # Verify stories render correctly
pnpm build:storybook   # Verify stories build without errors
```

## Code Quality

### Linting & Formatting

```bash
pnpm lint:web          # Run ESLint
pnpm lint:web:fix      # Fix lint issues
pnpm typecheck:web     # TypeScript type checking
```

### Pre-commit Hooks

lint-staged automatically runs on commit:

- ESLint with `--fix` on `.ts`, `.tsx` files
- Prettier on all staged files
- TypeScript type checking
