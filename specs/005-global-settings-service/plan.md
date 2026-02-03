# Plan: global-settings-service

> Implementation plan for 005-global-settings-service

## Status

- **Phase:** Planning
- **Updated:** 2026-02-03

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Presentation Layer                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  src/presentation/cli/index.ts                                │  │
│  │  - Bootstrap: Initialize DI container                         │  │
│  │  - Check settings initialization on startup                   │  │
│  │  - Load settings globally via DI                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        Application Layer                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Use Cases (src/application/use-cases/settings/)            │   │
│  │  - InitializeSettingsUseCase  (first-run setup)            │   │
│  │  - LoadSettingsUseCase        (load from DB)                │   │
│  │  - UpdateSettingsUseCase      (modify settings)             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Ports/Interfaces (src/application/ports/output/)           │   │
│  │  - ISettingsRepository (defines data access contract)       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          Domain Layer                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Generated Types (src/domain/generated/)                    │   │
│  │  - Settings (from TypeSpec)                                 │   │
│  │  - ModelConfiguration, UserProfile, etc.                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↑                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  TypeSpec Models (tsp/domain/entities/settings.tsp)         │   │
│  │  - Settings model definition (single source of truth)       │   │
│  │  - Nested models with defaults                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────────────┐
│                       Infrastructure Layer                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Repository Implementations (by DB type)                    │   │
│  │  src/infrastructure/repositories/sqlite/                    │   │
│  │  - settings.repository.ts (SQLiteSettingsRepository)        │   │
│  │  - feature.repository.ts  (future)                          │   │
│  │                                                             │   │
│  │  src/infrastructure/repositories/postgres/ (future)         │   │
│  │  src/infrastructure/repositories/in-memory/ (tests)         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Persistence Layer (organized by DB type)                   │   │
│  │  src/infrastructure/persistence/sqlite/                     │   │
│  │  - connection.ts       (connection singleton + pragmas)     │   │
│  │  - migrations.ts       (migration runner)                    │   │
│  │  - migrations/001_create_settings_table.sql                 │   │
│  │                                                             │   │
│  │  src/infrastructure/services/filesystem/                    │   │
│  │  - shep-directory.service.ts (~/.shep/ initialization)      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Data Store: ~/.shep/data (SQLite)                          │   │
│  │  - settings table (singleton with UNIQUE constraint on id)  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

Build Pipeline Flow:
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ TypeSpec │ -> │ Generate │ -> │  Build   │ -> │   Test   │
│  Models  │    │   Types  │    │    TS    │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     ↑
                     │
         pnpm generate (pre-build hook)
         @typespec-tools/emitter-typescript
