# AGENTS.md

Guidance for AI coding agents (Cursor, Windsurf, Copilot, etc.) working in this repository.

## Project

`@shepai/cli` — Autonomous AI Native SDLC Platform. Users run `shep` in a repo to gather requirements via AI, generate plans, and execute implementation autonomously.

## Spec Workflow

**All feature work MUST begin with a spec.** See [spec-driven-workflow](./docs/development/spec-driven-workflow.md).

Specs live in `specs/NNN-feature-name/`. **Edit YAML only — Markdown is auto-generated.**

## Commands

| Command          | Purpose                         |
| ---------------- | ------------------------------- |
| `pnpm build`     | Build CLI + web                 |
| `pnpm test`      | Run all tests                   |
| `pnpm test:unit` | Unit tests only                 |
| `pnpm test:int`  | Integration tests only          |
| `pnpm test:e2e`  | Playwright e2e tests            |
| `pnpm lint:fix`  | Fix lint issues                 |
| `pnpm validate`  | Lint + format + typecheck + tsp |
| `pnpm dev:cli`   | Run CLI locally (ts-node)       |
| `pnpm dev:web`   | Start Next.js dev server        |

## Architecture

Clean Architecture — four layers in `packages/core/src/` (dependencies point inward):

- `domain/` — Core business logic, no external deps
- `application/` — Use cases, output port interfaces
- `infrastructure/` — External concerns: DB, agents, services
- `presentation/` — CLI, TUI, Web UI (`src/presentation/`)

See [clean-architecture](./docs/architecture/clean-architecture.md).

## Mandatory Rules

- **MANDATORY — TDD**: Write failing tests FIRST (RED → GREEN → REFACTOR). Every plan phase must define explicit TDD cycles. See [tdd-guide](./docs/development/tdd-guide.md).
- **MANDATORY — TypeSpec-first**: Domain models defined in `tsp/`. Run `pnpm tsp:compile` to generate `packages/core/src/domain/generated/output.ts`. Never edit generated files. See [typespec-guide](./docs/development/typespec-guide.md).
- **MANDATORY — Agent resolution**: No component may hardcode an agent type. All resolution flows through `IAgentExecutorProvider`. See [agent-system](./docs/architecture/agent-system.md).
- **MANDATORY — Storybook stories**: Every web UI component MUST have a colocated `.stories.tsx` file. Commits without stories will be rejected.
- **MANDATORY — Spec-driven**: All features start with a spec. No implementation without a spec.

## Commit Format

[Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>`

| Types | feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert |
| Scopes | specs, cli, tui, web, api, domain, agents, deployment, tsp, deps, config, dx, release, ci |

## Key Docs

| Topic                          | Doc                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| Architecture overview          | [docs/architecture/overview.md](./docs/architecture/overview.md)                       |
| Domain models + field listings | [docs/api/domain-models.md](./docs/api/domain-models.md)                               |
| Repository pattern + DI        | [docs/architecture/repository-pattern.md](./docs/architecture/repository-pattern.md)   |
| Agent system                   | [docs/architecture/agent-system.md](./docs/architecture/agent-system.md)               |
| Settings service               | [docs/architecture/settings-service.md](./docs/architecture/settings-service.md)       |
| TypeSpec guide                 | [docs/development/typespec-guide.md](./docs/development/typespec-guide.md)             |
| Testing guide                  | [docs/development/tdd-guide.md](./docs/development/tdd-guide.md)                       |
| Implementation patterns        | [docs/development/implementation-guide.md](./docs/development/implementation-guide.md) |
| CI/CD + Docker                 | [docs/development/cicd.md](./docs/development/cicd.md)                                 |
| Adding agents                  | [docs/development/adding-agents.md](./docs/development/adding-agents.md)               |
| CLI architecture               | [docs/cli/architecture.md](./docs/cli/architecture.md)                                 |
| TUI architecture               | [docs/tui/architecture.md](./docs/tui/architecture.md)                                 |
| Web UI architecture            | [docs/ui/architecture.md](./docs/ui/architecture.md)                                   |
| pnpm workspaces + setup        | [docs/development/setup.md](./docs/development/setup.md)                               |

# Agent Rules <!-- tessl-managed -->

@.tessl/RULES.md follow the [instructions](.tessl/RULES.md)
