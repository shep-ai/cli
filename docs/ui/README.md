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
| Storybook    | 8.x     | Component development and documentation  |

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

## Directory Overview

```
src/presentation/web/
├── app/              # Next.js App Router pages
├── components/
│   ├── ui/           # Tier 0: shadcn/ui primitives (CLI-managed)
│   ├── common/       # Tier 1: Cross-feature composed components
│   ├── layouts/      # Tier 2: Page shells, structural wrappers
│   └── features/     # Tier 3: Domain-specific UI bound to routes
├── docs/             # Design system MDX documentation
├── hooks/            # Custom React hooks
├── lib/              # Utilities (cn, server-container, etc.)
└── types/            # TypeScript definitions
```

## Related Documentation

- [Getting Started Guide](../guides/getting-started.md)
- [Web UI Guide](../guides/web-ui.md)
- [Component Library Reference](../development/web-component-library.md)
