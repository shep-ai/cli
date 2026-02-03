# Tasks: global-settings-service

> Task breakdown for 005-global-settings-service

## Status

- **Phase:** Implementation
- **Updated:** 2026-02-03

## Task List

### Phase 1: Build Pipeline & Code Generation Setup

- [ ] Install dependencies: `better-sqlite3`, `@blackglory/better-sqlite3-migrations`, `@typespec-tools/emitter-typescript`, `tsyringe`, `reflect-metadata`
- [ ] Update tsconfig.json: Add `experimentalDecorators: true` and `emitDecoratorMetadata: true`
- [ ] Update tsconfig.json: Add path alias `"@domain/generated/*": ["src/domain/generated/*"]`
- [ ] Create tsp-config.yaml with @typespec-tools/emitter-typescript emitter configuration
- [ ] Update package.json: Add `generate` script that runs `tsp:codegen`
- [ ] Update package.json: Add `tsp:codegen` script that runs `tsp emit --emit @typespec-tools/emitter-typescript`
- [ ] Update package.json: Add `prebuild`, `pretest`, `prelint` hooks to run `pnpm generate`
- [ ] Update .github/workflows/ci.yml: Add `pnpm generate` as first step in all jobs
- [ ] Update .husky/pre-commit: Add `pnpm generate` before lint-staged
- [ ] Update .lintstagedrc.mjs: Include `src/domain/generated/**/*.ts` in lint/format
- [ ] Update .gitignore: Ensure `src/domain/generated/` is tracked (not ignored), add comment
- [ ] Test: Run `pnpm generate` manually to verify TypeSpec compilation works

### Phase 2: TypeSpec Settings Model & Generation

- [ ] Create tsp/domain/entities/settings.tsp with Settings model extending BaseEntity
- [ ] Define ModelConfiguration nested model (analyze, requirements, plan, implement with defaults)
- [ ] Define UserProfile nested model (name, email, githubUsername - all optional)
- [ ] Define EnvironmentConfig nested model (defaultEditor="vscode", shellPreference="bash")
- [ ] Define SystemConfig nested model (autoUpdate=true, logLevel="info")
- [ ] Update tsp/domain/entities/index.tsp to export Settings model
- [ ] Run `pnpm generate` and verify TypeScript types generated in src/domain/generated/
- [ ] Create src/domain/factories/settings-defaults.factory.ts using generated types
- [ ] Create src/domain/factories/index.ts barrel export
- [ ] Write unit test: tests/unit/domain/factories/settings-defaults.factory.test.ts

### Phase 3: Application Layer - Ports & Use Cases

- [ ] Create src/application/ports/output/settings.repository.interface.ts with ISettingsRepository interface
- [ ] Define initialize(), load(), update() methods in ISettingsRepository using generated Settings type
- [ ] Create src/application/ports/output/index.ts barrel export
- [ ] Create src/application/use-cases/settings/initialize-settings.use-case.ts with @injectable decorator
- [ ] Implement InitializeSettingsUseCase.execute() method (check existence, create if missing)
- [ ] Create src/application/use-cases/settings/load-settings.use-case.ts with @injectable decorator
- [ ] Implement LoadSettingsUseCase.execute() method (load, throw if missing)
- [ ] Create src/application/use-cases/settings/update-settings.use-case.ts with @injectable decorator
- [ ] Implement UpdateSettingsUseCase.execute(settings) method (validate, update, return)
- [ ] Create src/application/use-cases/settings/index.ts barrel export
- [ ] Write unit test: tests/unit/application/use-cases/initialize-settings.use-case.test.ts (with mock repository)
- [ ] Write unit test: tests/unit/application/use-cases/load-settings.use-case.test.ts (with mock repository)
- [ ] Write unit test: tests/unit/application/use-cases/update-settings.use-case.test.ts (with mock repository)
- [ ] Create tests/helpers/mock-repository.helper.ts for unit test mocks

### Phase 4: Infrastructure - Persistence & Repository

