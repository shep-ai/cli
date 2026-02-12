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
│   ├── index.ts                  # Tier-level barrel (re-exports all common components)
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
│   ├── index.ts                  # Tier-level barrel
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
    ├── index.ts                  # Tier-level barrel
    ├── version/
    │   └── version-page-client.tsx
    └── settings/
        └── .gitkeep
```

## Export Pattern

Each component directory uses a per-component `index.ts` barrel export. Additionally, each tier has a tier-level barrel file that re-exports all components in that tier.

```typescript
// Per-component barrel (e.g., common/page-header/index.ts)
export { PageHeader } from './page-header';
export type { PageHeaderProps } from './page-header';

// Tier-level barrel (e.g., common/index.ts)
export { PageHeader } from './page-header';
export { ThemeToggle } from './theme-toggle';

// Import from the component directory (preferred)
import { PageHeader } from '@/components/common/page-header';

// Or import from the tier-level barrel
import { PageHeader } from '@/components/common';
```

When adding a new component to Tier 1-3, update both the component `index.ts` and the tier-level barrel.

## Storybook Categories

Stories are organized to mirror the tier structure:

| Storybook Title Prefix | Component Tier | Description                         |
| ---------------------- | -------------- | ----------------------------------- |
| `Primitives/`          | `ui/`          | shadcn/ui base components           |
| `Composed/`            | `common/`      | Shared composed components          |
| `Layout/`              | `layouts/`     | Page shells and structural wrappers |
| `Features/`            | `features/`    | Domain-specific components          |

## Component Template

Standard pattern for all Tier 1-3 components:

```typescript
'use client'; // Only if the component uses hooks, event handlers, or browser APIs

import { cn } from '@/lib/utils';

export interface MyComponentProps {
  /** Brief prop description. */
  label: string;
  className?: string;
}

export function MyComponent({ label, className }: MyComponentProps) {
  return (
    <div
      data-testid="my-component"
      className={cn('base-classes', className)}
    >
      {label}
    </div>
  );
}
```

### Component Rules

1. **Named exports only** — no default exports for components.
2. **`'use client'`** — add only when the component uses hooks, event handlers, or browser APIs. Omit for pure render components.
3. **`className` prop** — accept and merge via `cn()` for composability.
4. **Props interface** — always export the interface alongside the component.
5. **`data-testid`** — always add on the root element (see convention below).

## data-testid Convention

Every component MUST include `data-testid` on its root element for test targeting.

### Naming scheme: `kebab-case`, scoped to the component

| Component               | data-testid               |
| ----------------------- | ------------------------- |
| `FeatureListItem`       | `feature-list-item`       |
| `FeatureStatusGroup`    | `feature-status-group`    |
| `SidebarCollapseToggle` | `sidebar-collapse-toggle` |
| `PageHeader`            | `page-header`             |

### Sub-elements: append a suffix

```typescript
<div data-testid="feature-list-item">
  <span data-testid="feature-list-item-label">{name}</span>
  <span data-testid="feature-list-item-meta">{duration}</span>
</div>
```

### When to add data-testid

- Root element of every component: **always**
- Sub-elements: only when tests need to target them specifically (labels, meta, actions)
- Primitives in `ui/`: use `data-slot` instead (shadcn convention)

### In tests, prefer data-testid queries

```typescript
screen.getByTestId('feature-list-item');
screen.getByTestId('feature-list-item-meta');
```

Fall back to role/text queries when `data-testid` is not set:

```typescript
screen.getByRole('button', { name: /submit/i });
screen.getByText('Auth Module');
```

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

### Story Template

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './my-component';

// IMPORTANT: Use explicit type annotation, NOT `satisfies Meta<>`
const meta: Meta<typeof MyComponent> = {
  title: 'Composed/MyComponent', // See title prefixes in Storybook Categories
  component: MyComponent,
  parameters: {
    layout: 'padded', // 'centered' | 'padded' | 'fullscreen'
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Example',
  },
};
```

### Args and Controls

Storybook controls only appear when stories define `args`. **Never use hardcoded render-only stories** — always define `args` so the Controls panel works.

**Standard components (flat props):** Use `component` in meta and `args` in stories. Controls are auto-generated.

```typescript
const meta: Meta<typeof MyComponent> = {
  component: MyComponent,
  args: {
    label: 'Default label',
    variant: 'primary',
  },
};

export const Default: Story = {
  args: {
    label: 'Example',
  },
};
```

**Wrapped/nested-data components (e.g. React Flow nodes):** When a component receives data through a nested object (like `{ data }`) or requires wrapper context, use the **existing data interface** as the args type. Do NOT create a duplicate args interface.

```typescript
import type { FeatureNodeData } from './feature-node-state-config';

const meta: Meta<FeatureNodeData> = {
  title: 'Composed/FeatureNode',
  args: { name: 'Auth Module', state: 'running', progress: 45, featureId: '#f1', lifecycle: 'requirements' },
};

type Story = StoryObj<FeatureNodeData>;

export const Default: Story = {
  render: (args) => <FeatureNode id="n1" data={args} type="featureNode" />,
};
```

Only add `argTypes` when you need to **override** defaults (e.g. `select` dropdown instead of free text, `range` slider, or `{ table: { disable: true } }` to hide a field).

**Gallery/showcase stories** (AllStates, AllLifecycles) may use hardcoded render without args — controls are not useful when showing all variants at once. But the **Default** story must always have args.

### Decorators for Context-Dependent Components

If the component requires a React context (e.g. `SidebarProvider`), wrap it:

```typescript
const meta: Meta<typeof SidebarNavItem> = {
  // ...
  decorators: [
    (Story) => (
      <SidebarProvider>
        <SidebarMenu>
          <Story />
        </SidebarMenu>
      </SidebarProvider>
    ),
  ],
};
```

