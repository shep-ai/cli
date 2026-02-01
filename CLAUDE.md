# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shep AI CLI (`@shep-ai/cli`) is an Autonomous AI Native SDLC Platform that automates the development cycle from idea to deploy. Users run `shep` in a repository to analyze code, gather requirements via conversational AI, generate plans with tasks/artifacts, and execute implementation autonomously.

## Commands

```bash
# Development
pnpm dev             # Start development mode with hot reload
pnpm build           # Build with Vite
pnpm typecheck       # Run TypeScript type checking

# Testing (TDD Workflow)
pnpm test            # Run all tests
pnpm test:watch      # Run tests in watch mode (TDD mode)
pnpm test:unit       # Run unit tests only
pnpm test:int        # Run integration tests only
pnpm test:e2e        # Run Playwright e2e tests
pnpm test:single <path>  # Run a single test file

# Linting
pnpm lint            # Run ESLint
pnpm lint:fix        # Fix auto-fixable lint issues
pnpm format          # Run Prettier

# CLI Testing
pnpm cli             # Run CLI locally (ts-node)
pnpm link --global && shep  # Test as global command

# Storybook (Design System)
pnpm storybook       # Start Storybook dev server
pnpm storybook:build # Build Storybook for deployment

# Web UI (Next.js)
pnpm web:dev         # Start Next.js dev server
pnpm web:build       # Build Next.js for production
```

## Architecture

This project follows **Clean Architecture** with four layers:

```
src/
├── domain/           # Core business logic (no external dependencies)
│   ├── entities/     # Feature, Task, ActionItem, Artifact, Requirement
│   ├── value-objects/# SdlcLifecycle, TaskStatus, ArtifactType
│   └── services/     # Domain services
├── application/      # Use cases and orchestration
│   ├── use-cases/    # Single-responsibility use case classes
│   ├── ports/        # Input/output port interfaces
│   └── services/     # Application services
├── infrastructure/   # External concerns implementation
│   ├── repositories/ # SQLite implementations of repository interfaces
│   ├── agents/       # CrewAI-style agent implementations
│   ├── persistence/  # Database connection, migrations
│   └── services/     # External service integrations
└── presentation/     # User interfaces
    ├── cli/          # Commander-based CLI commands
    ├── tui/          # Terminal UI wizard
    └── web/          # Web UI server and routes
```

### Key Principles

1. **Dependency Rule**: Dependencies point inward. Domain has no external deps, Application depends only on Domain, Infrastructure implements Application interfaces.

2. **Repository Pattern**: All data access goes through repository interfaces defined in `application/ports/`. SQLite implementations live in `infrastructure/repositories/`.

3. **Use Case Pattern**: Each use case is a single class with an `execute()` method. Use cases orchestrate domain entities and repository calls.

## Domain Models

### Feature
Central entity tracking a piece of work through the SDLC lifecycle.
- `id`, `name`, `description`
- `lifecycle: SdlcLifecycle` (Requirements | Plan | Implementation | Test | Deploy | Maintenance)
- `requirements: Requirement[]`
- `tasks: Task[]`
- `artifacts: Artifact[]`

### Task
Work item within a Feature, contains Action Items.
- `id`, `featureId`, `title`, `description`
- `status: TaskStatus`
- `actionItems: ActionItem[]`
- `dependsOn: string[]` (Task IDs)

### ActionItem
Granular step within a Task.
- `id`, `taskId`, `title`
- `status: TaskStatus`
- `dependsOn: string[]` (ActionItem IDs)

### Artifact
Generated document attached to a Feature.
- `id`, `featureId`, `type: ArtifactType` (PRD | RFC | Design | TechPlan | Other)
- `title`, `content`, `filePath`

## Agent System

Located in `infrastructure/agents/`, implements CrewAI-style patterns in TypeScript:

| Agent | Responsibility |
|-------|---------------|
| RepositoryAnalysisAgent | Analyzes codebase structure, patterns, dependencies |
| RequirementsAgent | Gathers requirements through conversational interaction |
| PlanningAgent | Breaks features into Tasks, ActionItems, and Artifacts |
| ImplementationAgent | Executes code changes based on plan |

Agents communicate through a message-passing system. See [AGENTS.md](./AGENTS.md) for details.

## Data Storage

- **Location**: `~/.shep/repos/<base64-encoded-repo-path>/`
- **Database**: `data` (SQLite file)
- **Analysis docs**: `docs/` subdirectory
- **Config**: `~/.shep/config.json` for global settings

## Key Patterns

### Adding a New Use Case
1. Define interface in `application/ports/input/`
2. Create use case class in `application/use-cases/`
3. Inject repository interfaces via constructor
4. Wire up in DI container

### Adding a New Repository
1. Define interface in `application/ports/output/`
2. Implement in `infrastructure/repositories/`
3. Register in DI container

### Adding a CLI Command
1. Create command in `presentation/cli/commands/`
2. Use Commander's fluent API
3. Call appropriate use case
4. Register in main CLI setup

## Testing Strategy (TDD)

This project follows **Test-Driven Development (TDD)** with the Red-Green-Refactor cycle.

### Test Layers
- **Unit tests** (`tests/unit/`): Domain entities and use cases (mock repositories)
- **Integration tests** (`tests/integration/`): Repository implementations with test SQLite
- **E2E tests** (`tests/e2e/`): Playwright for web UI, CLI command execution

### TDD Workflow for New Features

1. **Write failing test first** (RED)
2. **Write minimal code to pass** (GREEN)
3. **Refactor while keeping tests green** (REFACTOR)

See [docs/development/tdd-guide.md](./docs/development/tdd-guide.md) for detailed TDD workflow.

## Presentation Layer Technologies

### TUI (Terminal UI)
- **Framework**: [OpenTUI](https://opentui.com/) - TypeScript library for rich terminal UIs
- **Features**: Flexbox layout, React/Solid bindings, keyboard handling
- **Location**: `src/presentation/tui/`

### Web UI
- **Framework**: Next.js 14+ (App Router)
- **Components**: shadcn/ui (Radix primitives + Tailwind)
- **Design System**: Storybook with all component variants
- **E2E Testing**: Playwright
- **Location**: `src/presentation/web/`

---

## Maintaining This Document

**Update when:**
- New commands are added
- Architecture layers change
- New domain models are introduced
- Key patterns evolve

**Keep concise**: This is reference material for AI, not a tutorial. Focus on what's needed to navigate and modify the codebase effectively.
