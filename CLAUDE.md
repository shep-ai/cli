# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shep AI CLI (`@shepai/cli`) is an Autonomous AI Native SDLC Platform that automates the development cycle from idea to deploy. Users run `shep` in a repository to analyze code, gather requirements via conversational AI, generate plans with tasks/artifacts, and execute implementation autonomously.

## Spec-Driven Development (MANDATORY)

**All feature work MUST begin with `/shep-kit:new-feature`.** See [Spec-Driven Workflow](./docs/development/spec-driven-workflow.md).

```
/shep-kit:new-feature → /shep-kit:research → /shep-kit:plan → /shep-kit:implement → /shep-kit:commit-pr
```

Feature specifications live in `specs/NNN-feature-name/`:

- `spec.md` - Requirements and scope
- `research.md` - Technical decisions
- `plan.md` - Implementation strategy **with TDD cycles (RED-GREEN-REFACTOR)**
- `tasks.md` - Task breakdown **with explicit TDD phases**
- `feature.yaml` - **Machine-readable status tracking** (updated by all shep-kit skills)

**CRITICAL**: Plans MUST follow Test-Driven Development. Every implementation phase must define:

1. **RED**: Tests to write FIRST
2. **GREEN**: Minimal implementation to pass
3. **REFACTOR**: Cleanup while keeping tests green

### `/shep-kit:implement` - Autonomous Implementation

**Use after planning is complete to start autonomous implementation.**

**What it does:**

1. **Pre-Implementation Validation Gate**:

   - Checks spec completeness (no open questions)
   - Validates architecture compliance (Clean Architecture, TypeSpec-first, TDD phases)
   - Verifies cross-document consistency
   - Auto-fixes safe structural issues
   - **Blocks on critical problems**

2. **Autonomous Execution**:

   - Reads `feature.yaml` for current state
   - Resumes from last task automatically
   - Executes tasks from `tasks.md` following TDD
   - Updates `feature.yaml` after each task
   - Self-corrects errors (max 3 retry attempts)

3. **Status Tracking**:
   - `feature.yaml` updated continuously
   - Progress: `7/12 tasks (58%)`
   - Current task visible
   - Error state tracked

**Validation Gates** (must pass before implementation):

- ✓ Spec completeness (required sections, no open questions)
- ✓ Architecture compliance (Clean Architecture, TypeSpec-first, TDD)
- ✓ Cross-document consistency (task counts, dependencies)

**Error Handling**: Bounded retry (max 3 attempts) with systematic debugging. Stops and reports if unresolvable.

**Reference**: [feature.yaml Protocol](./docs/development/feature-yaml-protocol.md)

## Commands

```bash
# Development
pnpm dev:cli              # Run CLI locally (ts-node) [alias: pnpm cli]
pnpm dev:storybook        # Start Storybook dev server
pnpm dev:web              # Start Next.js dev server

# Build
pnpm build                # Build CLI with tsc + tsc-alias, then build web
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
│   ├── factories/    # Factory functions (e.g., settings defaults)
│   ├── generated/    # TypeSpec-generated TypeScript types (DO NOT EDIT)
│   └── value-objects/# VersionInfo, GanttTask, GanttViewData
├── application/      # Use cases and orchestration
│   ├── use-cases/    # Single-responsibility use case classes
│   └── ports/output/ # Output port interfaces (repositories, services)
├── infrastructure/   # External concerns implementation
│   ├── di/           # tsyringe DI container setup
│   ├── repositories/ # SQLite implementations of repository interfaces
│   ├── persistence/  # Database connection, migrations
│   └── services/     # External service integrations (agents/, version, web-server)
└── presentation/     # User interfaces
    ├── cli/          # Commander-based CLI commands
    ├── tui/          # Terminal UI wizard
    └── web/          # Web UI server and routes
```

### Key Principles

1. **Dependency Rule**: Dependencies point inward. Domain has no external deps, Application depends only on Domain, Infrastructure implements Application interfaces.

2. **Repository Pattern**: All data access goes through repository interfaces defined in `application/ports/`. SQLite implementations live in `infrastructure/repositories/`.

3. **Use Case Pattern**: Each use case is a single class with an `execute()` method. Use cases orchestrate domain entities and repository calls.

