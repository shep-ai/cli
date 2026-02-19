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
│  │                                                             │   │
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

**MANDATORY TDD**: All implementation phases MUST follow RED-GREEN-REFACTOR cycles.

### Phase 1: Build Pipeline & Code Generation Setup (Foundational - No Tests)

**Goal:** Establish TypeSpec → TypeScript generation pipeline with proper build flow orchestration.

**Steps:**

1. Install dependencies (better-sqlite3, migrations, emitter, tsyringe, reflect-metadata)
2. Configure TypeScript for decorators (experimentalDecorators, emitDecoratorMetadata)
3. Create TypeSpec emitter config (tsp-config.yaml)
4. Add build scripts to package.json (generate, tsp:codegen, pre-hooks)
5. Update CI/CD pipeline (.github/workflows/ci.yml)
6. Update pre-commit hooks (.husky/pre-commit, .lintstagedrc.mjs)
7. Update tsconfig.json path alias (@domain/generated/\*)
8. Update .gitignore (track generated files)

**Deliverables:**

- package.json (updated with dependencies and scripts)
- tsp-config.yaml (created)
- tsconfig.json (updated with decorators + path alias)
- .github/workflows/ci.yml (updated)
- .husky/pre-commit (updated)
- .lintstagedrc.mjs (updated)
- .gitignore (updated)

**Testing:**

- Run `pnpm generate` manually to verify TypeSpec compilation
- Verify CI pipeline runs generate first

---

### Phase 2: TypeSpec Settings Model & Generation (Foundational - No Tests)

**Goal:** Define Settings domain model in TypeSpec and generate TypeScript types.

**Steps:**

1. Create tsp/domain/entities/settings.tsp with Settings model
2. Define nested models (ModelConfiguration, UserProfile, EnvironmentConfig, SystemConfig)
3. Set sane defaults for all fields
4. Export Settings from tsp/domain/entities/index.tsp
5. Run `pnpm generate` to create TypeScript types
6. Verify output in src/domain/generated/

**Deliverables:**

- tsp/domain/entities/settings.tsp (new TypeSpec model)
- tsp/domain/entities/index.tsp (updated)
- src/domain/generated/Settings.ts (generated)
- src/domain/generated/ModelConfiguration.ts (generated)
- src/domain/generated/UserProfile.ts (generated)
- src/domain/generated/EnvironmentConfig.ts (generated)
- src/domain/generated/SystemConfig.ts (generated)
- src/domain/generated/index.ts (generated barrel export)

**Testing:**

- Verify `pnpm generate` produces valid TypeScript
- Verify TypeScript compiler accepts generated types

---

### Phase 3: Domain Layer - Defaults Factory (TDD Cycle 1)

**Goal:** Create factory for default settings with TDD.

**TDD Workflow:**

