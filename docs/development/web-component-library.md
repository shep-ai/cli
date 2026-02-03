# Web Component Library

> **See also:** [docs/ui/](../ui/) for comprehensive UI documentation including [architecture](../ui/architecture.md), [design system](../ui/design-system.md), and [component catalog](../ui/components.md).

This document describes the web UI component library for Shep AI CLI, built with Next.js 16, React 19, Tailwind CSS v4, and shadcn/ui.

## Overview

The web component library provides a consistent design system for the Shep AI web interface. It uses:

- **Next.js 16** with App Router
- **React 19** for the UI framework
- **Tailwind CSS v4** with CSS-first configuration and design tokens
- **shadcn/ui** components with Radix UI primitives
- **Storybook** for component documentation and development
- **Vitest + React Testing Library** for unit tests
- **Playwright** for E2E tests

## Directory Structure

```
src/presentation/web/
├── app/                    # Next.js App Router pages
│   ├── globals.css         # Global styles with design tokens
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/
│   ├── ui/                 # shadcn/ui components
│   │   ├── accordion.tsx
│   │   ├── alert.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── popover.tsx
│   │   ├── select.tsx
│   │   ├── sonner.tsx
│   │   ├── tabs.tsx
│   │   └── index.ts        # Exports all components
│   └── features/           # Feature-specific components (subfolder pattern)
│       ├── index.ts         # Barrel export for all features
│       └── theme-toggle/    # Each feature in its own subfolder
│           ├── index.ts
│           ├── theme-toggle.tsx
│           └── theme-toggle.stories.tsx
├── hooks/
│   └── useTheme.ts         # Theme state management
├── lib/
│   └── utils.ts            # Utility functions (cn)
└── types/
    └── theme.ts            # Theme type definitions
```

**Note:** Stories are colocated with their components (e.g., `button.stories.tsx` next to `button.tsx`). The design tokens documentation is at `components/design-tokens.mdx`.

```
# Story file structure example
components/ui/
├── button.tsx              # Component implementation
├── button.stories.tsx      # Storybook stories (colocated)
├── card.tsx
├── card.stories.tsx
└── ...
```

## Design Tokens

Design tokens are defined in `globals.css` using Tailwind CSS v4's `@theme` directive:

```css
@theme {
  /* Colors - Light Mode */
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;
  --color-primary: #3b82f6;
  --color-primary-foreground: #ffffff;
  --color-secondary: #f1f5f9;
  --color-secondary-foreground: #0f172a;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
  --color-accent: #f1f5f9;
  --color-accent-foreground: #0f172a;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;
  --color-border: #e2e8f0;
  --color-input: #e2e8f0;
  --color-ring: #3b82f6;
  --color-card: #ffffff;
  --color-card-foreground: #0a0a0a;
  --color-popover: #ffffff;
  --color-popover-foreground: #0a0a0a;

  /* Typography */
  --font-sans: ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, monospace;

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

### Dark Mode

Dark mode tokens are defined in the `.dark` class selector, which overrides the light mode values:

```css
.dark {
  --color-background: #0a0a0a;
  --color-foreground: #fafafa;
  --color-secondary: #1e293b;
  --color-muted: #1e293b;
  --color-border: #1e293b;
  /* ... other dark mode overrides */
}
```

**Note:** Spacing tokens are intentionally omitted to avoid conflicts with Tailwind v4's built-in sizing utilities. Use Tailwind's standard spacing scale (`p-4`, `m-6`, `gap-2`, etc.).

## Components

### Available Components

| Component     | Description                            |
| ------------- | -------------------------------------- |
| `Accordion`   | Collapsible content sections           |
| `Alert`       | Feedback messages with variants        |
| `Badge`       | Status indicators and labels           |
| `Button`      | Action buttons with variants and sizes |
| `Card`        | Container for grouped content          |
| `Dialog`      | Modal dialogs                          |
| `Input`       | Text input fields                      |
| `Label`       | Form field labels                      |
| `Popover`     | Floating content panels                |
| `Select`      | Dropdown selection                     |
| `Sonner`      | Toast notifications                    |
| `Tabs`        | Tabbed content navigation              |
| `ThemeToggle` | Dark/light mode toggle                 |

### Usage Example

```tsx
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { ThemeToggle } from '@/components/features';

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
        <ThemeToggle />
      </CardHeader>
      <CardContent>
        <Button variant="default">Get Started</Button>
      </CardContent>
    </Card>
  );
}
```

### Adding New Components

Use the shadcn/ui CLI to add new components:

```bash
pnpm dlx shadcn@latest add [component-name]
```

Components are configured via `components.json` at the project root.

## Theme System

The theme system supports light, dark, and system-preference modes:

```tsx
import { useTheme } from '@/hooks/useTheme';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return <button onClick={() => setTheme('dark')}>Current: {resolvedTheme}</button>;
}
```

Theme preference is persisted to `localStorage` under the key `shep-theme`.

## Development

### Running Storybook

```bash
pnpm dev:storybook
```

Opens Storybook at http://localhost:6006 with all component stories and design token documentation.

### Running Tests

```bash
# Unit tests (React components)
pnpm test:unit

# E2E tests (Web UI with Playwright)
pnpm test:e2e:web

# Watch mode for TDD
pnpm test:watch
```

### Building for Production

```bash
# Build Next.js app
pnpm build:web

# Build Storybook
pnpm build:storybook
```

## Testing Strategy

### Unit Tests

Located in `tests/unit/presentation/web/`, unit tests verify:

- Component rendering with different props/variants
- Hook behavior and state management
- Accessibility attributes
- User interactions

Example test:

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });
});
```

### E2E Tests

Located in `tests/e2e/web/`, E2E tests verify:

- User flows across pages
- Theme persistence
- Component interactions in context

## Path Aliases

The following path aliases are configured:

| Alias          | Path                              |
| -------------- | --------------------------------- |
| `@/components` | `src/presentation/web/components` |
| `@/lib`        | `src/presentation/web/lib`        |
| `@/hooks`      | `src/presentation/web/hooks`      |
| `@/types`      | `src/presentation/web/types`      |

These are configured in:

- `tsconfig.json` (TypeScript)
- `vitest.config.ts` (Tests)
- `.storybook/main.ts` (Storybook)

## Configuration Files

| File                   | Purpose                      |
| ---------------------- | ---------------------------- |
| `components.json`      | shadcn/ui configuration      |
| `postcss.config.mjs`   | PostCSS with Tailwind v4     |
| `next.config.ts`       | Next.js configuration        |
| `.storybook/main.ts`   | Storybook configuration      |
| `playwright.config.ts` | Playwright E2E configuration |
