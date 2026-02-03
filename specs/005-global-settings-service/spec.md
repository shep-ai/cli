# Feature: global-settings-service

> Initialize and manage global Shep platform settings with clean architecture

## Status

- **Number:** 005
- **Created:** 2026-02-03
- **Branch:** feat/005-global-settings-service
- **Phase:** Research

## Problem Statement

The Shep CLI currently lacks foundational application and domain layers following Clean Architecture principles. No persistent global settings exist for the platform:

- **No initialization system** - `~/.shep/` directory and database don't exist on first run
- **No configuration persistence** - Settings like AI model preferences, user profile, and system parameters aren't stored
- **No Clean Architecture foundation** - Only presentation layers (CLI/Web) exist; domain, application, and infrastructure layers are missing
- **No repository pattern implementation** - No data access abstraction or SQLite integration
- **No TypeSpec-to-TypeScript generation** - Domain models defined in TypeSpec aren't being used in TypeScript code

This feature establishes the first complete vertical slice of Clean Architecture, implementing:

- **Domain entity** (Settings) defined in TypeSpec and generated to TypeScript
- **Application use cases** (InitializeSettings, LoadSettings, UpdateSettings)
- **Repository pattern** with SQLite implementation
- **Infrastructure** for `~/.shep/` directory management and database migrations
- **TypeSpec code generation** pipeline for domain models

## Success Criteria

**TypeSpec & Code Generation:**

- [ ] TypeSpec TypeScript emitter configured (`@typespec/compiler` for types)
- [ ] Settings entity defined in `tsp/domain/entities/settings.tsp`
- [ ] TypeScript types generated to `src/domain/generated/` from TypeSpec
- [ ] pnpm script added for TypeSpec TypeScript generation (`tsp:codegen`)
- [ ] Generated types used across all layers (no manual interface duplication)

**Build Flow & CI/CD:**

- [ ] `pnpm generate` script runs all generators (TypeSpec → TypeScript, future generators)
- [ ] Build flow enforced: `generate` → `build` → `lint` → `format` → `test`
- [ ] `pnpm build` depends on successful `pnpm generate` (fails if types missing)
- [ ] CI/CD pipeline updated to run `pnpm generate` before all other steps
- [ ] Pre-commit hook (husky) runs `pnpm generate` before lint/format
- [ ] `.lintstagedrc.mjs` updated to include generated files in linting/formatting

**Domain Layer:**

- [ ] Settings domain entity uses TypeSpec-generated types
- [ ] Domain logic (validation, defaults) implemented using generated types
- [ ] No manual TypeScript interfaces for domain entities

**Application Layer:**

- [ ] `ISettingsRepository` interface defined in `src/application/ports/output/`
- [ ] `InitializeSettingsUseCase` with `execute()` method
- [ ] `LoadSettingsUseCase` with `execute()` method
- [ ] `UpdateSettingsUseCase` with `execute()` method
- [ ] Use cases work with TypeSpec-generated domain types

**Infrastructure Layer:**

- [ ] SQLite `SettingsRepository` implementation
- [ ] Database initialization (`~/.shep/data` SQLite file creation)
- [ ] Migration framework setup (e.g., `better-sqlite3-migrations` or custom)
- [ ] Initial migration: settings table with singleton constraint
- [ ] Directory bootstrapping service (`~/.shep/` structure creation)

**Integration:**

- [ ] CLI entry point checks settings initialization on startup
- [ ] Settings loaded and available globally via dependency injection
- [ ] Sensible default values for first-run experience
- [ ] Settings singleton pattern enforced (single row in database)

**Testing:**

- [ ] Unit tests for domain entity logic
- [ ] Unit tests for use cases (with mocked repository)
- [ ] Integration tests for SQLite repository
- [ ] E2E test for first-run initialization flow

## Settings Schema (TypeSpec Definition)

```typespec
// tsp/domain/entities/settings.tsp
import "../common/base.tsp";
import "../common/scalars.tsp";

@doc("Global Shep platform settings (singleton)")
model Settings extends BaseEntity {
  @doc("AI model configuration for different agents")
  models: ModelConfiguration;

  @doc("User profile information")
  user: UserProfile;

  @doc("Environment and tooling preferences")
  environment: EnvironmentConfig;

  @doc("System-level parameters")
  system: SystemConfig;
}

@doc("AI model configuration")
model ModelConfiguration {
  @doc("Model for codebase analysis agent")
  analyze: string = "claude-sonnet-4-5";

  @doc("Model for requirements gathering agent")
  requirements: string = "claude-sonnet-4-5";

  @doc("Model for planning agent")
  plan: string = "claude-sonnet-4-5";

  @doc("Model for implementation agent")
  implement: string = "claude-sonnet-4-5";
}

@doc("User profile")
model UserProfile {
  @doc("User's display name (optional)")
  name?: string;

  @doc("User's email address (optional)")
  email?: string;

  @doc("GitHub username (optional, for PR attribution)")
  githubUsername?: string;
}

@doc("Environment configuration")
model EnvironmentConfig {
  @doc("Preferred code editor")
  defaultEditor: string = "vscode"; // vscode | vim | nano | emacs

  @doc("Preferred shell")
  shellPreference: string = "bash"; // bash | zsh | fish
}

@doc("System configuration")
model SystemConfig {
  @doc("CLI auto-update preference")
  autoUpdate: boolean = true;

  @doc("Log level for CLI output")
  logLevel: string = "info"; // debug | info | warn | error
}
```

