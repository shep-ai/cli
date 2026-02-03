# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shep AI CLI (`@shepai/cli`) is an Autonomous AI Native SDLC Platform that automates the development cycle from idea to deploy. Users run `shep` in a repository to analyze code, gather requirements via conversational AI, generate plans with tasks/artifacts, and execute implementation autonomously.

## Spec-Driven Development (MANDATORY)

**All feature work MUST begin with `/shep-kit:new-feature`.** See [Spec-Driven Workflow](./docs/development/spec-driven-workflow.md).

```
/shep-kit:new-feature → /shep-kit:research → /shep-kit:plan → implement
```

Feature specifications live in `specs/NNN-feature-name/`:

- `spec.md` - Requirements and scope
- `research.md` - Technical decisions
- `plan.md` - Implementation strategy
- `tasks.md` - Task breakdown

## Commands

```bash
# Development
pnpm dev:cli              # Run CLI locally (ts-node) [alias: pnpm cli]
pnpm dev:storybook        # Start Storybook dev server
pnpm dev:web              # Start Next.js dev server

# Build
pnpm build                # Build CLI with Vite
pnpm build:storybook      # Build Storybook for deployment
pnpm build:web            # Build Next.js for production

# Testing (TDD Workflow)
pnpm test                 # Run all tests
pnpm test:watch           # Run tests in watch mode (TDD mode)
pnpm test:unit            # Run unit tests only
pnpm test:int             # Run integration tests only
pnpm test:e2e             # Run Playwright e2e tests
pnpm test:single <path>   # Run a single test file

# Code Quality
pnpm lint                 # Run ESLint
pnpm lint:fix             # Fix auto-fixable lint issues
pnpm lint:web             # Run ESLint on web package
pnpm lint:web:fix         # Fix lint issues in web package
pnpm format               # Format all files with Prettier
pnpm format:check         # Check formatting without fixing
pnpm typecheck            # Run TypeScript type checking on CLI
pnpm typecheck:web        # Run TypeScript type checking on web package
pnpm validate             # Run all checks (lint, format, typecheck, tsp)

# CLI Global Testing
pnpm link --global && shep  # Test CLI as global command

# TypeSpec (Domain Models)
pnpm tsp:compile          # Compile TypeSpec to OpenAPI
pnpm tsp:format           # Format TypeSpec files
pnpm tsp:watch            # Watch mode for TypeSpec compilation
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
│   ├── agents/       # LangGraph-based agent implementations
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

- `id`, `name`, `description`, `repoPath`
- `lifecycle: SdlcLifecycle` (Requirements | Plan | Implementation | Test | Deploy | Maintenance)
- `requirements: Requirement[]`
- `tasks: Task[]`
- `artifacts: Artifact[]`
- `createdAt` (readonly timestamp)

### Task

Work item within a Feature, contains Action Items.

- `id`, `featureId`, `title`, `description`
- `status: TaskStatus`
- `actionItems: ActionItem[]`
- `dependsOn: string[]` (Task IDs)
- `orderIndex`, `createdAt` (readonly timestamp)

### ActionItem

Granular step within a Task.

- `id`, `taskId`, `title`
- `status: TaskStatus`
- `dependsOn: string[]` (ActionItem IDs)
- `orderIndex`, `createdAt` (readonly timestamp)

### Artifact

Generated document attached to a Feature.

- `id`, `featureId`, `type: ArtifactType` (PRD | RFC | Design | TechPlan | Other)
- `title`, `content`, `filePath`
- `createdAt` (readonly timestamp)

### Requirement

User or inferred requirement attached to a Feature.

- `id`, `featureId`, `description`
- `source: RequirementSource` ('user' | 'inferred' | 'clarified')
- `createdAt` (readonly timestamp)

## Agent System

Located in `infrastructure/agents/`, implements LangGraph StateGraph patterns in TypeScript:

| Agent            | Responsibility                                          |
| ---------------- | ------------------------------------------------------- |
| analyzeNode      | Analyzes codebase structure, patterns, dependencies     |
| requirementsNode | Gathers requirements through conversational interaction |
| planNode         | Breaks features into Tasks, ActionItems, and Artifacts  |
| implementNode    | Executes code changes based on plan                     |

Nodes communicate through typed state updates in the StateGraph. See [AGENTS.md](./AGENTS.md) for details.

## Data Storage

- **Location**: `~/.shep/repos/<base64-encoded-repo-path>/`
- **Database**: `data` (SQLite file)
- **Analysis docs**: `docs/` subdirectory
- **Config**: `~/.shep/config.json` for global settings

## TypeSpec Domain Models

Domain models are defined in TypeSpec at `tsp/` following SRP (one model per file):

```
tsp/
├── common/           # Base types, scalars, enums
│   ├── base.tsp      # BaseEntity, SoftDeletableEntity, AuditableEntity
│   ├── scalars.tsp   # UUID scalar type
│   ├── ask.tsp       # Askable interface pattern
│   └── enums/        # Enum definitions (lifecycle, states, etc.)
├── domain/           # Domain entities
│   ├── entities/     # One file per entity (feature, plan, task, etc.)
│   └── value-objects/# Embedded value objects (gantt, etc.)
├── agents/           # Agent system models
└── deployment/       # Deployment configuration models
```

Compile with `pnpm tsp:compile`. Output goes to `apis/`:

- `apis/openapi/` - OpenAPI 3.x specs
- `apis/json-schema/` - JSON Schema definitions (one per model)

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

- **Framework**: Next.js 16+ (App Router, Turbopack)
- **Components**: shadcn/ui (Radix primitives + Tailwind CSS v4)
- **Design System**: Storybook with all component variants
- **E2E Testing**: Playwright
- **Location**: `src/presentation/web/`
- **Package**: `@shepai/web` (pnpm workspace)

## pnpm Workspaces

This project uses pnpm workspaces for the monorepo structure:

```yaml
# pnpm-workspace.yaml
packages:
  - '.' # Root package (@shepai/cli)
  - 'src/presentation/web' # Web UI package (@shepai/web)
