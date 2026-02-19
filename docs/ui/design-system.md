# Design System

Design tokens, theming, and visual guidelines for the Shep AI web interface.

## Overview

The design system uses **Tailwind CSS v4** with CSS-first configuration. Design tokens are defined in `globals.css` using the `@theme` directive.

## Design Tokens

### Colors

All colors use semantic naming for easy theming:

```css
@theme {
  /* Backgrounds & Foregrounds */
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;

  /* Primary - Main actions, links */
  --color-primary: #3b82f6;
  --color-primary-foreground: #ffffff;

  /* Secondary - Less prominent actions */
  --color-secondary: #f1f5f9;
  --color-secondary-foreground: #0f172a;

  /* Muted - Subtle text, disabled states */
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;

  /* Accent - Highlights, focus states */
  --color-accent: #f1f5f9;
  --color-accent-foreground: #0f172a;

  /* Destructive - Errors, dangerous actions */
  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;

  /* UI Elements */
  --color-border: #e2e8f0;
  --color-input: #e2e8f0;
  --color-ring: #3b82f6;

  /* Cards & Popovers */
  --color-card: #ffffff;
  --color-card-foreground: #0a0a0a;
  --color-popover: #ffffff;
  --color-popover-foreground: #0a0a0a;
}
```

### Dark Mode

Dark mode overrides are defined in the `.dark` class:

```css
.dark {
  --color-background: #0a0a0a;
  --color-foreground: #fafafa;
  --color-primary: #3b82f6;
  --color-secondary: #1e293b;
  --color-muted: #1e293b;
  --color-muted-foreground: #94a3b8;
  --color-accent: #1e293b;
  --color-destructive: #dc2626;
  --color-border: #1e293b;
  --color-input: #1e293b;
  --color-card: #0a0a0a;
  --color-popover: #0a0a0a;
}
```

### Typography

```css
@theme {
  --font-sans: ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji',
    'Segoe UI Symbol', 'Noto Color Emoji';
  --font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono',
    monospace;
}
```

### Border Radius

```css
@theme {
  --radius-sm: 0.25rem; /* 4px */
  --radius-md: 0.375rem; /* 6px */
  --radius-lg: 0.5rem; /* 8px */
  --radius-xl: 0.75rem; /* 12px */
  --radius-2xl: 1rem; /* 16px */
  --radius-full: 9999px; /* Pill shape */
}
```

### Shadows

```css
@theme {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}
```

## Theme System

### useTheme Hook

```typescript
import { useTheme } from '@/hooks/useTheme';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // theme: 'light' | 'dark' | 'system'
  // resolvedTheme: 'light' | 'dark' (actual applied theme)
  // setTheme: (theme) => void
}
```

### Theme Values

| Value      | Behavior              |
| ---------- | --------------------- |
| `'light'`  | Always use light mode |
| `'dark'`   | Always use dark mode  |
| `'system'` | Follow OS preference  |

### Persistence

Theme preference is stored in `localStorage` under `shep-theme` key.

### ThemeToggle Component

```typescript
import { ThemeToggle } from '@/components/common/theme-toggle';

// Renders a button that toggles between light/dark modes
<ThemeToggle />
```

## Spacing

**Note:** Custom spacing tokens are intentionally omitted to avoid conflicts with Tailwind v4's built-in utilities.

Use Tailwind's standard spacing scale:

```tsx
// Padding/Margin
<div className="p-4 m-2 mt-6">

// Gap
<div className="flex gap-4">

// Width/Height
<div className="w-full h-64 max-w-md">
```

## Usage in Components

### Using Design Tokens

Tokens are automatically available as Tailwind utilities:

```tsx
// Colors
<div className="bg-background text-foreground">
<button className="bg-primary text-primary-foreground">
<span className="text-muted-foreground">

// Border radius
<div className="rounded-md">
<button className="rounded-lg">

// Shadows
<div className="shadow-sm">
<div className="shadow-lg">
```

### The `cn()` Utility

Use `cn()` from `@/lib/utils` for conditional classes:

```typescript
import { cn } from '@/lib/utils';

function Button({ variant, className }) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-md',
        variant === 'primary' && 'bg-primary text-primary-foreground',
        variant === 'ghost' && 'bg-transparent hover:bg-accent',
        className
      )}
    />
  );
}
```

## Storybook

Design tokens are documented in Storybook:

```bash
pnpm dev:storybook
# Navigate to "Design Tokens" in sidebar
```

The documentation is at `src/presentation/web/docs/` (Colors.mdx, Typography.mdx, GettingStarted.mdx).

## Color Palette Reference

### Light Mode

| Token              | Hex       | Usage                  |
| ------------------ | --------- | ---------------------- |
| `background`       | `#ffffff` | Page backgrounds       |
| `foreground`       | `#0a0a0a` | Primary text           |
| `primary`          | `#3b82f6` | Primary actions, links |
| `secondary`        | `#f1f5f9` | Secondary buttons      |
| `muted`            | `#f1f5f9` | Disabled states        |
| `muted-foreground` | `#64748b` | Secondary text         |
| `destructive`      | `#ef4444` | Errors, delete actions |
| `border`           | `#e2e8f0` | Borders, dividers      |

### Dark Mode

| Token              | Hex       | Usage                  |
| ------------------ | --------- | ---------------------- |
| `background`       | `#0a0a0a` | Page backgrounds       |
| `foreground`       | `#fafafa` | Primary text           |
| `primary`          | `#3b82f6` | Primary actions (same) |
| `secondary`        | `#1e293b` | Secondary buttons      |
| `muted`            | `#1e293b` | Disabled states        |
| `muted-foreground` | `#94a3b8` | Secondary text         |
| `destructive`      | `#dc2626` | Errors, delete actions |
| `border`           | `#1e293b` | Borders, dividers      |
