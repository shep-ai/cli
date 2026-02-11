## Status

- **Phase:** Implementation
- **Updated:** 2026-02-11

## Current State Analysis (Post 013-ui-arch)

### Existing Web UI Components

| Category             | Count | Details                                                                                    |
| -------------------- | ----- | ------------------------------------------------------------------------------------------ |
| shadcn/ui primitives | 12    | Button, Card, Badge, Input, Label, Dialog, Select, Tabs, Accordion, Alert, Popover, Sonner |
| Common components    | 4     | page-header, empty-state, loading-skeleton, theme-toggle (created by 013)                  |
| Layout components    | 4     | header, sidebar (simple nav), dashboard-layout, app-shell (created by 013)                 |
| Feature components   | 0     | ThemeToggle migrated to common/ by 013                                                     |
| Barrel exports       | 0     | No index.ts barrel exports exist for ui/, common/, or layouts/                             |

**Note:** The existing `layouts/sidebar/` is a simple 40-line nav component (basic `<nav>` with
flex layout). It is NOT a shadcn Sidebar compound component. The new `app-sidebar/` component
in this spec is a completely separate, richer component using the shadcn sidebar primitive.

### Current CSS Variables

The globals.css uses `--color-*` pattern with hex values in a `@theme` block (Tailwind v4).
**Missing:** No `--color-sidebar-*` tokens exist — these must be added for the shadcn sidebar.

### Storybook Configuration (Updated by 013)

- Framework: `@storybook/react-vite`
- Addons: essentials, links, a11y, interactions
- Plugins: `@tailwindcss/vite` (added by 013)
- Theme: Custom ThemeDecorator handling light/dark backgrounds
- Layout: Default `centered` for most stories
- Path aliases: `@/components`, `@/lib`, `@/hooks`, `@/types`
- Design system docs: Colors.mdx, Typography.mdx, GettingStarted.mdx

## Technology Decisions

### 1. Sidebar Primitive Component

**Decision:** shadcn/ui Sidebar compound component (`npx shadcn add sidebar`)

**Key sub-components provided:**

| Component             | Purpose                                |
| --------------------- | -------------------------------------- |
| `SidebarProvider`     | Context provider with state management |
| `Sidebar`             | Main container                         |
| `SidebarHeader`       | Sticky top section                     |
| `SidebarContent`      | Scrollable middle section              |
| `SidebarGroup`        | Section container                      |
| `SidebarGroupLabel`   | Section title                          |
| `SidebarGroupContent` | Section body                           |
| `SidebarMenu`         | Menu list container                    |
| `SidebarMenuItem`     | Individual menu item                   |
| `SidebarMenuButton`   | Clickable button within menu item      |
| `SidebarFooter`       | Sticky bottom section                  |
| `SidebarTrigger`      | Toggle button (collapse/expand)        |
| `useSidebar`          | Hook for programmatic state control    |

**Rejected:** Custom sidebar (reimplements accessibility, state, responsive behavior),
Radix NavigationMenu (not designed for sidebar layout), third-party libraries (extra dependency).

### 2. Sidebar CSS Variables

**Decision:** Add `--color-sidebar-*` tokens to globals.css `@theme` block

Tokens to add (matching existing slate palette):

**Light mode (`@theme` block):**

```css
--color-sidebar: #fafafa;
--color-sidebar-foreground: #0a0a0a;
--color-sidebar-primary: #3b82f6;
--color-sidebar-primary-foreground: #ffffff;
--color-sidebar-accent: #f1f5f9;
--color-sidebar-accent-foreground: #0f172a;
--color-sidebar-border: #e2e8f0;
--color-sidebar-ring: #3b82f6;
```

**Dark mode (`.dark` block):**

```css
--color-sidebar: #0a0a0a;
--color-sidebar-foreground: #fafafa;
--color-sidebar-primary: #3b82f6;
--color-sidebar-primary-foreground: #ffffff;
--color-sidebar-accent: #1e293b;
--color-sidebar-accent-foreground: #f8fafc;
--color-sidebar-border: #1e293b;
--color-sidebar-ring: #3b82f6;
```

### 3. ElapsedTime Timer Implementation

**Decision:** `useEffect` + `setInterval` with 1-second tick

```typescript
// Pseudocode
const [elapsed, setElapsed] = useState(0);

useEffect(() => {
  const id = setInterval(() => {
    setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
  }, 1000);
  return () => clearInterval(id);
}, [startedAt]);

// Format: mm:ss for < 1h, "Xh" for >= 1h
```

Self-corrects drift by recalculating from `Date.now()` on each tick.
No external date library needed.

### 4. Storybook SidebarProvider Decorator

**Decision:** Per-file decorator imported from a shared helper

```typescript
// In story file:
import { SidebarProvider } from '@/components/ui/sidebar';

const meta = {
  decorators: [
    (Story) => (
      <SidebarProvider>
        <div className="flex h-[600px]">
          <Story />
        </div>
      </SidebarProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};
```

### 5. Feature Status Type Design

**Decision:** Sidebar-specific `FeatureStatus` union type

```typescript
type FeatureStatus = 'action-needed' | 'in-progress' | 'done';
```

Three states matching the mockup groups. Mapping from domain types happens at
the data boundary, not in presentation components.

### 6. Storybook Layout for Sidebar Stories

**Decision:** `layout: 'fullscreen'` with fixed-height container

Sidebar needs full-height rendering. Use `parameters: { layout: 'fullscreen' }`
and wrap in `h-[600px]` container for realistic preview.

## Library Analysis

| Library               | Version | Purpose                                             | Action                                     |
| --------------------- | ------- | --------------------------------------------------- | ------------------------------------------ |
| shadcn/ui sidebar     | latest  | Sidebar compound component                          | **Install** (`npx shadcn add sidebar`)     |
| shadcn/ui scroll-area | latest  | Scrollable feature list                             | **Install** (`npx shadcn add scroll-area`) |
| shadcn/ui separator   | latest  | Visual dividers between sections                    | **Install** (`npx shadcn add separator`)   |
| shadcn/ui tooltip     | latest  | Collapsed sidebar tooltips                          | **Install** (`npx shadcn add tooltip`)     |
| Lucide React          | 0.563.0 | Icons (Settings, Brain, Plus, Check, Clock, Loader) | Already installed                          |
| Radix UI              | varies  | Underlying primitives (comes with shadcn)           | Already installed                          |

No new non-shadcn dependencies needed.

## Security Considerations

No security implications. This feature is purely presentational — static sidebar
navigation with mock data. No user input processing, no API calls, no authentication.

## Performance Implications

- **ElapsedTime setInterval**: One interval per in-progress feature. With typical
  sidebar showing 1-5 in-progress items, negligible CPU impact. Intervals are
  cleaned up on unmount.
- **SidebarProvider context**: Single context provider, minimal re-render scope.
  Only sidebar children re-render on state changes (open/close).
- **Scroll-area**: Uses native scrollbar wrapping via Radix ScrollArea. No
  virtualization needed — sidebar feature lists are small (< 50 items).

## Open Questions

All questions resolved.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