4. **Dependency Injection**: Uses tsyringe for IoC container. Infrastructure layer registers concrete implementations, application layer depends only on interfaces. Container initialized at CLI bootstrap via `initializeContainer()`.

## Dependency Injection

Managed by tsyringe with `reflect-metadata`. Container setup in [src/infrastructure/di/container.ts](src/infrastructure/di/container.ts:49-86).

**Container Lifecycle:**

1. CLI bootstrap calls `initializeContainer()` (async)
2. Opens SQLite connection to `~/.shep/data`
3. Runs database migrations via `user_version` pragma
4. Registers Database instance
5. Registers port implementations (ISettingsRepository → SQLiteSettingsRepository, IAgentValidator → AgentValidatorService, IVersionService → VersionService)
6. Registers use cases as singletons (InitializeSettingsUseCase, LoadSettingsUseCase, UpdateSettingsUseCase, ConfigureAgentUseCase, ValidateAgentAuthUseCase)

**Usage:**

```typescript
import { container } from '@/infrastructure/di/container';
import { InitializeSettingsUseCase } from '@/application/use-cases/settings/initialize-settings.use-case';

// Resolve use case (dependencies injected automatically)
const useCase = container.resolve(InitializeSettingsUseCase);
const settings = await useCase.execute();
```

**IMPORTANT**: Always import `'reflect-metadata'` at the top of entry points and test files before any other imports.

## Domain Models

### Feature (Aggregate Root)

Central entity tracking a piece of work through the SDLC lifecycle.

- `id`, `name`, `slug`, `description`, `repositoryPath`, `branch`
- `lifecycle: SdlcLifecycle` (Requirements | Research | Implementation | Review | Deploy & QA | Maintain)
- `messages: Message[]`
- `plan?: Plan` (optional, contains requirements, tasks, and artifacts)
- `relatedArtifacts: Artifact[]`
- `createdAt`, `updatedAt`

### Task

Work item within a Plan, contains Action Items.

- `id`, `title?`, `description?`
- `state: TaskState` (Todo | WIP | Done | Review)
- `actionItems: ActionItem[]`
- `dependsOn: Task[]`
- `baseBranch`, `branch`
- `createdAt`, `updatedAt`

### ActionItem

Granular step within a Task.

- `id`, `name`, `description`, `branch`
- `dependsOn: ActionItem[]`
- `acceptanceCriteria: AcceptanceCriteria[]`
- `createdAt`, `updatedAt`

### Artifact

Generated document attached to a Feature.

- `id`, `name`, `type` (free-form string), `category: ArtifactCategory` (PRD | API | Design | Other)
- `format: ArtifactFormat` (Markdown | Text | Yaml | Other)
- `summary`, `path`
- `state: ArtifactState` (Todo | Elaborating | Done)
- `createdAt`, `updatedAt`

### Requirement

User requirement attached to a Plan.

- `id`, `slug`, `userQuery`
- `type: RequirementType` (Functional | NonFunctional)
- `researches: Research[]`
- `createdAt`, `updatedAt`

### Settings

Global application configuration (singleton).

- `id`, `createdAt`, `updatedAt`
- `models: ModelConfiguration` (analyze, requirements, plan, implement)
- `user: UserProfile` (name, email, githubUsername - all optional)
- `environment: EnvironmentConfig` (defaultEditor, shellPreference)
- `system: SystemConfig` (autoUpdate, logLevel)
- `agent: AgentConfig` (type, authMethod, token)
- **Location**: `~/.shep/data` (SQLite singleton record)
- **Access**: Via `getSettings()` singleton service (initialized at CLI bootstrap)

## Agent System

Located in `infrastructure/services/agents/`. The current agent system handles external AI coding tool configuration (Claude Code, Gemini CLI, etc.) via the `AgentConfig` settings and `IAgentValidator` port.

**Note**: The LangGraph StateGraph agent architecture (analyzeNode, requirementsNode, planNode, implementNode) is **planned but not yet implemented**. See [AGENTS.md](./AGENTS.md) for the planned design.

## Data Storage

### Global Settings