```

## Implementation Strategy

### Phase 1: Build Pipeline & Code Generation Setup

**Goal:** Establish TypeSpec → TypeScript generation pipeline with proper build flow orchestration.

**Steps:**

1. Install dependencies:

   - `better-sqlite3` (^11.x) - SQLite driver
   - `@blackglory/better-sqlite3-migrations` (^0.6.x) - Migration framework
   - `@typespec-tools/emitter-typescript` - TypeSpec TypeScript emitter
   - `tsyringe` (^4.x) - DI container
   - `reflect-metadata` - Required for tsyringe decorators

2. Configure TypeScript for decorators:

   - Add `experimentalDecorators: true` and `emitDecoratorMetadata: true` to tsconfig.json
   - Import `reflect-metadata` in CLI entry point

3. Create TypeSpec emitter config:

   - Create `tsp-config.yaml` with `@typespec-tools/emitter-typescript` emitter
   - Configure output directory: `src/domain/generated/`
   - Configure to generate TypeScript interfaces and types

4. Add build scripts to package.json:

   - `generate`: Run all code generators
   - `tsp:codegen`: Emit TypeScript from TypeSpec
   - Add `prebuild`, `pretest`, `prelint` hooks to run `generate`

5. Update CI/CD pipeline:

   - Add `pnpm generate` as first step in all jobs (before install)
   - Ensure generated files are available for build/test/lint

6. Update pre-commit hooks:

   - Add `pnpm generate` to husky pre-commit
   - Update `.lintstagedrc.mjs` to include generated files

7. Update tsconfig.json:

   - Add path alias: `"@domain/generated/*": ["src/domain/generated/*"]`

8. Update .gitignore:
   - Ensure `src/domain/generated/` is tracked (NOT ignored)
   - Add comment explaining generated files are checked in

**Deliverables:**

- package.json updated with new dependencies and scripts
- tsp-config.yaml created
- tsconfig.json updated with decorator support + path alias
- .github/workflows/ci.yml updated
- .husky/pre-commit updated
- .lintstagedrc.mjs updated
- .gitignore updated

**Testing:**

- Run `pnpm generate` manually to verify TypeSpec compilation
- Verify CI pipeline runs generate first

---

### Phase 2: TypeSpec Settings Model & Generation

**Goal:** Define Settings domain model in TypeSpec and generate TypeScript types.

**Steps:**

1. Create TypeSpec model file:

   - Create `tsp/domain/entities/settings.tsp`
   - Define Settings model extending BaseEntity
   - Define nested models:
     - ModelConfiguration (analyze, requirements, plan, implement)
     - UserProfile (name, email, githubUsername - all optional)
     - EnvironmentConfig (defaultEditor, shellPreference)
     - SystemConfig (autoUpdate, logLevel)
   - Set sane defaults for all fields

2. Export Settings from index:

   - Update `tsp/domain/entities/index.tsp` to export Settings model

3. Generate TypeScript types:

   - Run `pnpm generate` to create TypeScript types
   - Verify output in `src/domain/generated/`
   - Check generated interfaces match TypeSpec definitions

4. Create domain defaults factory:
   - Create `src/domain/factories/settings-defaults.factory.ts`
   - Use TypeSpec-generated types
   - Implement factory function returning default Settings object
   - Match defaults from TypeSpec model

**Deliverables:**

- tsp/domain/entities/settings.tsp (new TypeSpec model)
- tsp/domain/entities/index.tsp (updated)
- src/domain/generated/Settings.ts (generated)
- src/domain/factories/settings-defaults.factory.ts (uses generated types)

**Testing:**

- Verify `pnpm generate` produces valid TypeScript
- Verify TypeScript compiler accepts generated types
- Unit test for defaults factory

---

### Phase 3: Application Layer - Ports & Use Cases

**Goal:** Define repository interface and implement use cases using generated domain types.

**Steps:**

1. Create repository interface:

   - Create `src/application/ports/output/settings.repository.interface.ts`
   - Define `ISettingsRepository` interface:
     - `initialize(): Promise<Settings>` - First-run initialization
     - `load(): Promise<Settings | null>` - Load existing settings
     - `update(settings: Settings): Promise<Settings>` - Update settings
   - Use TypeSpec-generated Settings type

2. Create InitializeSettingsUseCase:

   - Create `src/application/use-cases/settings/initialize-settings.use-case.ts`
   - Mark with `@injectable()` decorator
   - Inject ISettingsRepository via constructor
   - Implement `execute()` method:
     - Check if settings exist (via repository.load())
     - If not exist, create with defaults and initialize
     - Return settings

3. Create LoadSettingsUseCase:

   - Create `src/application/use-cases/settings/load-settings.use-case.ts`
   - Mark with `@injectable()` decorator
   - Inject ISettingsRepository via constructor
   - Implement `execute()` method:
     - Load settings from repository
     - If null, throw error (settings must be initialized first)

4. Create UpdateSettingsUseCase:

   - Create `src/application/use-cases/settings/update-settings.use-case.ts`
   - Mark with `@injectable()` decorator
   - Inject ISettingsRepository via constructor
   - Implement `execute(settings: Settings)` method:
     - Validate settings
     - Call repository.update()
     - Return updated settings

5. Export use cases:
   - Create `src/application/use-cases/settings/index.ts` barrel export

**Deliverables:**

- src/application/ports/output/settings.repository.interface.ts
- src/application/use-cases/settings/initialize-settings.use-case.ts
- src/application/use-cases/settings/load-settings.use-case.ts
- src/application/use-cases/settings/update-settings.use-case.ts
- src/application/use-cases/settings/index.ts

**Testing:**

- Unit tests for each use case with mocked repository
- Verify use cases use generated Settings types correctly

---

### Phase 4: Infrastructure - Persistence & Repository

**Goal:** Implement SQLite persistence with migrations and repository pattern using scalable directory structure.

**Steps:**

1. Create Shep directory initialization service:

   - Create `src/infrastructure/services/filesystem/shep-directory.service.ts`
   - Implement function to create `~/.shep/` directory structure
   - Set appropriate permissions (700 for directory, 600 for DB file)
   - Handle errors gracefully (directory exists, permission denied, etc.)
   - Export `ensureShepDirectory()` function

2. Create SQLite connection manager:

   - Create `src/infrastructure/persistence/sqlite/connection.ts`
   - Export function `getSQLiteConnection(): Database` (singleton pattern)
   - Initialize better-sqlite3 connection to `~/.shep/data`
   - Set pragmas:
     - `PRAGMA journal_mode = WAL;`
     - `PRAGMA synchronous = NORMAL;`
     - `PRAGMA foreign_keys = ON;`
     - `PRAGMA defensive = ON;`
   - Call shep-directory service to ensure directory exists

3. Create SQLite migration system:

   - Create `src/infrastructure/persistence/sqlite/migrations.ts`
   - Export function `runSQLiteMigrations(db: Database): void`
   - Use `@blackglory/better-sqlite3-migrations` library
   - Point to migrations directory: `src/infrastructure/persistence/sqlite/migrations/`

4. Create first migration:

   - Create `src/infrastructure/persistence/sqlite/migrations/001_create_settings_table.sql`
   - Define settings table:

     ```sql
     CREATE TABLE IF NOT EXISTS settings (
       id TEXT PRIMARY KEY,
       models_analyze TEXT NOT NULL,
       models_requirements TEXT NOT NULL,
       models_plan TEXT NOT NULL,
       models_implement TEXT NOT NULL,
       user_name TEXT,
       user_email TEXT,
       user_github_username TEXT,
       environment_default_editor TEXT NOT NULL,
       environment_shell_preference TEXT NOT NULL,
       system_auto_update INTEGER NOT NULL,
       system_log_level TEXT NOT NULL,
       created_at TEXT NOT NULL,
       updated_at TEXT NOT NULL
     );

     -- Enforce singleton pattern
     CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_singleton
     ON settings (id)
     WHERE id = 'singleton';
     ```

5. Implement SQLite SettingsRepository:

   - Create `src/infrastructure/repositories/sqlite/settings.repository.ts`
   - Export class `SQLiteSettingsRepository`
   - Mark with `@injectable()` decorator
   - Implement ISettingsRepository interface
   - Use prepared statements for all queries
   - Implement methods:
     - `initialize()`: Insert default settings with id='singleton'
     - `load()`: SELECT settings WHERE id='singleton'
     - `update(settings)`: UPDATE settings WHERE id='singleton'
   - Map between database columns and TypeSpec-generated Settings type

6. Create DI container configuration:
   - Create `src/infrastructure/di/container.ts`
   - Import tsyringe container
   - Register ISettingsRepository → SQLiteSettingsRepository
   - Register use cases as singletons
   - Export configured container

**Deliverables:**

- src/infrastructure/services/filesystem/shep-directory.service.ts
- src/infrastructure/persistence/sqlite/connection.ts
- src/infrastructure/persistence/sqlite/migrations.ts
- src/infrastructure/persistence/sqlite/migrations/001_create_settings_table.sql
- src/infrastructure/repositories/sqlite/settings.repository.ts
- src/infrastructure/di/container.ts

**Testing:**

- Integration tests for bootstrap service (temp directory)
- Integration tests for database connection (in-memory SQLite)
- Integration tests for migrations (apply and rollback)
- Integration tests for SettingsRepository (CRUD operations)

---

### Phase 5: CLI Integration

**Goal:** Wire up settings initialization and loading at CLI startup.

**Steps:**

1. Update CLI entry point:

   - Import `reflect-metadata` at top of file
   - Import DI container
   - Import InitializeSettingsUseCase
   - Import LoadSettingsUseCase
   - Before Commander setup:
     - Resolve InitializeSettingsUseCase from container
     - Execute initialization (ensures settings exist)
     - Resolve LoadSettingsUseCase from container
     - Load settings into memory
     - Store settings in global/singleton pattern for CLI access

2. Create settings access helper:

   - Create `src/infrastructure/services/settings.service.ts`
   - Singleton pattern for accessing loaded settings
   - Export `getSettings()` function

3. Document settings usage:
   - Update CLAUDE.md with settings initialization flow
   - Document how to access settings in commands
   - Document DI container usage

**Deliverables:**

- src/presentation/cli/index.ts (updated with settings initialization)
- src/infrastructure/services/settings.service.ts
- CLAUDE.md (updated)

**Testing:**

- E2E test for first-run initialization
- E2E test for subsequent runs (settings already exist)
- E2E test for corrupted database recovery

---

### Phase 6: Testing Suite

**Goal:** Comprehensive test coverage for all layers.

**Steps:**

1. Unit tests - Domain:

   - Create `tests/unit/domain/factories/settings-defaults.factory.test.ts`
   - Test default values match TypeSpec model
   - Test all nested models have defaults

2. Unit tests - Application:

   - Create `tests/unit/application/use-cases/initialize-settings.use-case.test.ts`
   - Test initialization creates settings when none exist
   - Test initialization returns existing settings when present
   - Use mock repository

   - Create `tests/unit/application/use-cases/load-settings.use-case.test.ts`
   - Test loading existing settings
   - Test error when settings don't exist
   - Use mock repository

   - Create `tests/unit/application/use-cases/update-settings.use-case.test.ts`
   - Test updating settings
   - Test validation errors
   - Use mock repository

3. Integration tests - Infrastructure:

   - Create `tests/integration/infrastructure/repositories/settings.repository.test.ts`
   - Use in-memory SQLite database
   - Test initialize(), load(), update() methods
   - Test singleton constraint enforcement
   - Test SQL injection prevention (parameterized queries)

   - Create `tests/integration/infrastructure/persistence/migrations.test.ts`
   - Test migration application
   - Test idempotency (running twice doesn't fail)
   - Test user_version tracking

4. E2E tests - CLI:
   - Create `tests/e2e/cli/settings-initialization.test.ts`
   - Test first-run initialization flow
   - Test subsequent runs load settings
   - Test ~/.shep/ directory creation
   - Use temp directory for isolation

**Deliverables:**

- tests/unit/domain/factories/settings-defaults.factory.test.ts
- tests/unit/application/use-cases/\*.test.ts (3 files)
- tests/integration/infrastructure/repositories/settings.repository.test.ts
- tests/integration/infrastructure/persistence/migrations.test.ts
- tests/e2e/cli/settings-initialization.test.ts

**Testing:**

- Run `pnpm test` to verify all tests pass
- Verify test coverage meets project standards

---

### Phase 7: Documentation & Finalization

**Goal:** Update documentation and mark feature complete.

**Steps:**

1. Update CLAUDE.md:

   - Document Settings service architecture
   - Document TypeSpec-first approach
   - Document build flow (generate → build → test)
   - Document DI container usage
   - Add Settings to Data Storage section

2. Update docs/development/ directory:

   - Update `docs/development/cicd.md`:
     - Document `pnpm generate` step in CI/CD pipeline
     - Document TypeSpec compilation in build flow
   - Update `docs/development/tdd-guide.md`:
     - Add section on testing TypeSpec-generated code
     - Add section on testing repositories with in-memory SQLite
   - Create `docs/development/typespec-guide.md`:
     - TypeSpec domain modeling guide
     - Best practices for defining models
     - Code generation workflow

3. Create docs/architecture/ documentation:

   - Create `docs/architecture/settings-service.md`:
     - Complete architecture documentation
     - Layer-by-layer explanation
     - Data flow diagrams
     - Integration examples

4. Update package.json:

   - Verify all dependencies are listed
   - Verify scripts are documented

5. Update spec files:
   - Mark all success criteria as completed in spec.md
   - Update Phase to "Complete" in all spec files (spec.md, research.md, plan.md, tasks.md)

**Deliverables:**

- CLAUDE.md (updated)
- docs/development/cicd.md (updated)
- docs/development/tdd-guide.md (updated)
- docs/development/typespec-guide.md (new)
- docs/architecture/settings-service.md (new)
- specs/005-global-settings-service/\*.md (all updated to Complete phase)

**Testing:**

- Run full validation: `pnpm validate`
- Verify CI pipeline passes
- Manual smoke test: run `shep` command

---

## Files to Create/Modify

### New Files (39 files)

| File                                                                               | Purpose                                  |
| ---------------------------------------------------------------------------------- | ---------------------------------------- |
| **TypeSpec Models**                                                                |                                          |
| `tsp/domain/entities/settings.tsp`                                                 | Settings domain model definition         |
| **Generated Types**                                                                |                                          |
| `src/domain/generated/Settings.ts`                                                 | Generated TypeScript types from TypeSpec |
| `src/domain/generated/ModelConfiguration.ts`                                       | Generated model configuration type       |
| `src/domain/generated/UserProfile.ts`                                              | Generated user profile type              |
| `src/domain/generated/EnvironmentConfig.ts`                                        | Generated environment config type        |
| `src/domain/generated/SystemConfig.ts`                                             | Generated system config type             |
| `src/domain/generated/index.ts`                                                    | Barrel export for generated types        |
| **Domain Layer**                                                                   |                                          |
| `src/domain/factories/settings-defaults.factory.ts`                                | Factory for default settings             |
| `src/domain/factories/index.ts`                                                    | Barrel export for factories              |
| **Application Layer**                                                              |                                          |
| `src/application/ports/output/settings.repository.interface.ts`                    | Repository interface                     |
| `src/application/ports/output/index.ts`                                            | Barrel export for output ports           |
| `src/application/use-cases/settings/initialize-settings.use-case.ts`               | Initialize settings use case             |
| `src/application/use-cases/settings/load-settings.use-case.ts`                     | Load settings use case                   |
| `src/application/use-cases/settings/update-settings.use-case.ts`                   | Update settings use case                 |
| `src/application/use-cases/settings/index.ts`                                      | Barrel export for settings use cases     |
| **Infrastructure Layer**                                                           |                                          |
| `src/infrastructure/services/filesystem/shep-directory.service.ts`                 | ~/.shep/ directory initialization        |
| `src/infrastructure/services/settings.service.ts`                                  | Global settings access singleton         |
| `src/infrastructure/persistence/sqlite/connection.ts`                              | SQLite connection manager                |
| `src/infrastructure/persistence/sqlite/migrations.ts`                              | SQLite migration runner                  |
| `src/infrastructure/persistence/sqlite/migrations/001_create_settings_table.sql`   | Initial migration (settings table)       |
| `src/infrastructure/repositories/sqlite/settings.repository.ts`                    | SQLite settings repository               |
| `src/infrastructure/di/container.ts`                                               | DI container configuration               |
| **Build Configuration**                                                            |                                          |
| `tsp-config.yaml`                                                                  | TypeSpec emitter configuration           |
| **Tests**                                                                          |                                          |
| `tests/unit/domain/factories/settings-defaults.factory.test.ts`                    | Domain factory tests                     |
| `tests/unit/application/use-cases/initialize-settings.use-case.test.ts`            | Initialize use case tests                |
| `tests/unit/application/use-cases/load-settings.use-case.test.ts`                  | Load use case tests                      |
| `tests/unit/application/use-cases/update-settings.use-case.test.ts`                | Update use case tests                    |
| `tests/integration/infrastructure/repositories/sqlite/settings.repository.test.ts` | SQLite repository integration tests      |
| `tests/integration/infrastructure/persistence/sqlite/migrations.test.ts`           | SQLite migration integration tests       |
| `tests/e2e/cli/settings-initialization.test.ts`                                    | CLI E2E tests                            |
| **Test Support**                                                                   |                                          |
| `tests/helpers/database.helper.ts`                                                 | Test database utilities                  |
| `tests/helpers/mock-repository.helper.ts`                                          | Mock repository for unit tests           |
| **Documentation**                                                                  |                                          |
| `docs/development/typespec-guide.md`                                               | TypeSpec domain modeling guide           |
| `docs/architecture/settings-service.md`                                            | Settings service architecture docs       |

### Modified Files (12 files)

| File                            | Changes                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `package.json`                  | Add dependencies (better-sqlite3, migrations, emitter, tsyringe), add generate scripts, add pre-hooks |
| `tsconfig.json`                 | Add experimentalDecorators, emitDecoratorMetadata, @domain/generated path alias                       |
| `tsconfig.build.json`           | Update to include new source directories, exclude tsp/ and apis/                                      |
| `tsp/domain/entities/index.tsp` | Export Settings model                                                                                 |
| `src/presentation/cli/index.ts` | Add settings initialization on startup, import reflect-metadata                                       |
| `.github/workflows/ci.yml`      | Add `pnpm generate` as first step in all jobs                                                         |
| `.husky/pre-commit`             | Add `pnpm generate` before lint-staged                                                                |
| `.lintstagedrc.mjs`             | Include src/domain/generated/ in lint/format                                                          |
| `.gitignore`                    | Add comment about generated files being tracked                                                       |
| `CLAUDE.md`                     | Document Settings service, TypeSpec-first approach, DI container                                      |
| `docs/development/cicd.md`      | Document `pnpm generate` step and TypeSpec compilation in CI/CD                                       |
| `docs/development/tdd-guide.md` | Add sections on testing TypeSpec-generated code and in-memory SQLite                                  |

---

## Testing Strategy

### Unit Tests

**Domain Layer:**

- `settings-defaults.factory.test.ts`:
  - ✓ Factory returns object with all required fields
  - ✓ Default values match TypeSpec model defaults
  - ✓ Nested models (ModelConfiguration, UserProfile, etc.) have defaults
  - ✓ Generated types are used (TypeScript compilation validates)

**Application Layer:**

- `initialize-settings.use-case.test.ts`:

  - ✓ Initializes settings when none exist
  - ✓ Returns existing settings when already initialized
  - ✓ Calls repository.initialize() when needed
  - ✓ Calls repository.load() first to check existence

- `load-settings.use-case.test.ts`:

  - ✓ Loads settings successfully when exist
  - ✓ Throws error when settings don't exist
  - ✓ Returns correct Settings type

- `update-settings.use-case.test.ts`:
  - ✓ Updates settings successfully
  - ✓ Calls repository.update() with correct data
  - ✓ Returns updated settings

### Integration Tests

**Infrastructure Layer:**

- `settings.repository.test.ts`:

  - ✓ initialize() creates settings in database
  - ✓ load() retrieves settings correctly
  - ✓ load() returns null when no settings exist
  - ✓ update() modifies existing settings
  - ✓ Singleton constraint enforced (duplicate insert fails)
  - ✓ Prepared statements prevent SQL injection
  - ✓ Database mapping works correctly (columns ↔ TypeScript)

- `migrations.test.ts`:
  - ✓ Migration creates settings table
  - ✓ Migration is idempotent (safe to run twice)
  - ✓ user_version pragma tracks applied migrations
  - ✓ Migration SQL is valid

### E2E Tests

**CLI Integration:**

- `settings-initialization.test.ts`:
  - ✓ First run creates ~/.shep/ directory
  - ✓ First run creates database file
  - ✓ First run initializes settings with defaults
  - ✓ Second run loads existing settings (doesn't re-initialize)
  - ✓ Settings are accessible globally in CLI
  - ✓ Corrupted database triggers recovery/re-initialization

---

## Risk Mitigation

| Risk                                        | Impact | Mitigation                                                                                                                            |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **TypeSpec emitter breaks with updates**    | High   | Pin to specific version, test upgrades in separate branch, have fallback to manual types                                              |
| **better-sqlite3 native compilation fails** | High   | Document build requirements (Python, C++ compiler), provide prebuilt binaries for common platforms, fallback to node:sqlite in future |
| **DI container adds complexity**            | Medium | Extensive documentation, simple registration pattern, provide examples in CLAUDE.md                                                   |
| **Migration system fails**                  | Medium | Comprehensive integration tests, idempotent migrations, manual SQL rollback documented                                                |
| **~/.shep/ permission issues**              | Medium | Graceful error handling, clear error messages, document manual directory creation                                                     |
| **Settings corruption**                     | Low    | Validation before save, backup mechanism (future), re-initialization recovery flow                                                    |
| **Generated types don't match runtime**     | Medium | Runtime validation with zod (future), integration tests verify mapping, TypeSpec defaults match factory                               |

---

## Rollback Plan

### If TypeSpec generation fails:

1. Revert tsp-config.yaml
2. Create manual TypeScript interfaces in `src/domain/entities/settings.ts`
3. Remove generate scripts from package.json
4. Continue with manual type definitions

### If better-sqlite3 has issues:

1. Switch to node:sqlite (Node 22+ built-in)
2. Update database.ts to use node:sqlite API
3. Re-test with new SQLite driver
4. Update documentation

### If DI container causes problems:

1. Remove tsyringe dependency
2. Switch to manual constructor injection
3. Update use cases to accept repository in constructor
4. Wire dependencies manually in CLI bootstrap

### If migrations fail:

1. Implement simple version tracking with settings table column
2. Apply migrations manually in database.ts initialization
3. Document manual migration process

### Complete rollback:

1. Revert all changes to main branch
2. Delete feature branch
3. Close spec and start fresh with simplified approach

---

_Updated by `/shep-kit:plan` — see tasks.md for detailed breakdown_
