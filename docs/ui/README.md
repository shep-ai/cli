# Web UI Documentation

Documentation for the Shep AI web interface built with Next.js 16, React 19, and Tailwind CSS v4.

## Quick Links

| Document                            | Description                                                            |
| ----------------------------------- | ---------------------------------------------------------------------- |
| [Architecture](./architecture.md)   | Component patterns, folder structure, DI integration, state management |
| [Design System](./design-system.md) | Design tokens, theming, color palette                                  |
| [Components](./components.md)       | Component catalog and usage examples                                   |

## Tech Stack

| Technology   | Version | Purpose                                  |
| ------------ | ------- | ---------------------------------------- |
| Next.js      | 16+     | App Router, Server Components, Turbopack |
| React        | 19      | UI framework                             |
| Tailwind CSS | v4      | Utility-first styling with design tokens |
| shadcn/ui    | latest  | Radix UI primitives with Tailwind        |
| React Flow   | 12      | Canvas visualization (XYFlow)            |
| Storybook    | 8.x     | Component development and documentation  |
| Sonner       | latest  | Toast notifications                      |

## Package Info

The web UI is a separate pnpm workspace package:

- **Package**: `@shepai/web`
- **Location**: `src/presentation/web/`
- **Commands**:
  ```bash
  pnpm dev:web        # Start dev server (localhost:3000)
  pnpm build:web      # Build for production
  pnpm dev:storybook  # Component development (localhost:6006)
  ```

## Web UI Pages

| Route              | Page                                                         |
| ------------------ | ------------------------------------------------------------ |
| `/`                | Dashboard canvas (React Flow) with feature and repo nodes    |
| `/create`          | Create feature drawer (parallel route over dashboard)        |
| `/feature/[id]`    | Feature drawer (parallel route with tabbed detail view)      |
| `/repository/[id]` | Repository drawer (parallel route)                           |
| `/settings`        | Settings page (agent, models, workflow, environment, etc.)   |
| `/tools`           | Tools page (available development tools with install status) |
| `/skills`          | Skills page (available skills with categories)               |
| `/version`         | Version information page                                     |

### Feature Drawer Tabs

The feature detail drawer includes these tabs: overview, activity, approval, rejection, pr-info, deployment, timeline.

### Real-Time Updates

The UI receives real-time updates via SSE (Server-Sent Events) at `/api/agent-events`. A Service Worker multiplexes a single SSE connection across all browser tabs.

## Directory Overview

```
src/presentation/web/
├── app/                # Next.js App Router pages
│   ├── (dashboard)/    # Dashboard route group (canvas, drawers)
│   ├── settings/       # Settings page
│   ├── tools/          # Tools page
│   ├── skills/         # Skills page
│   ├── version/        # Version page
│   ├── actions/        # Server actions (~30 actions)
│   ├── api/            # API routes (agent-events SSE, attachments, etc.)
│   ├── layout.tsx      # Root layout
│   └── globals.css     # Design tokens and global styles
├── components/
│   ├── ui/             # Tier 0: shadcn/ui primitives (~28 components)
│   ├── common/         # Tier 1: Cross-feature composed (~40 components)
│   ├── layouts/        # Tier 2: Page shells (5 components)
│   └── features/       # Tier 3: Domain-specific (6 domains)
├── hooks/              # Custom React hooks (~20 hooks)
│   ├── use-agent-events.ts         # SSE event handling
│   ├── agent-events-provider.tsx   # SSE context provider
│   ├── use-graph-state.ts          # Canvas graph state management
│   ├── sidebar-features-context.tsx # Sidebar feature state
│   ├── use-notifications.ts        # Desktop notifications
│   ├── use-sound.ts                # Sound effects
│   ├── useTheme.ts                 # Theme management
│   └── ...
├── lib/                # Utilities
│   ├── utils.ts                    # cn() and helpers
│   ├── server-container.ts         # DI resolve() helper
│   ├── derive-graph.ts             # Pure graph derivation function
│   ├── layout-with-dagre.ts        # Dagre layout for canvas
│   ├── feature-flags.ts            # Feature flag definitions
│   ├── model-metadata.ts           # LLM model metadata
│   ├── skills.ts                   # Skills definitions
│   ├── logger.ts                   # Client-side logger
│   └── version.ts                  # Version utilities
├── docs/               # Design system MDX documentation
├── public/             # Static assets (including agent-events-sw.js)
└── types/              # TypeScript definitions
```