## Affected Areas

| Area                                         | Impact | Reasoning                                                        |
| -------------------------------------------- | ------ | ---------------------------------------------------------------- |
| `tsp/domain/entities/settings.tsp`           | High   | New TypeSpec model - single source of truth                      |
| `tsp/domain/entities/index.tsp`              | Low    | Export new Settings model                                        |
| `package.json`                               | High   | Add `generate` script, better-sqlite3, migration lib, TS emitter |
| `package.json` (scripts)                     | High   | Update build flow: generate → build → lint → test                |
| `src/domain/generated/`                      | High   | New directory for TypeSpec-generated TypeScript types            |
| `src/application/use-cases/settings/`        | High   | First use cases (Initialize, Load, Update)                       |
| `src/application/ports/output/`              | High   | First repository interface (ISettingsRepository)                 |
| `src/infrastructure/repositories/`           | High   | First repository implementation (SQLiteSettingsRepository)       |
| `src/infrastructure/persistence/`            | High   | Database connection, migrations, ~/.shep/ bootstrap              |
| `src/infrastructure/persistence/migrations/` | High   | Migration files (001_create_settings_table.sql)                  |
| `src/presentation/cli/index.ts`              | Medium | Add settings initialization check on startup                     |
| `tests/unit/domain/`                         | High   | First domain tests (using generated types)                       |
| `tests/unit/application/use-cases/`          | High   | First use case tests                                             |
| `tests/integration/infrastructure/`          | High   | First repository integration tests                               |
| `tsconfig.json`                              | Low    | Add path alias for generated types (`@domain/generated`)         |
| `.husky/pre-commit`                          | Medium | Add `pnpm generate` before lint/format steps                     |
| `.lintstagedrc.mjs`                          | Low    | Include generated files in lint/format checks                    |
| `.github/workflows/ci.yml`                   | High   | Add `pnpm generate` as first step in CI pipeline                 |
| `CLAUDE.md`                                  | Medium | Document TypeSpec-first approach and build flow                  |
| `.gitignore`                                 | Low    | Add `src/domain/generated/` to version control                   |

## Dependencies

None identified. This is foundational infrastructure that all future features will depend on.

**Blocks:**

- All features requiring persistent configuration
- Agent system configuration (model selection per agent)
- User profile and authentication features
- Repository-specific settings (future feature)

## Size Estimate

**XL (Extra Large)** - This is the first complete Clean Architecture vertical slice with TypeSpec integration:

- **TypeSpec code generation setup** - New build pipeline for generating TypeScript from TypeSpec
- **Multiple layers** - Domain, application, infrastructure layers (all net-new)
- **TypeSpec model definition** - First domain entity in TypeSpec with nested models
- **Repository pattern** - Interface + SQLite implementation
- **Database setup** - SQLite connection, migration framework, ~/.shep/ bootstrapping
- **Comprehensive testing** - Unit tests (domain + application), integration tests (infrastructure), E2E tests
- **20-25 new files** across 8+ directories
- **New dependency on TypeSpec TS emitter** and migration tooling

## Open Questions

None - requirements are clear.

**Decisions made:**

- ✅ **Global settings only** - No per-repository overrides (can be added later)
- ✅ **Model configuration per-agent** - Separate model settings for analyze, requirements, plan, implement
- ✅ **No telemetry** - Removed from initial implementation
- ✅ **Migration framework** - Use migration system for schema evolution
- ✅ **Singleton pattern** - Single settings row enforced at database level (UNIQUE constraint on id)
- ✅ **Sane defaults** - Claude Sonnet 4.5 for all agents, vscode editor, bash shell, auto-update enabled, info log level
- ✅ **TypeSpec-first domain models** - Use TypeSpec as single source of truth, generate TypeScript types
- ✅ **Build flow enforced** - `pnpm generate` runs FIRST (before build/lint/format/test), in both local dev and CI/CD, including pre-commit hooks

---

_Generated by `/shep-kit:new-feature` — proceed with `/shep-kit:research`_