1. **RED**: Write failing tests first
   - Create tests/unit/domain/factories/settings-defaults.factory.test.ts
   - Test: factory returns object with all required fields
   - Test: default values match TypeSpec model defaults
   - Test: nested models have defaults
   - Test: generated types are used correctly
   - **All tests FAIL** (factory doesn't exist yet)

2. **GREEN**: Write minimal code to pass tests
   - Create src/domain/factories/settings-defaults.factory.ts
   - Implement factory function using generated types
   - Return Settings object with defaults matching TypeSpec
   - Create src/domain/factories/index.ts barrel export
   - **All tests PASS**

3. **REFACTOR**: Clean up while keeping tests green
   - Extract default value constants if needed
   - Improve factory structure
   - **All tests still PASS**

**Deliverables:**

- tests/unit/domain/factories/settings-defaults.factory.test.ts (TEST FIRST)
- src/domain/factories/settings-defaults.factory.ts (implementation)
- src/domain/factories/index.ts (barrel export)

---

### Phase 4: Application Layer - Use Cases (TDD Cycle 2)

**Goal:** Define repository interface and implement use cases using TDD.

**TDD Workflow:**

1. **RED**: Write failing tests first
   - Create tests/helpers/mock-repository.helper.ts (mock ISettingsRepository)
   - Create tests/unit/application/use-cases/initialize-settings.use-case.test.ts
     - Test: initializes settings when none exist
     - Test: returns existing settings when present
   - Create tests/unit/application/use-cases/load-settings.use-case.test.ts
     - Test: loads settings successfully
     - Test: throws error when settings don't exist
   - Create tests/unit/application/use-cases/update-settings.use-case.test.ts
     - Test: updates settings successfully
     - Test: validates settings
   - **All tests FAIL** (use cases don't exist yet)

2. **GREEN**: Write minimal code to pass tests
   - Create src/application/ports/output/settings.repository.interface.ts
   - Define ISettingsRepository (initialize, load, update methods)
   - Create src/application/ports/output/index.ts barrel export
   - Create src/application/use-cases/settings/initialize-settings.use-case.ts
   - Implement InitializeSettingsUseCase with @injectable decorator
   - Create src/application/use-cases/settings/load-settings.use-case.ts
   - Implement LoadSettingsUseCase with @injectable decorator
   - Create src/application/use-cases/settings/update-settings.use-case.ts
   - Implement UpdateSettingsUseCase with @injectable decorator
   - Create src/application/use-cases/settings/index.ts barrel export
   - **All tests PASS**

3. **REFACTOR**: Clean up while keeping tests green
   - Extract validation logic if needed
   - Improve error messages
   - **All tests still PASS**

**Deliverables:**

- tests/helpers/mock-repository.helper.ts (TEST HELPER FIRST)
- tests/unit/application/use-cases/\*.test.ts (TESTS FIRST - 3 files)
- src/application/ports/output/settings.repository.interface.ts (implementation)
- src/application/ports/output/index.ts (barrel export)
- src/application/use-cases/settings/\*.use-case.ts (implementation - 3 files)
- src/application/use-cases/settings/index.ts (barrel export)

---

### Phase 5: Infrastructure - Persistence Layer (TDD Cycle 3)

**Goal:** Implement SQLite connection, migrations, and filesystem service using TDD.

**TDD Workflow:**

1. **RED**: Write failing tests first
   - Create tests/integration/infrastructure/persistence/sqlite/migrations.test.ts
     - Test: migration creates settings table
     - Test: migration is idempotent (safe to run twice)
     - Test: user_version pragma tracks applied migrations
     - Test: migration SQL is valid
   - Create tests/helpers/database.helper.ts (in-memory SQLite for tests)
   - **All tests FAIL** (persistence layer doesn't exist yet)

2. **GREEN**: Write minimal code to pass tests
   - Create src/infrastructure/services/filesystem/shep-directory.service.ts
   - Implement ensureShepDirectory() with 700 permissions
   - Create src/infrastructure/persistence/sqlite/connection.ts
   - Implement getSQLiteConnection() singleton with pragmas
   - Create src/infrastructure/persistence/sqlite/migrations.ts
   - Implement runSQLiteMigrations() with @blackglory/better-sqlite3-migrations
   - Create src/infrastructure/persistence/sqlite/migrations/001_create_settings_table.sql
   - Define settings table schema with UNIQUE INDEX
   - **All tests PASS**

3. **REFACTOR**: Clean up while keeping tests green
   - Optimize pragma settings
   - Improve error handling
   - **All tests still PASS**

**Deliverables:**

- tests/helpers/database.helper.ts (TEST HELPER FIRST)
- tests/integration/infrastructure/persistence/sqlite/migrations.test.ts (TEST FIRST)
- src/infrastructure/services/filesystem/shep-directory.service.ts (implementation)
- src/infrastructure/persistence/sqlite/connection.ts (implementation)
- src/infrastructure/persistence/sqlite/migrations.ts (implementation)
- src/infrastructure/persistence/sqlite/migrations/001_create_settings_table.sql (migration SQL)

---

### Phase 6: Infrastructure - Repository Layer (TDD Cycle 4)

**Goal:** Implement SQLite settings repository and DI container using TDD.

**TDD Workflow:**

1. **RED**: Write failing tests first
   - Create tests/integration/infrastructure/repositories/sqlite/settings.repository.test.ts
     - Test: initialize() creates settings in database
     - Test: load() retrieves settings correctly
     - Test: load() returns null when no settings exist
     - Test: update() modifies existing settings
     - Test: singleton constraint enforced (duplicate insert fails)
     - Test: prepared statements prevent SQL injection
     - Test: database mapping works correctly (columns ↔ TypeScript)
   - **All tests FAIL** (repository doesn't exist yet)

2. **GREEN**: Write minimal code to pass tests
   - Create src/infrastructure/repositories/sqlite/settings.repository.ts
   - Implement SQLiteSettingsRepository with @injectable decorator
   - Implement ISettingsRepository interface (initialize, load, update)
   - Use prepared statements for all queries
   - Map between database columns and TypeSpec-generated Settings type
   - Create src/infrastructure/di/container.ts
   - Configure tsyringe container
   - Register ISettingsRepository → SQLiteSettingsRepository
   - Register use cases as singletons
   - **All tests PASS**

3. **REFACTOR**: Clean up while keeping tests green
   - Extract mapping functions
   - Optimize SQL queries
   - **All tests still PASS**

**Deliverables:**

- tests/integration/infrastructure/repositories/sqlite/settings.repository.test.ts (TEST FIRST)
- src/infrastructure/repositories/sqlite/settings.repository.ts (implementation)
- src/infrastructure/di/container.ts (DI configuration)

---

### Phase 7: CLI Integration (TDD Cycle 5)

**Goal:** Wire up settings initialization and loading at CLI startup using TDD.

**TDD Workflow:**

1. **RED**: Write failing tests first
   - Create tests/e2e/cli/settings-initialization.test.ts
     - Test: first run creates ~/.shep/ directory
     - Test: first run creates database file
     - Test: first run initializes settings with defaults
     - Test: second run loads existing settings (doesn't re-initialize)
     - Test: settings are accessible globally in CLI
     - Test: corrupted database triggers recovery/re-initialization
   - **All tests FAIL** (CLI integration doesn't exist yet)

2. **GREEN**: Write minimal code to pass tests
   - Update src/presentation/cli/index.ts
   - Import reflect-metadata at top
   - Import DI container and use cases
   - Resolve InitializeSettingsUseCase and execute before Commander setup
   - Resolve LoadSettingsUseCase and load settings
   - Create src/infrastructure/services/settings.service.ts
   - Implement getSettings() singleton for global access
   - **All tests PASS**

3. **REFACTOR**: Clean up while keeping tests green
   - Extract initialization logic to separate function
   - Improve error handling
   - **All tests still PASS**

**Deliverables:**

- tests/e2e/cli/settings-initialization.test.ts (TEST FIRST)
- src/presentation/cli/index.ts (updated with settings initialization)
- src/infrastructure/services/settings.service.ts (settings access singleton)

---

### Phase 8: Documentation & Finalization

**Goal:** Update documentation and mark feature complete.

**Steps:**

1. Update CLAUDE.md
   - Document Settings service architecture
   - Document TypeSpec-first approach
   - Document build flow (generate → build → test)
   - Document DI container usage
   - Add Settings to Data Storage section

2. Update docs/development/ directory
   - Update docs/development/cicd.md (document pnpm generate step)
   - Update docs/development/tdd-guide.md (TypeSpec-generated code testing)
   - Create docs/development/typespec-guide.md (TypeSpec modeling guide)

3. Create docs/architecture/ documentation
   - Create docs/architecture/settings-service.md (complete architecture docs)

4. Update spec files
   - Mark all success criteria as completed in spec.md
   - Update Phase to "Complete" in all spec files

5. Final verification
   - Run `pnpm validate` (lint, format, typecheck, tsp:compile)
   - Verify CI pipeline passes
   - Manual smoke test: run `shep` command

**Deliverables:**

- CLAUDE.md (updated)
- docs/development/cicd.md (updated)
- docs/development/tdd-guide.md (updated)
- docs/development/typespec-guide.md (new)
- docs/architecture/settings-service.md (new)
- specs/005-global-settings-service/\*.md (all updated to Complete phase)

---

## Files to Create/Modify

### New Files (39 files)

| File                                                                               | Purpose                                    |
| ---------------------------------------------------------------------------------- | ------------------------------------------ |
| **TypeSpec Models**                                                                |                                            |
| `tsp/domain/entities/settings.tsp`                                                 | Settings domain model definition           |
| **Generated Types (from TypeSpec)**                                                |                                            |
| `src/domain/generated/Settings.ts`                                                 | Generated TypeScript types from TypeSpec   |
| `src/domain/generated/ModelConfiguration.ts`                                       | Generated model configuration type         |
| `src/domain/generated/UserProfile.ts`                                              | Generated user profile type                |
| `src/domain/generated/EnvironmentConfig.ts`                                        | Generated environment config type          |
| `src/domain/generated/SystemConfig.ts`                                             | Generated system config type               |
| `src/domain/generated/index.ts`                                                    | Barrel export for generated types          |
| **Domain Layer**                                                                   |                                            |
| `src/domain/factories/settings-defaults.factory.ts`                                | Factory for default settings               |
| `src/domain/factories/index.ts`                                                    | Barrel export for factories                |
| **Application Layer**                                                              |                                            |
| `src/application/ports/output/settings.repository.interface.ts`                    | Repository interface                       |
| `src/application/ports/output/index.ts`                                            | Barrel export for output ports             |
| `src/application/use-cases/settings/initialize-settings.use-case.ts`               | Initialize settings use case               |
| `src/application/use-cases/settings/load-settings.use-case.ts`                     | Load settings use case                     |
| `src/application/use-cases/settings/update-settings.use-case.ts`                   | Update settings use case                   |
| `src/application/use-cases/settings/index.ts`                                      | Barrel export for settings use cases       |
| **Infrastructure Layer**                                                           |                                            |
| `src/infrastructure/services/filesystem/shep-directory.service.ts`                 | ~/.shep/ directory initialization          |
| `src/infrastructure/services/settings.service.ts`                                  | Global settings access singleton           |
| `src/infrastructure/persistence/sqlite/connection.ts`                              | SQLite connection manager                  |
| `src/infrastructure/persistence/sqlite/migrations.ts`                              | SQLite migration runner                    |
| `src/infrastructure/persistence/sqlite/migrations/001_create_settings_table.sql`   | Initial migration (settings table)         |
| `src/infrastructure/repositories/sqlite/settings.repository.ts`                    | SQLite settings repository                 |
| `src/infrastructure/di/container.ts`                                               | DI container configuration                 |
| **Build Configuration**                                                            |                                            |
| `tsp-config.yaml`                                                                  | TypeSpec emitter configuration             |
| **Tests (ALL WRITTEN FIRST in TDD cycles)**                                        |                                            |
| `tests/helpers/database.helper.ts`                                                 | Test database utilities (in-memory DB)     |
| `tests/helpers/mock-repository.helper.ts`                                          | Mock repository for unit tests             |
| `tests/unit/domain/factories/settings-defaults.factory.test.ts`                    | Domain factory tests (TDD Cycle 1)         |
| `tests/unit/application/use-cases/initialize-settings.use-case.test.ts`            | Initialize use case tests (TDD Cycle 2)    |
| `tests/unit/application/use-cases/load-settings.use-case.test.ts`                  | Load use case tests (TDD Cycle 2)          |
| `tests/unit/application/use-cases/update-settings.use-case.test.ts`                | Update use case tests (TDD Cycle 2)        |
| `tests/integration/infrastructure/persistence/sqlite/migrations.test.ts`           | Migration integration tests (TDD Cycle 3)  |
| `tests/integration/infrastructure/repositories/sqlite/settings.repository.test.ts` | Repository integration tests (TDD Cycle 4) |
| `tests/e2e/cli/settings-initialization.test.ts`                                    | CLI E2E tests (TDD Cycle 5)                |
| **Documentation**                                                                  |                                            |
| `docs/development/typespec-guide.md`                                               | TypeSpec domain modeling guide             |
| `docs/architecture/settings-service.md`                                            | Settings service architecture docs         |

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

## Testing Strategy (TDD: Tests FIRST)

**CRITICAL:** Tests are written FIRST in each TDD cycle, never after implementation.

### Unit Tests (TDD Cycle 1 & 2)

**Phase 3 - Domain Layer (RED → GREEN → REFACTOR):**

- settings-defaults.factory.test.ts (written FIRST)
  - Factory returns object with all required fields
  - Default values match TypeSpec model defaults
  - Nested models have defaults
  - Generated types are used correctly

**Phase 4 - Application Layer (RED → GREEN → REFACTOR):**

- initialize-settings.use-case.test.ts (written FIRST)
  - Initializes settings when none exist
  - Returns existing settings when present
  - Calls repository methods correctly
- load-settings.use-case.test.ts (written FIRST)
  - Loads settings successfully
  - Throws error when settings don't exist
- update-settings.use-case.test.ts (written FIRST)
  - Updates settings successfully
  - Validates settings correctly

### Integration Tests (TDD Cycle 3 & 4)

**Phase 5 - Persistence Layer (RED → GREEN → REFACTOR):**

- migrations.test.ts (written FIRST with in-memory DB)
  - Migration creates settings table
  - Migration is idempotent
  - user_version pragma tracking
  - Migration SQL is valid

**Phase 6 - Repository Layer (RED → GREEN → REFACTOR):**

- settings.repository.test.ts (written FIRST with in-memory DB)
  - initialize() creates settings in database
  - load() retrieves settings correctly
  - load() returns null when no settings exist
  - update() modifies existing settings
  - Singleton constraint enforced
  - Prepared statements prevent SQL injection
  - Database mapping works correctly

### E2E Tests (TDD Cycle 5)

**Phase 7 - CLI Integration (RED → GREEN → REFACTOR):**

- settings-initialization.test.ts (written FIRST)
  - First run creates ~/.shep/ directory
  - First run creates database file
  - First run initializes settings with defaults
  - Second run loads existing settings
  - Settings accessible globally
  - Corrupted database recovery

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

_Updated by `/shep-kit:plan` (TDD-compliant) — see tasks.md for detailed TDD breakdown_