Story-level decorator overrides (e.g. for alternate states):

```typescript
export const Collapsed: Story = {
  args: { /* ... */ },
  decorators: [
    (Story) => (
      <SidebarProvider defaultOpen={false}>
        <Story />
      </SidebarProvider>
    ),
  ],
};
```

### Layout Parameter Guidelines

| Layout       | When to use                                         |
| ------------ | --------------------------------------------------- |
| `centered`   | Small, standalone primitives (Button, Badge, Input) |
| `padded`     | Medium composed components (ListItem, Card, Header) |
| `fullscreen` | Full-width layouts (Sidebar, Dashboard, Page)       |

### Story Coverage Requirements

Stories must cover:

- **Default state** — component with typical props
- **All meaningful variants** — each status, size, or visual variant
- **Edge cases** — empty content, long text, missing optional props
- **Interactive states** — with click handlers (use `() => alert('Clicked!')` or `fn()` from `@storybook/test`)

### Verification

```bash
pnpm dev:storybook     # Verify stories render correctly
pnpm build:storybook   # Verify stories build without errors
```

## Unit Test Patterns

### File Location

Mirror the component tier structure under `tests/unit/presentation/web/`:

```
tests/unit/presentation/web/
  button.test.tsx                           # ui/ tier
  common/feature-list-item.test.tsx         # common/ tier
  layouts/app-sidebar.test.tsx              # layouts/ tier
  features/version-page-client.test.tsx     # features/ tier
```

### Test Template

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '@/components/common/my-component';

describe('MyComponent', () => {
  it('renders label text', () => {
    render(<MyComponent label="Hello" />);
    expect(screen.getByTestId('my-component')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('fires onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<MyComponent label="Click me" onClick={handleClick} />);
    await user.click(screen.getByTestId('my-component'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('applies custom className', () => {
    render(<MyComponent label="Styled" className="custom-class" />);
    expect(screen.getByTestId('my-component')).toHaveClass('custom-class');
  });
});
```

### Context-Dependent Component Helper

```typescript
import { SidebarProvider } from '@/components/ui/sidebar';

function renderWithSidebar(ui: React.ReactElement) {
  return render(<SidebarProvider>{ui}</SidebarProvider>);
}
```

### Timer/Interval Testing

```typescript
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('updates after 1 second', () => {
  vi.setSystemTime(Date.now());
  render(<ElapsedTime startedAt={Date.now()} />);
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText('00:01')).toBeInTheDocument();
});
```

## Styling Patterns

### Tailwind + cn() for Conditional Classes

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'flex items-center gap-2 rounded-md px-2',
  isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
  className
)} />
```

### CVA for Variant-Driven Components

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const myVariants = cva('base-classes', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      outline: 'border bg-background',
    },
    size: {
      default: 'h-9 px-4',
      sm: 'h-7 px-3 text-xs',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});
```

### Design Tokens — Use Semantic Color Names

```
bg-background, text-foreground           # Page-level
bg-primary, text-primary-foreground      # Brand actions
bg-muted, text-muted-foreground          # De-emphasized
bg-sidebar-accent                        # Sidebar hover/active
text-destructive                         # Errors
border, bg-input                         # Form elements
```

### Numeric Display: Always Use `tabular-nums`

```typescript
<span className="tabular-nums">05:30</span>
```

### Icons: lucide-react

```typescript
import { Home, CircleAlert, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// As prop type
interface Props {
  icon: LucideIcon;
}

// Semantic icon coloring
<CircleAlert className="text-amber-500" />
<Loader2 className="text-blue-500 animate-spin" />
<CircleCheck className="text-emerald-500" />
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
5. Add to tier-level barrel: `components/common/index.ts`

### Create Layout Component (Tier 2)

Same pattern as common, in `components/layouts/[name]/`. Add to `components/layouts/index.ts`.

### Create Feature Component (Tier 3)

1. Create domain subfolder: `components/features/[domain]/`
2. Add component files as needed
3. Add barrel export: `index.ts`
4. Add to tier-level barrel: `components/features/index.ts`

## Component Checklist

Before considering a component done, verify:

- [ ] Component file created with proper structure
- [ ] `data-testid` on root element (and sub-elements where needed)
- [ ] Props interface exported
- [ ] `className` prop accepted and merged via `cn()`
- [ ] Barrel export (`index.ts`) created
- [ ] Tier-level barrel updated (`common/index.ts`, etc.)
- [ ] Storybook stories colocated with all variants covered
- [ ] Default story has `args` defined (controls must work)
- [ ] Stories use explicit `Meta<typeof X>` type annotation (not `satisfies`)
- [ ] Story title uses correct tier prefix (`Primitives/`, `Composed/`, `Layout/`, `Features/`)
- [ ] Unit test created in `tests/unit/presentation/web/[tier]/`
- [ ] `pnpm typecheck:web` passes
- [ ] `pnpm test:single tests/unit/presentation/web` passes
- [ ] `pnpm build:storybook` passes

## Common Mistakes

- **`satisfies Meta<>`** — causes TS2742 error. Use explicit type annotation instead.
- **Missing `'use client'`** — required when using `useState`, `useEffect`, event handlers.
- **Forgetting barrel exports** — both component-level `index.ts` and tier-level barrel.
- **Inline meta in stories** — no default exports, always `export const Default: Story`.
- **Missing `data-testid`** — every component root must have one.
- **Magic numbers in styles** — use design tokens and Tailwind spacing scale.
- **Uppercase in commit subjects** — commitlint rejects it; use all-lowercase.
- **Render-only stories without `args`** — controls panel will be empty. Always define `args`. For nested-data components, reuse the component's data interface as args type (don't create a duplicate), add `argTypes` for control customization, and pass `args` directly as data.

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
