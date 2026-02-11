# Component Catalog

Reference for all available UI components in the Shep AI web interface.

## Tier 0: UI Primitives (`components/ui/`)

shadcn/ui primitives -- 12 components managed by the shadcn CLI. Each has a colocated `.stories.tsx` file.

| Component | File            | Description                                                                   |
| --------- | --------------- | ----------------------------------------------------------------------------- |
| Accordion | `accordion.tsx` | Collapsible content sections                                                  |
| Alert     | `alert.tsx`     | Feedback messages with semantic variants (`default`, `destructive`)           |
| Badge     | `badge.tsx`     | Status indicators (`default`, `secondary`, `outline`, `destructive`)          |
| Button    | `button.tsx`    | Action buttons (`default`, `destructive`, `outline`, `ghost`, `link` + sizes) |
| Card      | `card.tsx`      | Container with header, content, footer sections                               |
| Dialog    | `dialog.tsx`    | Modal dialogs for focused interactions                                        |
| Input     | `input.tsx`     | Text input fields                                                             |
| Label     | `label.tsx`     | Accessible form field labels                                                  |
| Popover   | `popover.tsx`   | Floating content panels                                                       |
| Select    | `select.tsx`    | Dropdown selection                                                            |
| Sonner    | `sonner.tsx`    | Toast notifications (via `sonner` library)                                    |
| Tabs      | `tabs.tsx`      | Tabbed content navigation                                                     |

### Usage

```typescript
// Import directly from the component file
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
```

### Adding New Primitives

```bash
pnpm dlx shadcn@latest add [component-name]
```

## Tier 1: Common Components (`components/common/`)

Cross-feature composed components built from ui/ primitives. Each lives in its own subfolder with colocated stories and `index.ts` barrel export.

### ThemeToggle

Toggle between light, dark, and system theme modes.

- **Path**: `common/theme-toggle/`
- **Import**: `import { ThemeToggle } from '@/components/common/theme-toggle'`
- **Uses**: `useTheme` hook, Button (ghost variant), Lucide icons (Sun/Moon)
- **Behavior**: Cycles through light/dark/system on click

### PageHeader

Consistent page header with title, optional description, and action slot.

- **Path**: `common/page-header/`
- **Import**: `import { PageHeader } from '@/components/common/page-header'`
- **Props**: `title` (required), `description?`, `actions?` (ReactNode)
- **Uses**: Semantic heading hierarchy, responsive layout

### EmptyState

Placeholder for pages or sections with no content.

- **Path**: `common/empty-state/`
- **Import**: `import { EmptyState } from '@/components/common/empty-state'`
- **Props**: `icon?` (Lucide icon), `title` (required), `description?`, `action?` (ReactNode)
- **Uses**: Centered layout, muted styling, optional CTA

### LoadingSkeleton

Content placeholder shown during loading states.

- **Path**: `common/loading-skeleton/`
- **Import**: `import { LoadingSkeleton } from '@/components/common/loading-skeleton'`
- **Props**: `variant` (`text`, `card`, `list`, `page`), `lines?`, `className?`
- **Uses**: Animated pulse, multiple layout variants

## Tier 2: Layout Components (`components/layouts/`)

Page shells and structural wrappers. Each in its own subfolder with stories and barrel export.

### Sidebar

Navigation sidebar with collapsible sections and active state.

- **Path**: `layouts/sidebar/`
- **Import**: `import { Sidebar } from '@/components/layouts/sidebar'`
- **Props**: `items` (navigation items array), `activeItem?`, `collapsed?`
- **Uses**: Button (ghost), Lucide icons, responsive collapse

### Header

Top navigation bar with branding, navigation, and actions.

- **Path**: `layouts/header/`
- **Import**: `import { Header } from '@/components/layouts/header'`
- **Props**: `title?`, `actions?` (ReactNode)
- **Uses**: ThemeToggle, responsive layout

### DashboardLayout

Full-page shell combining sidebar and header with content area.

- **Path**: `layouts/dashboard-layout/`
- **Import**: `import { DashboardLayout } from '@/components/layouts/dashboard-layout'`
- **Props**: `sidebar?` (ReactNode), `header?` (ReactNode), `children` (content)
- **Uses**: CSS Grid layout, responsive breakpoints

### AppShell

Top-level application wrapper integrating DashboardLayout with configured Sidebar and Header.

- **Path**: `layouts/app-shell/`
- **Import**: `import { AppShell } from '@/components/layouts/app-shell'`
- **Props**: `children` (page content)
- **Uses**: DashboardLayout, Sidebar, Header with default navigation config

## Tier 3: Feature Components (`components/features/`)

Domain-specific UI components organized by bounded context.

### version/

- **VersionPageClient** (`version/version-page-client.tsx`) -- Client-side version display page, fetches and renders CLI version information.

### settings/

- Placeholder directory (`.gitkeep`) -- ready for settings-related feature components.

## Storybook

View all components with interactive examples:

```bash
pnpm dev:storybook
```

Opens at http://localhost:6006 with:

- All component variants with interactive controls
- Accessibility testing (a11y addon)
- Responsive viewport testing
- Design system documentation (Colors, Typography, Getting Started)
