# Web Component Library

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
│   └── features/           # Feature-specific components
│       └── theme-toggle.tsx
├── hooks/
│   └── useTheme.ts         # Theme state management
├── lib/
│   └── utils.ts            # Utility functions (cn)
├── types/
│   └── theme.ts            # Theme type definitions
└── stories/                # Storybook stories
    ├── ui/                 # UI component stories
    └── design-tokens.mdx   # Design system documentation
```

## Design Tokens

Design tokens are defined in `globals.css` using Tailwind CSS v4's `@theme` directive:

```css
@theme {
  /* Colors */
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.141 0.005 285.82);
  --color-primary: oklch(0.21 0.006 285.88);

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
}
```

Dark mode tokens are defined in the `.dark` class selector.

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
import { ThemeToggle } from '@/components/features/theme-toggle';

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
pnpm storybook
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
pnpm web:build

# Build Storybook
pnpm storybook:build
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
