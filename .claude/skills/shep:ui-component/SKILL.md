---
name: shep:ui-component
description: Use when creating, modifying, or reviewing web UI components. Triggers include "new component", "add component", "create UI", "build a widget", "update component", working with files in src/presentation/web/components/, or when the user asks to build any React component for the web UI.
---

# Web UI Component Development

Build React components following the four-tier architecture, with mandatory Storybook stories, `data-testid` attributes, and unit tests.

## Four-Tier Hierarchy

```
Tier 0: ui/        -> shadcn/ui primitives (managed by CLI, rarely hand-edited)
Tier 1: common/    -> Reusable composed components (combine ui/ primitives)
Tier 2: layouts/   -> Page shells, structural wrappers (use ui/ + common/)
Tier 3: features/  -> Domain-specific views bound to routes (use all tiers)
```

**Import rule:** A tier may only import from lower tiers, never upward.

```
features/ -> layouts/, common/, ui/
layouts/  -> common/, ui/
common/   -> ui/
ui/       -> external packages only
```

## File Structure

### Tier 0 (ui/) — flat files, no subfolder

```
components/ui/
  button.tsx
  button.stories.tsx
```

### Tier 1-3 — subfolder per component

```
components/common/feature-list-item/
  feature-list-item.tsx          # Implementation
  feature-list-item.stories.tsx  # Storybook stories (MANDATORY)
  index.ts                       # Barrel export
```

**Barrel export template:**

```typescript
export { FeatureListItem } from './feature-list-item';
export type { FeatureListItemProps } from './feature-list-item';
```

After creating any Tier 1-3 component, add it to the tier-level barrel:

- `components/common/index.ts`
- `components/layouts/index.ts`
- `components/features/index.ts`

## Component Template

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

### Rules

1. **Named exports only** — no default exports for components.
2. **`'use client'`** — add only when the component uses hooks, event handlers, or browser APIs. Omit for pure render components.
3. **`className` prop** — accept and merge via `cn()` for composability.
4. **Props interface** — always export the interface alongside the component.

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

## Storybook Stories (MANDATORY)

Every component MUST have a colocated `.stories.tsx` file. This is non-negotiable.

### Story template

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './my-component';

// IMPORTANT: Use explicit type annotation, NOT `satisfies Meta<>`
const meta: Meta<typeof MyComponent> = {
  title: 'Composed/MyComponent', // See title prefixes below
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

### Title prefixes by tier

| Tier        | Prefix        | Example                    |
| ----------- | ------------- | -------------------------- |
| `ui/`       | `Primitives/` | `Primitives/Button`        |
| `common/`   | `Composed/`   | `Composed/FeatureListItem` |
| `layouts/`  | `Layout/`     | `Layout/AppSidebar`        |
| `features/` | `Features/`   | `Features/VersionPage`     |

### Decorators for context-dependent components

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

### Args and Controls (CRITICAL)

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

**Wrapped/nested-data components (e.g. React Flow nodes):** When a component receives data through a nested object (like `{ data }`) or requires wrapper context that prevents using `component` directly, use the **existing data interface** as the args type. Storybook auto-infers controls from the `args` values — no `argTypes` needed. Do NOT create a duplicate args interface.

```typescript
import type { FeatureNodeData } from './feature-node-state-config';

// 1. Use the component's own data interface — controls auto-inferred from args
const meta: Meta<FeatureNodeData> = {
  title: 'Composed/FeatureNode',
  args: { name: 'Auth Module', state: 'running', progress: 45, featureId: '#f1', lifecycle: 'requirements' },
};

type Story = StoryObj<FeatureNodeData>;

// 2. Pass args directly as data — no mapping function needed
export const Default: Story = {
  render: (args) => <FeatureNode id="n1" data={args} type="featureNode" />,
};

// 3. Stories needing callbacks pass them via story-level args
export const WithAction: Story = {
  args: { onAction: () => undefined, onSettings: () => undefined },
  render: (args) => <FeatureNode id="n1" data={args} type="featureNode" />,
};
```

Only add `argTypes` when you need to **override** defaults (e.g. `select` dropdown instead of free text, `range` slider instead of number input, or `{ table: { disable: true } }` to hide a field).

**Gallery/showcase stories** (AllStates, AllLifecycles) may use hardcoded render without args — controls are not useful when showing all variants at once. But the **Default** story must always have args.

### Story coverage requirements

Stories must cover:

- **Default state** — component with typical props
- **All meaningful variants** — each status, size, or visual variant
- **Edge cases** — empty content, long text, missing optional props
- **Interactive states** — with click handlers (use `() => alert('Clicked!')` or `fn()` from `@storybook/test`)

### Layout parameter guidelines

| Layout       | When to use                                         |
| ------------ | --------------------------------------------------- |
| `centered`   | Small, standalone primitives (Button, Badge, Input) |
| `padded`     | Medium composed components (ListItem, Card, Header) |
| `fullscreen` | Full-width layouts (Sidebar, Dashboard, Page)       |

## Unit Tests

### File location

Mirror the component tier structure under `tests/unit/presentation/web/`:

```
tests/unit/presentation/web/
  button.test.tsx                           # ui/ tier
  common/feature-list-item.test.tsx         # common/ tier
  layouts/app-sidebar.test.tsx              # layouts/ tier
  features/version-page-client.test.tsx     # features/ tier
```

### Test template

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

### Context-dependent component helper

```typescript
import { SidebarProvider } from '@/components/ui/sidebar';

function renderWithSidebar(ui: React.ReactElement) {
  return render(<SidebarProvider>{ui}</SidebarProvider>);
}
```

### Timer/interval testing

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

### Tailwind + cn() for conditional classes

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'flex items-center gap-2 rounded-md px-2',
  isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
  className
)} />
```

### CVA for variant-driven components

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

### Design tokens — use semantic color names

```
bg-background, text-foreground           # Page-level
bg-primary, text-primary-foreground      # Brand actions
bg-muted, text-muted-foreground          # De-emphasized
bg-sidebar-accent                        # Sidebar hover/active
text-destructive                         # Errors
border, bg-input                         # Form elements
```

### Numeric display: always use `tabular-nums`

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

## Checklist

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