```

### Workspace Commands

```bash
# Development
pnpm dev:web                       # Start Next.js dev server

# Build
pnpm build:web                     # Build Next.js for production

# Code quality
pnpm lint:web                      # Run ESLint on web package
pnpm lint:web:fix                  # Fix lint issues in web package
pnpm typecheck:web                 # Type check web package

# Or use pnpm filter directly
pnpm --filter @shepai/web <script>
```

### Package Structure

| Package | Name          | Location                |
| ------- | ------------- | ----------------------- |
| CLI     | `@shepai/cli` | Root (`./`)             |
| Web UI  | `@shepai/web` | `src/presentation/web/` |

## Code Quality & Commits

### Linting Stack

- **ESLint 9** - Flat config (`eslint.config.mjs`) with TypeScript support
- **Prettier 3** - Code formatting with TypeSpec plugin
- **lint-staged** - Run linters on staged files only
- **commitlint** - Enforce Conventional Commits

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
Scopes: specs, cli, tui, web, api, domain, agents, deployment, tsp, deps, config, dx, release, ci
```

Examples:

- `feat(cli): add analyze command`
- `fix(agents): resolve memory leak in feature agent`
- `docs(tsp): update domain model documentation`

### Pre-commit Hooks

Husky runs automatically on commit:

1. **pre-commit**: lint-staged (ESLint + Prettier on staged files)
2. **commit-msg**: commitlint (validates commit message format)

## CI/CD & Docker

Automated pipeline using GitHub Actions with semantic-release and security gates.

### Pipeline Structure

- **All branches**: Lint, Typecheck, Unit Tests, E2E tests, Security scans run in parallel
- **Pull requests**: Claude Code review for documentation consistency and architecture compliance
- **Non-main branches**: Docker builds and pushes `sha-<commit>` tag
- **Main branch**: After all jobs pass (including security), semantic-release handles npm publish + Docker push

### Security Scanning

All branches run these security scanners in parallel (release-blocking on main):

| Scanner               | Purpose                                    |
| --------------------- | ------------------------------------------ |
| **Trivy (deps)**      | Dependency vulnerabilities (HIGH/CRITICAL) |
| **Trivy (container)** | Docker image vulnerabilities               |
| **Gitleaks**          | Secret detection in git history            |
| **Semgrep**           | SAST for TypeScript/JavaScript             |
| **Hadolint**          | Dockerfile best practices                  |

### Docker

```bash
# Pull and run
docker pull ghcr.io/shep-ai/cli:latest
docker run ghcr.io/shep-ai/cli --version

# Build locally
docker build -t shep-cli .
```

**Tags**: `latest`, `v<version>`, `sha-<commit>`

### Release Triggers

| Commit Type                  | Version Bump  |
| ---------------------------- | ------------- |
| `feat:`                      | Minor (0.X.0) |
| `fix:`, `perf:`, `refactor:` | Patch (0.0.X) |
| `BREAKING CHANGE`            | Major (X.0.0) |

See [docs/development/cicd.md](./docs/development/cicd.md) for complete CI/CD documentation.

---

## Maintaining This Document

**Update when:**

- New commands are added
- Architecture layers change
- New domain models are introduced
- Key patterns evolve
- CI/CD pipeline changes

**Keep concise**: This is reference material for AI, not a tutorial. Focus on what's needed to navigate and modify the codebase effectively.