- [ ] Create src/infrastructure/services/bootstrap.service.ts for ~/.shep/ directory creation
- [ ] Implement bootstrap service: Create directory with 700 permissions, handle errors gracefully
- [ ] Create src/infrastructure/persistence/database.ts with getDatabase() singleton function
- [ ] Implement database connection: better-sqlite3 to ~/.shep/data with pragmas (WAL, NORMAL, foreign_keys, defensive)
- [ ] Create src/infrastructure/persistence/migrations.ts with runMigrations() function
- [ ] Integrate @blackglory/better-sqlite3-migrations library in migrations.ts
- [ ] Create src/infrastructure/persistence/migrations/001_create_settings_table.sql
- [ ] Define settings table schema with all columns (flatten nested objects)
- [ ] Add UNIQUE INDEX for singleton pattern (id='singleton')
- [ ] Create src/infrastructure/repositories/settings.repository.ts with @injectable decorator
- [ ] Implement SQLiteSettingsRepository.initialize() method with prepared statement
- [ ] Implement SQLiteSettingsRepository.load() method with prepared statement
- [ ] Implement SQLiteSettingsRepository.update() method with prepared statement
- [ ] Implement database column ↔ TypeScript object mapping (flatten/unflatten)
- [ ] Create src/infrastructure/di/container.ts and configure tsyringe container
- [ ] Register ISettingsRepository → SQLiteSettingsRepository in container
- [ ] Register use cases as singletons in container
- [ ] Write integration test: tests/integration/infrastructure/repositories/settings.repository.test.ts (in-memory DB)
- [ ] Write integration test: tests/integration/infrastructure/persistence/migrations.test.ts (migration idempotency)
- [ ] Create tests/helpers/database.helper.ts for test database utilities

### Phase 5: CLI Integration

- [ ] Update src/presentation/cli/index.ts: Import reflect-metadata at top
- [ ] Import DI container and settings use cases in CLI entry point
- [ ] Add settings initialization before Commander setup: resolve InitializeSettingsUseCase and execute
- [ ] Add settings loading: resolve LoadSettingsUseCase and execute
- [ ] Create src/infrastructure/services/settings.service.ts singleton for global settings access
- [ ] Implement getSettings() function in settings.service.ts
- [ ] Update CLAUDE.md: Document settings initialization flow
- [ ] Update CLAUDE.md: Document DI container usage pattern
- [ ] Update CLAUDE.md: Add Settings to Data Storage section
- [ ] Write E2E test: tests/e2e/cli/settings-initialization.test.ts (first-run and subsequent runs)

### Phase 6: Testing Suite [P]

- [ ] Verify all unit tests pass: `pnpm test:unit`
- [ ] Verify all integration tests pass: `pnpm test:int`
- [ ] Verify all E2E tests pass: `pnpm test:e2e`
- [ ] Run full test suite: `pnpm test`
- [ ] Check test coverage meets project standards

### Phase 7: Documentation & Finalization [P]

- [ ] Update CLAUDE.md: Document TypeSpec-first architecture approach
- [ ] Update CLAUDE.md: Document build flow (generate → build → test)
- [ ] Verify package.json scripts are documented
- [ ] Update spec.md: Mark all success criteria as completed
- [ ] Update spec.md: Change Phase to "Complete"
- [ ] Update research.md: Change Phase to "Complete"
- [ ] Update plan.md: Change Phase to "Complete"
- [ ] Update tasks.md: Change Phase to "Complete"
- [ ] Run `pnpm validate` (lint, format, typecheck, tsp:compile)
- [ ] Verify CI pipeline passes on feature branch
- [ ] Manual smoke test: Run `shep` command to verify settings initialization

<!-- [P] indicates tasks in this phase can run in parallel -->

## Parallelization Notes

- Phase 6 (Testing Suite) can run in parallel with Phase 7 (Documentation)
- Within Phase 2: TypeSpec model creation can happen while Phase 1 is being reviewed
- Within Phase 4: bootstrap.service.ts, database.ts, migrations.ts can be developed concurrently
- All test files within each phase can be written in parallel

## Acceptance Checklist

Before marking feature complete:

- [ ] All tasks completed
- [ ] Tests passing (`pnpm test`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Format clean (`pnpm format:check`)
- [ ] Types valid (`pnpm typecheck`)
- [ ] TypeSpec valid (`pnpm tsp:compile`)
- [ ] CI pipeline passes
- [ ] Documentation updated (CLAUDE.md)
- [ ] All spec files marked as "Complete" phase

---

_Task breakdown for implementation tracking_
