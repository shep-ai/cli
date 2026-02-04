# Tasks: global-settings-service

> Task breakdown for 005-global-settings-service

## Status

- **Phase:** Implementation
- **Current Phase:** Phase 4 - Application Layer - Use Cases (TDD Cycle 2)
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

### Phase 5: Infrastructure - Persistence Layer (TDD Cycle 3)

**RED (Write Failing Tests First):**

- [ ] Create tests/helpers/database.helper.ts for test database utilities (in-memory SQLite)
- [ ] Create tests/integration/infrastructure/persistence/sqlite/migrations.test.ts
- [ ] Write test: migration creates settings table
- [ ] Write test: migration is idempotent (safe to run twice)
- [ ] Write test: user_version pragma tracks applied migrations
- [ ] Write test: migration SQL is valid
- [ ] Verify ALL tests FAIL (persistence layer doesn't exist yet)

**GREEN (Write Minimal Code to Pass Tests):**

- [ ] Create src/infrastructure/services/filesystem/shep-directory.service.ts for ~/.shep/ directory initialization
- [ ] Implement shep-directory service: ensureShepDirectory() with 700 permissions, graceful error handling
- [ ] Create src/infrastructure/persistence/sqlite/connection.ts with getSQLiteConnection() singleton
- [ ] Implement SQLite connection: better-sqlite3 to ~/.shep/data with pragmas (WAL, NORMAL, foreign_keys, defensive)
- [ ] Create src/infrastructure/persistence/sqlite/migrations.ts with runSQLiteMigrations() function
- [ ] Integrate @blackglory/better-sqlite3-migrations library in SQLite migrations.ts
- [ ] Create src/infrastructure/persistence/sqlite/migrations/001_create_settings_table.sql
- [ ] Define settings table schema with all columns (flatten nested objects)
- [ ] Add UNIQUE INDEX for singleton pattern (id='singleton')
- [ ] Verify ALL tests PASS

**REFACTOR (Clean Up While Keeping Tests Green):**

- [ ] Optimize pragma settings based on performance testing
- [ ] Improve error handling in filesystem service
- [ ] Verify ALL tests still PASS

### Phase 6: Infrastructure - Repository Layer (TDD Cycle 4)

**RED (Write Failing Tests First):**

- [ ] Create tests/integration/infrastructure/repositories/sqlite/settings.repository.test.ts (use in-memory DB)
- [ ] Write test: initialize() creates settings in database
- [ ] Write test: load() retrieves settings correctly
- [ ] Write test: load() returns null when no settings exist
- [ ] Write test: update() modifies existing settings
- [ ] Write test: singleton constraint enforced (duplicate insert fails)
- [ ] Write test: prepared statements prevent SQL injection
- [ ] Write test: database mapping works correctly (columns ↔ TypeScript)
- [ ] Verify ALL tests FAIL (repository doesn't exist yet)

**GREEN (Write Minimal Code to Pass Tests):**

- [ ] Create src/infrastructure/repositories/sqlite/settings.repository.ts with @injectable decorator
- [ ] Implement SQLiteSettingsRepository.initialize() method with prepared statement
- [ ] Implement SQLiteSettingsRepository.load() method with prepared statement
- [ ] Implement SQLiteSettingsRepository.update() method with prepared statement
- [ ] Implement database column ↔ TypeScript object mapping (flatten/unflatten)
- [ ] Create src/infrastructure/di/container.ts and configure tsyringe container
- [ ] Register ISettingsRepository → SQLiteSettingsRepository in container
- [ ] Register use cases as singletons in container
- [ ] Verify ALL tests PASS

**REFACTOR (Clean Up While Keeping Tests Green):**

- [ ] Extract mapping functions to separate helpers
- [ ] Optimize SQL queries for performance
- [ ] Verify ALL tests still PASS

### Phase 7: CLI Integration (TDD Cycle 5)

**RED (Write Failing Tests First):**

- [ ] Create tests/e2e/cli/settings-initialization.test.ts (use temp directory)
- [ ] Write test: first run creates ~/.shep/ directory
- [ ] Write test: first run creates database file
- [ ] Write test: first run initializes settings with defaults
- [ ] Write test: second run loads existing settings (doesn't re-initialize)
- [ ] Write test: settings are accessible globally in CLI
- [ ] Write test: corrupted database triggers recovery/re-initialization
- [ ] Verify ALL tests FAIL (CLI integration doesn't exist yet)

**GREEN (Write Minimal Code to Pass Tests):**

- [ ] Update src/presentation/cli/index.ts: Import reflect-metadata at top
- [ ] Import DI container and settings use cases in CLI entry point
- [ ] Add settings initialization before Commander setup: resolve InitializeSettingsUseCase and execute
- [ ] Add settings loading: resolve LoadSettingsUseCase and execute
- [ ] Create src/infrastructure/services/settings.service.ts singleton for global settings access
- [ ] Implement getSettings() function in settings.service.ts
- [ ] Verify ALL tests PASS

**REFACTOR (Clean Up While Keeping Tests Green):**

- [ ] Extract initialization logic to separate bootstrap function
- [ ] Improve error handling and recovery
- [ ] Verify ALL tests still PASS

### Phase 8: Documentation & Finalization

- [ ] Update CLAUDE.md: Document settings initialization flow
- [ ] Update CLAUDE.md: Document DI container usage pattern
- [ ] Update CLAUDE.md: Add Settings to Data Storage section
- [ ] Update CLAUDE.md: Document TypeSpec-first architecture approach
- [ ] Update CLAUDE.md: Document build flow (generate → build → test)
- [ ] Update docs/development/cicd.md: Document `pnpm generate` step in CI/CD pipeline
- [ ] Update docs/development/cicd.md: Document TypeSpec compilation in build flow
- [ ] Update docs/development/tdd-guide.md: Add section on testing TypeSpec-generated code
- [ ] Update docs/development/tdd-guide.md: Add section on testing repositories with in-memory SQLite
- [ ] Create docs/development/typespec-guide.md: TypeSpec domain modeling guide
- [ ] Create docs/architecture/settings-service.md: Settings service architecture documentation
- [ ] Verify package.json scripts are documented
- [ ] Update spec.md: Mark all success criteria as completed
- [ ] Update spec.md: Change Phase to "Complete"
- [ ] Update research.md: Change Phase to "Complete"
- [ ] Update plan.md: Change Phase to "Complete"
- [ ] Update tasks.md: Change Phase to "Complete"
- [ ] Run `pnpm validate` (lint, format, typecheck, tsp:compile)
- [ ] Verify CI pipeline passes on feature branch
- [ ] Manual smoke test: Run `shep` command to verify settings initialization

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

Before marking feature complete:

- [ ] All tasks completed
- [ ] Tests passing (`pnpm test`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Format clean (`pnpm format:check`)
- [ ] Types valid (`pnpm typecheck`)
- [ ] TypeSpec valid (`pnpm tsp:compile`)
- [ ] CI pipeline passes
- [ ] Documentation updated (CLAUDE.md, docs/)
- [ ] All spec files marked as "Complete" phase
- [ ] TDD workflow followed for ALL implementation phases (RED → GREEN → REFACTOR)

---

_Task breakdown for TDD-compliant implementation tracking_
