## [1.6.1](https://github.com/shep-ai/cli/compare/v1.6.0...v1.6.1) (2026-02-08)

# [1.6.0](https://github.com/shep-ai/cli/compare/v1.5.0...v1.6.0) (2026-02-08)

### Bug Fixes

- **cli:** correct bin path to dist/src/presentation/cli/index.js ([d9ea0e4](https://github.com/shep-ai/cli/commit/d9ea0e4ca2ae8c39f32f9023bda6be00d53c8847))
- **test:** skip agent config e2e tests when claude binary unavailable ([d726a6b](https://github.com/shep-ai/cli/commit/d726a6b939d32d721da4c5a35a78497cf6e7d092))

### Features

- **specs:** add 008-agent-configuration implementation plan ([f85c70f](https://github.com/shep-ai/cli/commit/f85c70fb2c3ba7011d6849ca6faebd3c4a550706))
- **specs:** add 008-agent-configuration research ([a88b8e8](https://github.com/shep-ai/cli/commit/a88b8e87f4df7874e1e1d51b2b5565d7e5ab9312))
- **specs:** add 008-agent-configuration specification ([8f37d8b](https://github.com/shep-ai/cli/commit/8f37d8b523a5c81ad9d864ade947ca64ce3e8a61))
- **agents:** add agent config typespec models, migration, and infrastructure ([4959ca8](https://github.com/shep-ai/cli/commit/4959ca81e2e6a9d21d326463449ee732ecad317b))
- **agents:** add agent validator, use cases, and tui wizard ([c03fee3](https://github.com/shep-ai/cli/commit/c03fee347eeb08a608f47810d0ca500f424ed6dc))
- **cli:** add settings agent e2e tests and fix repository load bug ([d7a6532](https://github.com/shep-ai/cli/commit/d7a653224f4e85db23236b6523a57cd09a7c5a2a))
- **cli:** add shep settings agent command with interactive wizard ([dc42051](https://github.com/shep-ai/cli/commit/dc42051da9623ec728227a44e193c7bf91484b62))

# [1.5.0](https://github.com/shep-ai/cli/compare/v1.4.0...v1.5.0) (2026-02-08)

### Features

- **specs:** add 007-ui-command implementation plan ([f8a2251](https://github.com/shep-ai/cli/commit/f8a22510f2e6790ac586ec17bd8e88585740f32c))
- **specs:** add 007-ui-command research ([8b144a5](https://github.com/shep-ai/cli/commit/8b144a5f3f203f44435d3c13739ee78e49f7df41))
- **specs:** add 007-ui-command specification ([e8088fa](https://github.com/shep-ai/cli/commit/e8088fa348d2997207fe0ca1fb479ff08ade3ff8))
- **cli:** add shep ui command to serve web ui ([e762643](https://github.com/shep-ai/cli/commit/e76264331d7b53a11f9db232701f7449a5ed39a2))
- **specs:** switch 007 research to in-process programmatic api ([0c79807](https://github.com/shep-ai/cli/commit/0c798072899cedf91f808fe251b1a3dd8093962c))

# [1.4.0](https://github.com/shep-ai/cli/compare/v1.3.1...v1.4.0) (2026-02-05)

### Features

- **specs:** add 006-cli-settings-commands specification ([3f337c2](https://github.com/shep-ai/cli/commit/3f337c2289dbf052ebeeb15976c6727b545c088c))
- **shep-kit:** add autonomous implementation executor with validation gates ([eaca076](https://github.com/shep-ai/cli/commit/eaca07684773786946ebb718f9c161c41bab0d38))
- **specs:** add hierarchical help system requirements ([023389d](https://github.com/shep-ai/cli/commit/023389d55d1fe10c1cd6ed88c94f133e08170e02)), closes [#7](https://github.com/shep-ai/cli/issues/7)
- **specs:** add implementation plan for 006-cli-settings-commands ([4444b31](https://github.com/shep-ai/cli/commit/4444b31053a3f54b2d66a0e7d1041344d663307b))
- **cli:** add ui foundation for settings commands ([c894051](https://github.com/shep-ai/cli/commit/c894051aedeadbd51ab0bc6f1e9de09a7388ff31))
- **specs:** complete research for 006-cli-settings-commands ([f41f374](https://github.com/shep-ai/cli/commit/f41f3746d62c214fe930e008bb0ad679f7c2f3f4))
- **cli:** implement init command with help text (green) ([e3b57d4](https://github.com/shep-ai/cli/commit/e3b57d4ba24c232a2d141c3d47b647a23519a72c))
- **cli:** implement show command with output formatters (green) ([eee7340](https://github.com/shep-ai/cli/commit/eee7340ab5ef8e580619cd696891b8637fc7f3af))

## [1.3.1](https://github.com/shep-ai/cli/compare/v1.3.0...v1.3.1) (2026-02-05)

### Bug Fixes

- **ci:** remove trivy sarif steps and suppress telemetry noise ([#22](https://github.com/shep-ai/cli/issues/22)) ([e3db5b9](https://github.com/shep-ai/cli/commit/e3db5b9e0edcc1a18fffa1b0adcc0a51076ccd28))

# [1.3.0](https://github.com/shep-ai/cli/compare/v1.2.0...v1.3.0) (2026-02-05)

### Bug Fixes

- **ci:** completely disable claude-review workflow ([#17](https://github.com/shep-ai/cli/issues/17)) ([c803cbc](https://github.com/shep-ai/cli/commit/c803cbc35a0bac32ffcfa19057e1c6ebfdb43a64))
- **ci:** delete claude-review.yml workflow file ([#18](https://github.com/shep-ai/cli/issues/18)) ([4ff1629](https://github.com/shep-ai/cli/commit/4ff162991d5d6c45d02ff34e186964ac168fe6f4))
- **ci:** enable credential persistence for semantic-release ([#16](https://github.com/shep-ai/cli/issues/16)) ([bffac14](https://github.com/shep-ai/cli/commit/bffac1498a1f249c5f70e49fe94f6a65de5614cc))
- **ci:** limit main branch to 1 concurrent workflow ([#21](https://github.com/shep-ai/cli/issues/21)) ([4dc5b84](https://github.com/shep-ai/cli/commit/4dc5b84a82aabdde3ad05fa433e46311ce5308aa))
- **ci:** suppress cve-2026-0775 npm vulnerability ([#20](https://github.com/shep-ai/cli/issues/20)) ([c5d3635](https://github.com/shep-ai/cli/commit/c5d3635170f891526fa5e02babb4a02af9ece6fd))
- **ci:** use release_token for semantic-release to bypass branch protection ([#19](https://github.com/shep-ai/cli/issues/19)) ([17438b5](https://github.com/shep-ai/cli/commit/17438b5335b6a1eb4b85c3484e75f60c41dcbc33))

### Features

- **specs:** add 005 global-settings-service specification ([#14](https://github.com/shep-ai/cli/issues/14)) ([427344e](https://github.com/shep-ai/cli/commit/427344e23846a90d3389987c0cb1684024b1c127)), closes [#005](https://github.com/shep-ai/cli/issues/005)
- **web:** add component library foundation with shadcn/ui and storybook ([#9](https://github.com/shep-ai/cli/issues/9)) ([e4601fa](https://github.com/shep-ai/cli/commit/e4601fa5a7f0d0e32e3a72431258cce1f03fc196))
- **ci:** add security scanning gates with release blocking ([#8](https://github.com/shep-ai/cli/issues/8)) ([1e16f2d](https://github.com/shep-ai/cli/commit/1e16f2ddd28a6b7ebf72147835a1c6117b136427))

### BREAKING CHANGES

- **specs:** All feature plans MUST now follow Test-Driven Development

* Update shep-kit:plan skill to MANDATE TDD planning structure
* Update plan.md template with explicit TDD cycle phases
* Update tasks.md template with RED-GREEN-REFACTOR breakdown
* Update spec-driven-workflow.md to emphasize MANDATORY TDD
* Update CLAUDE.md to highlight TDD requirement in planning
* Rewrite 005-global-settings-service plan/tasks with TDD structure
  - Phase 1-2: Foundational (no tests)
  - Phase 3: TDD Cycle 1 (Domain Layer)
  - Phase 4: TDD Cycle 2 (Application Layer)
  - Phase 5: TDD Cycle 3 (Persistence Layer)
  - Phase 6: TDD Cycle 4 (Repository Layer)
  - Phase 7: TDD Cycle 5 (CLI Integration)
  - Phase 8: Documentation

Key Changes:

- Tests are written FIRST in every TDD cycle (RED phase)
- Implementation written to pass tests (GREEN phase)
- Code refactored while keeping tests green (REFACTOR phase)
- Old non-TDD plans backed up as plan-old.md, tasks-old.md

This ensures all future features follow proper TDD workflow.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- fix(ci): use v1.0+ prompt parameter in claude-review workflow

Changed direct_prompt to prompt to match claude-code-action@v1 API.
The v0.x parameter name was causing the action to skip execution.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- feat(config): add build pipeline and typespec code generation

phase 1: build pipeline & code generation setup (foundational)

- install dependencies: better-sqlite3, @blackglory/better-sqlite3-migrations,
  @typespec-tools/emitter-typescript, tsyringe, reflect-metadata
- configure typescript decorators (experimentalDecorators, emitDecoratorMetadata)
- add @domain/generated/\* path alias to tsconfig.json
- configure typescript emitter in tspconfig.yaml
- add generate/tsp:codegen scripts with pre-hooks (prebuild, pretest, prelint)
- update ci workflow to run pnpm generate in all jobs
- update pre-commit hook to generate types before lint-staged
- track src/domain/generated/ in git (typespec-generated domain models)
- exclude src/domain/generated/ from eslint (auto-generated code)
- verify typespec compilation works end-to-end

build flow: typespec → generate → build → test

part of specs/005-global-settings-service

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- fix(config): ignore nested build output directories in eslint

* Change `.next/**` to `**/.next/**` to catch Next.js build dirs at any level
* Change `storybook-static/**` to `**/storybook-static/**` for Storybook builds
* Fixes lint failures from workspace build outputs in src/presentation/web/.next/

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- feat(tsp): add settings domain model with nested configuration types

* Create Settings entity extending BaseEntity (singleton pattern)
* Add ModelConfiguration for AI model selection per agent
* Add UserProfile for optional user identity (name, email, github)
* Add EnvironmentConfig for editor and shell preferences
* Add SystemConfig for auto-update and log level settings
* Update domain entities index to export Settings model
* Generate TypeScript types in src/domain/generated/output.ts
* All nested models have sensible defaults for first-run experience

Phase 2/8 complete: TypeSpec Settings Model & Generation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- style(tsp): fix prettier formatting in generated output.ts

* Change enum string values from double quotes to single quotes
* Fixes CI/CD format:check failure
* No functional changes, only style formatting

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- fix(config): auto-format generated types after typespec compilation

* Add prettier --write to tsp:codegen script after compilation
* Ensures generated TypeScript follows project code style (single quotes)
* Fixes CI/CD format:check failures due to double quotes in generated code
* Generated files now maintain consistent formatting across commits

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- fix(docker): include typespec files in build context

* Add tspconfig.yaml and tsp/ directory to builder stage COPY
* Remove tsp/ and tspconfig.yaml from .dockerignore exclusions
* TypeSpec files are required during build for code generation (prebuild hook)
* Fixes Docker Build and Trivy (container) CI/CD failures
* Build now succeeds with pnpm generate → TypeScript compilation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- feat(domain): implement settings defaults factory with tdd

Phase 3 implementation following red-green-refactor cycle.

- created comprehensive test suite (15 tests)
- implemented createDefaultSettings() factory function
- extracted constants for maintainability
- disabled claude review workflow per user preference
- updated tasks.md with phase 1, 2, 3 complete

tests: 15/15 unit tests passing, all validations passing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- feat(application): implement settings use cases with tdd

phase 4 implementation following red-green-refactor cycle.

- created comprehensive test suite (26 tests total)
- mock repository helper for unit testing
- initialize settings use case (idempotent initialization)
- load settings use case (with error handling)
- update settings use case (full settings update)
- clean architecture with repository interface
- tsyringe dependency injection
- reflect-metadata for decorators

tests: 26/26 use case tests passing, all validations passing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- feat(domain): implement sqlite persistence layer with tdd

phase 5 implementation following red-green-refactor cycle.

- created comprehensive integration tests (13 tests total)
- database helper for in-memory test databases
- shep directory service (~/.shep/ with 700 permissions)
- sqlite connection module (singleton with wal mode)
- manual migration system (user_version tracking)
- settings table migration (flattened schema)
- all pragmas configured for performance
- idempotent migrations with transaction support

tests: 13/13 integration tests passing, all validations passing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- feat(infrastructure): implement sqlite settings repository with tdd

Completes Phase 6 (Infrastructure - Repository Layer) following strict TDD methodology.

RED Phase:

- Created 32 integration tests for SQLiteSettingsRepository
- Tests cover initialize(), load(), update() operations
- Tests verify singleton constraint enforcement
- Tests confirm SQL injection prevention with prepared statements
- Tests validate database mapping (snake_case ↔ camelCase)

GREEN Phase:

- Implemented SQLiteSettingsRepository with @injectable decorator
- Used prepared statements with named parameters for all operations
- Implemented bidirectional database mapping (flatten/unflatten)
- All 32 integration tests passing

REFACTOR Phase:

- Extracted mapping functions to settings.mapper.ts
- Optimized SQL queries with prepared statements
- Maintained test coverage (141/141 tests passing)

Test Results:

- Repository tests: 32/32 passing
- Total suite: 141/141 passing
- All validation checks passing (lint, format, typecheck, tsp)

Files Changed:

- tests/integration/infrastructure/repositories/sqlite-settings.repository.test.ts (new)
- src/infrastructure/repositories/sqlite-settings.repository.ts (new)
- src/infrastructure/persistence/sqlite/mappers/settings.mapper.ts (new)
- specs/005-global-settings-service/tasks.md (updated)

Note: DI container configuration deferred to Phase 7 (CLI integration)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- feat(cli): implement settings initialization with di container and tdd

Completes Phase 7 (CLI Integration) following strict TDD methodology.

RED Phase:

- Created 11 E2E tests for CLI settings initialization
- Tests verify directory creation, database setup, settings persistence
- Tests cover concurrent access, error recovery, environment isolation
- Initial results: 8/11 tests failing as expected

GREEN Phase:

- Created DI container (src/infrastructure/di/container.ts)
- Configured tsyringe with database, repositories, and use cases
- Created settings service (src/infrastructure/services/settings.service.ts)
- Implemented global settings singleton access pattern
- Updated CLI entry point with async bootstrap function
- Added reflect-metadata import and DI initialization
- All 11 E2E tests passing

REFACTOR Phase:

- Improved error handling with specific messages for each failure point
- Bootstrap function separated for database and settings initialization
- Fixed ESLint errors (require() imports, unused variables)
- All 152 tests passing after refactoring

Test Results:

- E2E settings tests: 11/11 passing
- Total test suite: 152/152 passing
- All validation checks passing (lint, format, typecheck, tsp)

Files Changed:

- tests/e2e/cli/settings-initialization.test.ts (new - 11 E2E tests)
- src/infrastructure/di/container.ts (new - DI configuration)
- src/infrastructure/services/settings.service.ts (new - global singleton)
- src/presentation/cli/index.ts (updated - bootstrap with DI)
- specs/005-global-settings-service/tasks.md (updated - Phase 7 complete)

Key Features:

- Automatic settings initialization on first CLI run
- Global settings access throughout application
- Dependency injection with tsyringe
- Database migrations run automatically
- Graceful error handling and recovery
- Environment variable isolation for testing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- docs(specs): complete phase 8 - documentation for global-settings-service

Phase 8: Documentation & Finalization (TDD Complete)

Updates:

- CLAUDE.md: Added Settings domain model, DI container,
  TypeSpec-first architecture
- docs/architecture/settings-service.md: Comprehensive
  architecture documentation
- docs/development/cicd.md: Document TypeSpec compilation
  in CI/CD
- docs/development/tdd-guide.md: Added sections on testing
  TypeSpec-generated code and in-memory SQLite repositories
- docs/development/typespec-guide.md: Complete TypeSpec
  domain modeling guide
- specs/005-global-settings-service/spec.md: Marked all
  success criteria as completed, Phase: Complete
- specs/005-global-settings-service/tasks.md: All Phase 8
  tasks completed, acceptance checklist satisfied

Feature complete:

- 152/152 tests passing (all green)
- All validations passing (lint, format, typecheck, tsp)
- Smoke test successful (shep version works with settings)
- TDD workflow followed for ALL phases (RED → GREEN → REFACTOR)

# [1.2.0](https://github.com/shep-ai/cli/compare/v1.1.0...v1.2.0) (2026-02-02)

### Features

- **ci:** add docker build and push to github container registry ([#7](https://github.com/shep-ai/cli/issues/7)) ([9c4ea7d](https://github.com/shep-ai/cli/commit/9c4ea7da6b24f7e3e127e25e0aae06003448116f))

# [1.1.0](https://github.com/shep-ai/cli/compare/v1.0.1...v1.1.0) (2026-02-02)

### Features

- **dx:** add shep-kit:merged skill for post-merge cleanup ([e7b7818](https://github.com/shep-ai/cli/commit/e7b7818bdea118e00b087f94050001a047672fbe))

## [1.0.1](https://github.com/shep-ai/cli/compare/v1.0.0...v1.0.1) (2026-02-02)

### Bug Fixes

- **test:** read version from package.json dynamically ([45616ee](https://github.com/shep-ai/cli/commit/45616ee5b4ef025a5fc21e026d53df61682ff90c))

# 1.0.0 (2026-02-02)

### Bug Fixes

- **config:** fix test and build scripts for cli project ([eb6be50](https://github.com/shep-ai/cli/commit/eb6be50f433a55e22a44b4b7db96a95f047682fe))
- **ci:** ignore release commits in commitlint ([3d048bd](https://github.com/shep-ai/cli/commit/3d048bd73f162246ae125fbe84b3baa214c62f7f))
- **config:** let pnpm action read version from package.json ([6738877](https://github.com/shep-ai/cli/commit/6738877065942b9fd42e03c5d692c360d6669f9e))

### Features

- **dx:** add claude code hooks and skills for tsp workflow ([#1](https://github.com/shep-ai/cli/issues/1)) ([4fa4225](https://github.com/shep-ai/cli/commit/4fa4225ff6d479d2186c16f2f11311a1eb5043e7))
- **cli:** add cli scaffolding with commander.js and e2e tests ([#2](https://github.com/shep-ai/cli/issues/2)) ([a2b4259](https://github.com/shep-ai/cli/commit/a2b42595db6106e6da85049c6b85e2325f803b4a))
- **ci:** add semantic-release for automated publishing ([#4](https://github.com/shep-ai/cli/issues/4)) ([ee90892](https://github.com/shep-ai/cli/commit/ee908923e8e9c15d1eb600563770f179b259e3af))
- **specs:** add shep-kit spec-driven development workflow ([#3](https://github.com/shep-ai/cli/issues/3)) ([9855982](https://github.com/shep-ai/cli/commit/9855982095af255ef115e3fc337e7999ca2b70c9))

# Changelog

All notable changes to this project will be documented in this file.

This changelog is automatically generated by [semantic-release](https://github.com/semantic-release/semantic-release) based on [Conventional Commits](https://www.conventionalcommits.org/).
