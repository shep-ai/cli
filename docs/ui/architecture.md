# UI Architecture

Component architecture patterns and conventions for the Shep AI web interface.

## Component Organization

### Directory Structure

```
components/
├── ui/                    # Primitive/base components (shadcn/ui)
│   ├── button.tsx
│   ├── button.stories.tsx
│   ├── card.tsx
│   ├── card.stories.tsx
│   └── index.ts           # Barrel export
└── features/              # Feature/domain components
    ├── index.ts           # Barrel export
    └── [feature-name]/    # Each feature in subfolder
        ├── index.ts
        ├── [component].tsx
        └── [component].stories.tsx
```

### Component Categories

| Category     | Location               | Purpose                                     | Examples                           |
| ------------ | ---------------------- | ------------------------------------------- | ---------------------------------- |
| **UI**       | `components/ui/`       | Reusable primitives, no business logic      | Button, Card, Dialog, Input        |
| **Features** | `components/features/` | Domain-specific, may contain business logic | ThemeToggle, FeatureCard, TaskList |
| **Layout**   | `components/layout/`   | Page structure components                   | Header, Sidebar, Footer            |
| **Shared**   | `components/shared/`   | Cross-cutting concerns                      | ErrorBoundary, LoadingSpinner      |

## Patterns

### Feature Component Subfolder Pattern

Every feature component lives in its own subfolder with colocated files:

```
components/features/theme-toggle/
├── index.ts                    # Re-export for clean imports
├── theme-toggle.tsx            # Main component
├── theme-toggle.stories.tsx    # Storybook stories
├── theme-toggle.test.tsx       # Unit tests (optional)
└── use-theme-toggle.ts         # Hook if needed (optional)
```

**Why subfolders?**

- Colocated stories and tests
- Easy to add related files (hooks, types, sub-components)
- Clean imports via barrel exports
- Clear ownership and boundaries

### Barrel Exports

Use `index.ts` files for clean imports:

```typescript
// components/features/index.ts
export { ThemeToggle } from './theme-toggle';
export { FeatureCard } from './feature-card';

// Usage
import { ThemeToggle, FeatureCard } from '@/components/features';
```

### UI Components (shadcn/ui)

UI primitives follow shadcn/ui conventions:

```typescript
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-background',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
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

## File Naming Conventions

| Type       | Convention            | Example                    |
| ---------- | --------------------- | -------------------------- |
| Components | kebab-case            | `theme-toggle.tsx`         |
| Stories    | `.stories.tsx` suffix | `theme-toggle.stories.tsx` |
| Tests      | `.test.tsx` suffix    | `theme-toggle.test.tsx`    |
| Hooks      | `use` prefix          | `useTheme.ts`              |
| Types      | PascalCase            | `theme.ts` exports `Theme` |

## Import Conventions

### Path Aliases

```typescript
// Prefer aliases over relative paths
import { Button } from '@/components/ui'; // Good
import { Button } from '../../../components/ui'; // Avoid
```

### Import Order

1. React/Next.js
2. External libraries
3. Internal aliases (`@/`)
4. Relative imports
5. Types

```typescript
import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

import type { Theme } from '@/types/theme';
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

```typescript
// Prefer: Small client component wrapping server content
'use client';
export function InteractiveButton({ children }) {
  const [clicked, setClicked] = useState(false);
  return <button onClick={() => setClicked(true)}>{children}</button>;
}
```

## Adding New Components

### UI Component (shadcn/ui)

```bash
pnpm dlx shadcn@latest add [component-name]
```

### Feature Component

1. Create subfolder: `components/features/[name]/`
2. Add component file: `[name].tsx`
3. Add stories: `[name].stories.tsx`
4. Add barrel export: `index.ts`
5. Export from features index: `components/features/index.ts`

```bash
# Example structure
mkdir -p src/presentation/web/components/features/my-feature
touch src/presentation/web/components/features/my-feature/{index.ts,my-feature.tsx,my-feature.stories.tsx}
```

## Code Quality

### Linting & Formatting

The web package uses the monorepo's shared tooling:

```bash
# From root (recommended)
pnpm lint:web          # Run ESLint
pnpm lint:web:fix      # Fix lint issues
pnpm typecheck:web     # TypeScript type checking

# Or from web package directory
cd src/presentation/web
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm format
```

### Configuration

| Tool       | Config Location                      | Notes                                                    |
| ---------- | ------------------------------------ | -------------------------------------------------------- |
| ESLint     | `eslint.config.mjs` (root)           | Has web-specific rules for React/Next.js                 |
| Prettier   | `.prettierrc` (root)                 | Includes `prettier-plugin-tailwindcss` for class sorting |
| TypeScript | `src/presentation/web/tsconfig.json` | Web-specific config                                      |

### Pre-commit Hooks

lint-staged automatically runs on commit:

- ESLint with `--fix` on `.ts`, `.tsx` files
- Prettier on all staged files
- TypeScript type checking

### Rules Applied to Web Package

The ESLint config (`eslint.config.mjs`) applies these rules to `src/presentation/web/**/*`:

**React Rules:**

- `react/jsx-key`: error
- `react/jsx-no-target-blank`: error
- `react/self-closing-comp`: warn

**React Hooks:**

- `react-hooks/rules-of-hooks`: error
- `react-hooks/exhaustive-deps`: warn

**Next.js:**

- `@next/next/no-html-link-for-pages`: error
- `@next/next/no-img-element`: warn
- `@next/next/no-sync-scripts`: error

```

```
