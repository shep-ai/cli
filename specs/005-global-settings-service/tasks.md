# Tasks: global-settings-service

> Task breakdown for 005-global-settings-service

## Status

- **Phase:** Complete
- **Completed:** 2026-02-04 (Phase 8 - Documentation & Finalization)
- **Updated:** 2026-02-04

## Task List

### Phase 1: Build Pipeline & Code Generation Setup (Foundational - No Tests) ✅ COMPLETE

- [x] Install dependencies: `better-sqlite3`, `@blackglory/better-sqlite3-migrations`, `@typespec-tools/emitter-typescript`, `tsyringe`, `reflect-metadata`
- [x] Update tsconfig.json: Add `experimentalDecorators: true` and `emitDecoratorMetadata: true`
- [x] Update tsconfig.json: Add path alias `"@domain/generated/*": ["src/domain/generated/*"]`
- [x] Create tsp-config.yaml with @typespec-tools/emitter-typescript emitter configuration
- [x] Update package.json: Add `generate` script that runs `tsp:codegen`
- [x] Update package.json: Add `tsp:codegen` script that runs `tsp emit --emit @typespec-tools/emitter-typescript`
- [x] Update package.json: Add `prebuild`, `pretest`, `prelint` hooks to run `pnpm generate`
- [x] Update .github/workflows/ci.yml: Add `pnpm generate` as first step in all jobs
- [x] Update .husky/pre-commit: Add `pnpm generate` before lint-staged
- [x] Update .lintstagedrc.mjs: Include `src/domain/generated/**/*.ts` in lint/format
- [x] Update .gitignore: Ensure `src/domain/generated/` is tracked (not ignored), add comment
- [x] Test: Run `pnpm generate` manually to verify TypeSpec compilation works
- [x] Fix: ESLint ignore patterns for nested directories (`**/.next/**`, `**/storybook-static/**`)
- [x] Fix: Prettier auto-formatting in `tsp:codegen` script
- [x] Fix: Docker build with TypeSpec files in build context

### Phase 2: TypeSpec Settings Model & Generation (Foundational - No Tests) ✅ COMPLETE

- [x] Create tsp/domain/entities/settings.tsp with Settings model extending BaseEntity
- [x] Define ModelConfiguration nested model (analyze, requirements, plan, implement with defaults)
- [x] Define UserProfile nested model (name, email, githubUsername - all optional)
- [x] Define EnvironmentConfig nested model (defaultEditor="vscode", shellPreference="bash")
- [x] Define SystemConfig nested model (autoUpdate=true, logLevel="info")
- [x] Update tsp/domain/entities/index.tsp to export Settings model
- [x] Run `pnpm generate` and verify TypeScript types generated in src/domain/generated/
- [x] Verify generated files: Settings.ts, ModelConfiguration.ts, UserProfile.ts, EnvironmentConfig.ts, SystemConfig.ts, index.ts
- [x] All CI/CD checks passing (12/12 jobs green)

### Phase 3: Domain Layer - Defaults Factory (TDD Cycle 1) ✅ COMPLETE

**RED (Write Failing Tests First):**

