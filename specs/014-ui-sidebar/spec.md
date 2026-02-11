## Problem Statement

The web UI currently has no navigation structure — pages are standalone with no
sidebar, header, or layout shell. As the application grows with features like
Control Center, Memory, and feature management, users need a persistent sidebar
to navigate between sections and monitor feature progress at a glance.

The 013-ui-arch spec established a four-tier component hierarchy
(`ui/` → `common/` → `layouts/` → `features/`) but no layout components exist
yet. The sidebar is the first layout component to be built, following those
architectural conventions.

## Goals

1. **Install shadcn sidebar primitive** and required dependencies (scroll-area, separator, tooltip)
2. **Build isolated composed components** for each sidebar building block
3. **Assemble AppSidebar layout** composing all building blocks
4. **Feature list grouped by status** with live timing information
5. **Storybook coverage** for all new components

## Success Criteria

- [ ] shadcn `sidebar`, `scroll-area`, `separator`, `tooltip` primitives installed in `ui/`
- [ ] `SidebarNavItem` common component with icon + label, active state, Storybook stories
- [ ] `FeatureStatusGroup` common component with status label + count badge, Storybook stories
- [ ] `FeatureListItem` common component with status icon + name + timing, Storybook stories
- [ ] `ElapsedTime` common component with live counting timer, Storybook stories
- [ ] `AppSidebar` layout component assembling all building blocks, Storybook stories
- [ ] Top section: Control Center and Memory navigation items with icons
- [ ] Middle section: "Features" label with feature list grouped by Action Needed / In Progress / Done
- [ ] In Progress features show live elapsed time (counting up in mm:ss)
- [ ] Done features show total duration (e.g., "1h", "2h", "32:39")
- [ ] Action Needed features show indicator icon (e.g., clock/pending icon)
- [ ] Bottom footer: "+ New feature" button
- [ ] All components follow 013-ui-arch tier import rules
- [ ] Storybook builds successfully (`pnpm build:storybook`)
- [ ] Web app builds successfully (`pnpm build:web`)

## Component Architecture

Following the 013-ui-arch four-tier hierarchy:

```
components/
├── ui/                              # Tier 0: shadcn primitives (CLI-managed)
│   ├── sidebar.tsx                  # NEW — shadcn sidebar compound component
│   ├── scroll-area.tsx              # NEW — scrollable container
│   ├── separator.tsx                # NEW — visual divider
│   └── tooltip.tsx                  # NEW — hover tooltips
│
├── common/                          # Tier 1: Composed building blocks
│   ├── sidebar-nav-item/            # Nav item with icon + label + active state
│   │   ├── sidebar-nav-item.tsx
│   │   ├── sidebar-nav-item.stories.tsx
│   │   └── index.ts
│   ├── feature-status-group/        # Status group header (label + count badge)
│   │   ├── feature-status-group.tsx
│   │   ├── feature-status-group.stories.tsx
│   │   └── index.ts
│   ├── feature-list-item/           # Feature row (status icon + name + time)
│   │   ├── feature-list-item.tsx
│   │   ├── feature-list-item.stories.tsx
│   │   └── index.ts
│   └── elapsed-time/                # Live counting timer display
│       ├── elapsed-time.tsx
│       ├── elapsed-time.stories.tsx
│       └── index.ts
│
└── layouts/                         # Tier 2: Layout shells
    └── app-sidebar/                 # Full assembled sidebar
        ├── app-sidebar.tsx
        ├── app-sidebar.stories.tsx
        └── index.ts
```

### Import Rules (from 013-ui-arch)

| Tier | Directory   | Can Import From              |
| ---- | ----------- | ---------------------------- |
| 0    | `ui/`       | Nothing in `components/`     |
| 1    | `common/`   | `ui/` only                   |
| 2    | `layouts/`  | `ui/`, `common/`             |
| 3    | `features/` | `ui/`, `common/`, `layouts/` |

## Visual Reference

The sidebar design (from the provided mockup):

- **Top section**: Two nav items — "Control center" (settings icon) and "Memory" (brain icon)
- **Features section**: Header with "Features" label + folder/filter icons
- **ACTION NEEDED** group: Orange dot indicator, clock/pending action icon on right
- **IN PROGRESS** group: Spinner icon, elapsed time on right (e.g., "32:39")
- **DONE** group: Green check icon, total duration on right (e.g., "1h", "2h")
- **Footer**: "+ New feature" button spanning full width

## Component Props Design

### SidebarNavItem

- `icon`: Lucide icon component
- `label`: string
- `href`: string
- `isActive`: boolean (optional)

### FeatureStatusGroup

- `status`: 'action-needed' | 'in-progress' | 'done'
- `label`: string
- `count`: number
- `children`: ReactNode (list items)

### FeatureListItem

- `name`: string
- `status`: 'action-needed' | 'in-progress' | 'done'
- `startedAt?`: Date (for in-progress elapsed time)
- `duration?`: string (for done items, e.g., "1h", "2h")
- `onClick?`: () => void

### ElapsedTime

- `startedAt`: Date
- `format?`: 'mm:ss' | 'auto' (auto picks h/m/s based on duration)

## Affected Areas

| Area                                       | Impact | Reasoning                                                        |
| ------------------------------------------ | ------ | ---------------------------------------------------------------- |
| `src/presentation/web/components/ui/`      | Medium | New shadcn primitives (sidebar, scroll-area, separator, tooltip) |
| `src/presentation/web/components/common/`  | High   | New composed components directory and building blocks            |
| `src/presentation/web/components/layouts/` | High   | New layout tier with AppSidebar                                  |
| `.storybook/`                              | Low    | May need decorator updates for sidebar context                   |

## Dependencies

- **013-ui-arch** (In Progress): Established the four-tier component hierarchy this feature follows
- **004-web-ui-component-library** (Complete): shadcn/ui + Tailwind v4 foundation

## Scope Boundaries

**In scope:**

- Install shadcn sidebar, scroll-area, separator, tooltip primitives
- Build composed sidebar building blocks (SidebarNavItem, FeatureStatusGroup, FeatureListItem, ElapsedTime)
- Assemble AppSidebar layout component
- Storybook stories for all new components
- Static/mock data for feature list (no API integration)

**Out of scope:**

- Backend API integration for feature data
- Routing / page navigation wiring
- Sidebar collapse/expand state persistence
- Mobile responsive sidebar behavior
- Dashboard layout integration (separate feature)
- Control Center or Memory page content

## Size Estimate

**M** - Installs 4 shadcn primitives, creates 4 composed components and 1 layout
component, each with Storybook stories. No backend integration, purely
presentational with mock data. Moderate scope with clear building blocks.

---

_Generated by `/shep-kit:new-feature` — proceed with `/shep-kit:research`_