- **Location**: `~/.shep/` (directory created on first run with 0700 permissions)
- **Database**: `~/.shep/data` (SQLite file containing singleton Settings record)
- **Access**: Via `getSettings()` singleton service initialized at CLI bootstrap
- **Initialization**: Automatic on first CLI run via `InitializeSettingsUseCase`

### Repository Data

- **Location**: `~/.shep/repos/<base64-encoded-repo-path>/`
- **Database**: `data` (SQLite file)
- **Analysis docs**: `docs/` subdirectory

## TypeSpec Domain Models

**TypeSpec-First Architecture**: Domain models are the single source of truth. TypeScript types are generated from TypeSpec definitions.

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

### TypeSpec Build Flow

**CRITICAL**: TypeScript code is generated from TypeSpec. Always modify `.tsp` files, never hand-edit generated files.

```
1. Edit TypeSpec models (tsp/*.tsp)
2. Generate TypeScript (pnpm tsp:compile)
3. Import types from src/domain/generated/output.ts
4. Build TypeScript (pnpm build)
5. Run tests (pnpm test)
```

**Generated Output:**

```
apis/
├── openapi/          # OpenAPI 3.x specs (for API documentation)
└── json-schema/      # JSON Schema definitions (one per model)

src/domain/generated/
└── output.ts         # TypeScript types and interfaces (DO NOT EDIT)
```

**Commands:**

- `pnpm tsp:compile` - Compile TypeSpec to OpenAPI + TypeScript types
- `pnpm tsp:format` - Format TypeSpec files with Prettier
- `pnpm tsp:watch` - Watch mode for continuous compilation

**Import Generated Types:**

```typescript
import type { Settings, Feature, Task } from '@/domain/generated/output';
```

**Validation**: `pnpm validate` runs `tsp:compile` as part of CI checks

## Key Patterns

### Adding a New Use Case

1. Define any needed port interfaces in `application/ports/output/`
2. Create use case class in `application/use-cases/`
3. Inject repository/service interfaces via constructor
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

## Testing Strategy (TDD MANDATORY)

This project **MANDATES Test-Driven Development (TDD)** with the Red-Green-Refactor cycle for ALL implementation work.

### Test Layers

- **Unit tests** (`tests/unit/`): Domain entities and use cases (mock repositories)
- **Integration tests** (`tests/integration/`): Repository implementations with test SQLite
- **E2E tests** (`tests/e2e/`): Playwright for web UI, CLI command execution

### TDD Workflow (NON-NEGOTIABLE)

**ALWAYS follow this order:**

1. **RED**: Write failing test FIRST (never skip this!)
2. **GREEN**: Write minimal code to pass test
3. **REFACTOR**: Improve code while keeping tests green

**Planning Requirement**: All feature plans created by `/shep-kit:plan` MUST structure implementation phases with explicit RED-GREEN-REFACTOR cycles. Each phase must specify:

- What tests to write first (RED)
- What minimal implementation passes those tests (GREEN)
- What refactoring opportunities exist (REFACTOR)

See [docs/development/tdd-guide.md](./docs/development/tdd-guide.md) for detailed TDD workflow.

## Presentation Layer Technologies

### CLI

- **Framework**: Commander.js (fluent API, subcommands, options)
- **Location**: `src/presentation/cli/`
- **Entry Point**: `src/presentation/cli/index.ts` - `bootstrap()` initializes DI, settings, then `parseAsync()`
- **Commands**: `version`, `settings show`, `settings init`, `settings agent`, `ui`
- **UI System**: `src/presentation/cli/ui/` - colors (chalk), messages, formatters, output (table/json/yaml), tables (cli-table3)
- **Pattern**: Each command exports `createXxxCommand()` returning a `Command` instance
- **Settings Access**: Uses `getSettings()` in-memory singleton (not repository directly)
- **Error Handling**: `try/catch` with `process.exitCode = 1` and `messages.error()`
- **Documentation**: See [docs/cli/](./docs/cli/) for architecture, design system, and command reference

### TUI (Terminal UI)

- **Framework**: [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js) - Interactive CLI prompts (select, confirm, input, password)
- **Features**: Disabled options with badges, separators, themes, TypeScript-native
- **Location**: Interactive prompts used within CLI commands (e.g., `shep settings agent`)
- **Documentation**: See [docs/tui/](./docs/tui/) for architecture and patterns

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