- [x] Create tests/unit/domain/factories/settings-defaults.factory.test.ts
- [x] Write test: factory returns object with all required fields
- [x] Write test: default values match TypeSpec model defaults
- [x] Write test: nested models (ModelConfiguration, UserProfile, etc.) have defaults
- [x] Write test: generated types are used correctly (TypeScript compilation validates)
- [x] Verify ALL tests FAIL (factory doesn't exist yet)

**GREEN (Write Minimal Code to Pass Tests):**

- [x] Create src/domain/factories/settings-defaults.factory.ts using generated types
- [x] Implement factory function returning default Settings object
- [x] Match defaults from TypeSpec model
- [x] Create src/domain/factories/index.ts barrel export
- [x] Verify ALL tests PASS (15/15 tests passing)

**REFACTOR (Clean Up While Keeping Tests Green):**

- [x] Extract default value constants (DEFAULT_MODEL, DEFAULT_EDITOR, DEFAULT_SHELL, DEFAULT_LOG_LEVEL)
- [x] Improve factory structure for readability
- [x] Verify ALL tests still PASS (15/15 tests passing)

### Phase 4: Application Layer - Use Cases (TDD Cycle 2) ✅ COMPLETE

**RED (Write Failing Tests First):**

- [x] Create tests/helpers/mock-repository.helper.ts (mock ISettingsRepository)
- [x] Create tests/unit/application/use-cases/initialize-settings.use-case.test.ts
- [x] Write test: initializes settings when none exist
- [x] Write test: returns existing settings when already initialized
- [x] Write test: calls repository.initialize() when needed
- [x] Write test: calls repository.load() first to check existence
- [x] Create tests/unit/application/use-cases/load-settings.use-case.test.ts
- [x] Write test: loads settings successfully when exist
- [x] Write test: throws error when settings don't exist
- [x] Write test: returns correct Settings type
- [x] Create tests/unit/application/use-cases/update-settings.use-case.test.ts
- [x] Write test: updates settings successfully
- [x] Write test: calls repository.update() with correct data
- [x] Write test: returns updated settings
- [x] Verify ALL tests FAIL (use cases don't exist yet)

**GREEN (Write Minimal Code to Pass Tests):**

- [x] Create src/application/ports/output/settings.repository.interface.ts with ISettingsRepository interface
- [x] Define initialize(), load(), update() methods in ISettingsRepository using generated Settings type
- [x] Create src/application/ports/output/index.ts barrel export
- [x] Create src/application/use-cases/settings/initialize-settings.use-case.ts with @injectable decorator
- [x] Implement InitializeSettingsUseCase.execute() method (check existence, create if missing)
- [x] Create src/application/use-cases/settings/load-settings.use-case.ts with @injectable decorator
- [x] Implement LoadSettingsUseCase.execute() method (load, throw if missing)
- [x] Create src/application/use-cases/settings/update-settings.use-case.ts with @injectable decorator
- [x] Implement UpdateSettingsUseCase.execute(settings) method (validate, update, return)
- [x] Create src/application/use-cases/settings/index.ts barrel export
- [x] Verify ALL tests PASS (26/26 tests passing)

**REFACTOR (Clean Up While Keeping Tests Green):**

- [x] Extract validation logic to separate functions if needed
- [x] Improve error messages for clarity
- [x] Verify ALL tests still PASS (26/26 tests passing)

### Phase 5: Infrastructure - Persistence Layer (TDD Cycle 3) ✅ COMPLETE

**RED (Write Failing Tests First):**

- [x] Create tests/helpers/database.helper.ts for test database utilities (in-memory SQLite)
- [x] Create tests/integration/infrastructure/persistence/sqlite/migrations.test.ts
- [x] Write test: migration creates settings table
- [x] Write test: migration is idempotent (safe to run twice)
- [x] Write test: user_version pragma tracks applied migrations
- [x] Write test: migration SQL is valid
- [x] Verify ALL tests FAIL (persistence layer doesn't exist yet)

**GREEN (Write Minimal Code to Pass Tests):**

- [x] Create src/infrastructure/services/filesystem/shep-directory.service.ts for ~/.shep/ directory initialization
- [x] Implement shep-directory service: ensureShepDirectory() with 700 permissions, graceful error handling
- [x] Create src/infrastructure/persistence/sqlite/connection.ts with getSQLiteConnection() singleton
- [x] Implement SQLite connection: better-sqlite3 to ~/.shep/data with pragmas (WAL, NORMAL, foreign_keys, defensive)
- [x] Create src/infrastructure/persistence/sqlite/migrations.ts with runSQLiteMigrations() function
- [x] Implement manual migration system (replaced @blackglory/better-sqlite3-migrations)
- [x] Create src/infrastructure/persistence/sqlite/migrations/001_create_settings_table.sql
- [x] Define settings table schema with all columns (flatten nested objects)
- [x] Add UNIQUE INDEX for singleton pattern (PRIMARY KEY on id)
- [x] Verify ALL tests PASS (13/13 tests passing)

**REFACTOR (Clean Up While Keeping Tests Green):**

- [x] Optimize pragma settings based on performance testing
- [x] Improve error handling in filesystem service
- [x] Verify ALL tests still PASS (13/13 tests passing)

### Phase 6: Infrastructure - Repository Layer (TDD Cycle 4) ✅ COMPLETE

**RED (Write Failing Tests First):** ✅

- [x] Create tests/integration/infrastructure/repositories/sqlite-settings.repository.test.ts (use in-memory DB)
- [x] Write test: initialize() creates settings in database
- [x] Write test: load() retrieves settings correctly
- [x] Write test: load() returns null when no settings exist
- [x] Write test: update() modifies existing settings
- [x] Write test: singleton constraint enforced (duplicate insert fails)
- [x] Write test: prepared statements prevent SQL injection
- [x] Write test: database mapping works correctly (columns ↔ TypeScript)
- [x] Verify ALL tests FAIL (repository doesn't exist yet)

**GREEN (Write Minimal Code to Pass Tests):** ✅

- [x] Create src/infrastructure/repositories/sqlite-settings.repository.ts with @injectable decorator
- [x] Implement SQLiteSettingsRepository.initialize() method with prepared statement
- [x] Implement SQLiteSettingsRepository.load() method with prepared statement
- [x] Implement SQLiteSettingsRepository.update() method with prepared statement
- [x] Implement database column ↔ TypeScript object mapping (flatten/unflatten)
- [x] ~~Create src/infrastructure/di/container.ts and configure tsyringe container~~ (Deferred to Phase 7 CLI integration)
- [x] ~~Register ISettingsRepository → SQLiteSettingsRepository in container~~ (Deferred to Phase 7 CLI integration)
- [x] ~~Register use cases as singletons in container~~ (Deferred to Phase 7 CLI integration)
- [x] Verify ALL tests PASS (32/32 integration tests passing)

**REFACTOR (Clean Up While Keeping Tests Green):** ✅

- [x] Extract mapping functions to separate helpers (src/infrastructure/persistence/sqlite/mappers/settings.mapper.ts)
- [x] Optimize SQL queries for performance (prepared statements with named parameters)
- [x] Verify ALL tests still PASS (141/141 tests passing)

### Phase 7: CLI Integration (TDD Cycle 5) ✅ COMPLETE

**RED (Write Failing Tests First):** ✅

- [x] Create tests/e2e/cli/settings-initialization.test.ts (use temp directory)
- [x] Write test: first run creates ~/.shep/ directory
- [x] Write test: first run creates database file
- [x] Write test: first run initializes settings with defaults
- [x] Write test: second run loads existing settings (doesn't re-initialize)
- [x] Write test: settings are accessible globally in CLI
- [x] Write test: corrupted database triggers recovery/re-initialization
- [x] Verify ALL tests FAIL (8/11 tests failing as expected)

**GREEN (Write Minimal Code to Pass Tests):** ✅

- [x] Create src/infrastructure/di/container.ts with async initializeContainer()
- [x] Configure tsyringe container: register Database, ISettingsRepository, use cases
- [x] Update src/presentation/cli/index.ts: Import reflect-metadata at top
- [x] Create async bootstrap() function wrapping CLI initialization
- [x] Initialize DI container and run migrations in bootstrap
- [x] Resolve InitializeSettingsUseCase and execute to load/create settings
- [x] Create src/infrastructure/services/settings.service.ts singleton service
- [x] Implement initializeSettings(), getSettings(), hasSettings() functions
- [x] Verify ALL tests PASS (11/11 E2E tests passing, 152/152 total)

**REFACTOR (Clean Up While Keeping Tests Green):** ✅

- [x] Extract initialization logic to separate bootstrap function (already done in GREEN)
- [x] Improve error handling with specific error messages for database vs settings failures
- [x] Fix ESLint errors (require() imports, unused variables, empty functions)
- [x] Verify ALL tests still PASS (152/152 tests passing)

### Phase 8: Documentation & Finalization ✅ COMPLETE

- [x] Update CLAUDE.md: Document settings initialization flow
- [x] Update CLAUDE.md: Document DI container usage pattern
- [x] Update CLAUDE.md: Add Settings to Data Storage section
- [x] Update CLAUDE.md: Document TypeSpec-first architecture approach
- [x] Update CLAUDE.md: Document build flow (tsp:compile → build → test)
- [x] Update docs/development/cicd.md: Document `pnpm tsp:compile` step in CI/CD pipeline
- [x] Update docs/development/cicd.md: Document TypeSpec compilation in build flow
- [x] Update docs/development/tdd-guide.md: Add section on testing TypeSpec-generated code
- [x] Update docs/development/tdd-guide.md: Add section on testing repositories with in-memory SQLite
- [x] Create docs/development/typespec-guide.md: TypeSpec domain modeling guide
- [x] Create docs/architecture/settings-service.md: Settings service architecture documentation
- [x] Verify package.json scripts are documented (in CLAUDE.md)
- [x] Update spec.md: Mark all success criteria as completed
- [x] Update spec.md: Change Phase to "Complete"
- [x] Update tasks.md: Change Phase to "Complete"
- [x] Run `pnpm validate` (lint, format, typecheck, tsp:compile) ✅ All passing
- [x] Manual smoke test: Run `shep` command to verify settings initialization ✅ Working
- [x] Run all tests: `pnpm test` ✅ 152/152 tests passing
- [ ] Verify CI pipeline passes on feature branch (requires push)

## TDD Notes

**MANDATORY TDD Workflow:**

- **RED**: Write failing test FIRST (never skip this!)
- **GREEN**: Write minimal code to pass test
- **REFACTOR**: Improve code while keeping tests green
- Tests are written BEFORE implementation, not after
- Each TDD cycle is independently reviewable

**Phase Structure:**

- **Phase 1-2**: Foundational (no tests - build pipeline and TypeSpec models)
- **Phase 3**: TDD Cycle 1 (Domain Layer)
- **Phase 4**: TDD Cycle 2 (Application Layer)
- **Phase 5**: TDD Cycle 3 (Persistence Layer)
- **Phase 6**: TDD Cycle 4 (Repository Layer)
- **Phase 7**: TDD Cycle 5 (CLI Integration)
- **Phase 8**: Documentation (no tests)

## Parallelization Notes

- Phase 1 and 2 can run sequentially (foundational setup)
- Within Phase 2: TypeSpec model creation can happen in parallel after build pipeline is ready
- Within Phase 4 RED: All three use case test files can be written in parallel
- Within Phase 5 GREEN: shep-directory.service, connection.ts, migrations.ts can be developed concurrently
- Phase 8 documentation tasks can run in parallel

## Acceptance Checklist

Feature complete:

- [x] All tasks completed
- [x] Tests passing (`pnpm test`) ✅ 152/152 tests passing
- [x] Linting clean (`pnpm lint`)
- [x] Format clean (`pnpm format`)
- [x] Types valid (`pnpm typecheck`)
- [x] TypeSpec valid (`pnpm tsp:compile`)
- [ ] CI pipeline passes (requires push to verify)
- [x] Documentation updated (CLAUDE.md, docs/)
- [x] All spec files marked as "Complete" phase
- [x] TDD workflow followed for ALL implementation phases (RED → GREEN → REFACTOR)

---

_Task breakdown for TDD-compliant implementation tracking_
