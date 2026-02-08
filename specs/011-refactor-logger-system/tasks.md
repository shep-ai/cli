# Tasks: refactor-logger-system

> Task breakdown for 011-refactor-logger-system

## Status

- **Phase:** Implementation
- **Updated:** 2026-02-08
- **Total Tasks:** 28
- **Estimated Effort:** 4-6 days

## Task List

### Phase 1: Core Logger Implementation (7 tasks)

**Goal**: Add structured logger to DI container with multi-layer configuration.

#### Task 1.1: Define ILogger Interface and TypeSpec Changes

**Description**: Create the core logger interface and add logLevel to Settings domain model.

**TDD Phases**:

- **RED**: Write test for ILogger interface contract (debug, info, warn, error methods with context parameter)
- **GREEN**: Create `ILogger` interface in `application/ports/output/logger.interface.ts`, add `logLevel` field to `tsp/domain/entities/settings.tsp`
- **REFACTOR**: Add JSDoc documentation, add type-safe log level enum

**Acceptance Criteria**:

- [ ] `ILogger` interface defined with 4 methods: `debug(msg, context?)`, `info`, `warn`, `error`
- [ ] Settings TypeSpec includes `logLevel?: LogLevel` in SystemConfig
- [ ] TypeSpec compiles successfully (`pnpm tsp:compile`)
- [ ] Generated types include LogLevel enum and Settings.system.logLevel

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/ports/output/logger.interface.ts`

**Files Modified**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tsp/domain/entities/settings.tsp`

**Dependencies**: None

---

#### Task 1.2: Install Pino Dependencies

**Description**: Add pino, pino-roll, and pino-pretty to package.json.

**TDD Phases**:

- **RED**: N/A (dependency installation)
- **GREEN**: Run `pnpm add pino pino-roll` and `pnpm add -D pino-pretty`
- **REFACTOR**: Verify package versions are latest (pino@^9.7, pino-roll@^1.3, pino-pretty@^14.1)

**Acceptance Criteria**:

- [ ] `package.json` includes pino, pino-roll in dependencies
- [ ] `package.json` includes pino-pretty in devDependencies
- [ ] `pnpm install` succeeds
- [ ] All packages installed correctly in node_modules

**Files Modified**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/package.json`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/pnpm-lock.yaml`

**Dependencies**: Task 1.1

---

#### Task 1.3: Implement LoggerConfigFactory

**Description**: Create factory for logger configuration with multi-layer precedence (CLI > ENV > Settings).

**TDD Phases**:

- **RED**: Write tests for config precedence (CLI flag overrides ENV, ENV overrides Settings, Settings is default)
- **GREEN**: Implement `LoggerConfigFactory` with `create(cliLevel?, envLevel?, settingsLevel?)` method
- **REFACTOR**: Extract environment detection logic, add validation for log levels

**Acceptance Criteria**:

- [ ] Factory resolves log level in correct precedence order
- [ ] Environment detection works (NODE_ENV=production → JSON, development → pretty)
- [ ] Invalid log levels throw clear error
- [ ] Unit tests pass for all precedence scenarios

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/services/logger/logger-config.factory.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/infrastructure/services/logger/logger-config.factory.test.ts`

**Dependencies**: Task 1.1, Task 1.2

---

#### Task 1.4: Implement Console Transport

**Description**: Create console transport with pretty printing for development.

**TDD Phases**:

- **RED**: Write test for console transport outputting pretty logs in dev mode
- **GREEN**: Implement `createConsoleTransport()` using pino-pretty in development
- **REFACTOR**: Add colorization config, timestamp formatting, log source prefix

**Acceptance Criteria**:

- [ ] Console transport outputs human-readable logs in dev
- [ ] Production mode outputs raw JSON (no pino-pretty)
- [ ] Colors are disabled when not in TTY
- [ ] Unit tests verify dev vs prod output

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/services/logger/transports/console.transport.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/infrastructure/services/logger/transports/console.transport.test.ts`

**Dependencies**: Task 1.3

---

#### Task 1.5: Implement File Transport with Rotation

**Description**: Create file transport using pino-roll for log rotation.

**TDD Phases**:

- **RED**: Write test for file transport writing logs to file with rotation
- **GREEN**: Implement `createFileTransport()` using pino-roll (daily rotation, 100MB max, 30 day retention)
- **REFACTOR**: Add symlink for current.log, optimize for production performance

**Acceptance Criteria**:

- [ ] File transport writes logs to `~/.shep/logs/shep.YYYY-MM-DD.log`
- [ ] Symlink `~/.shep/logs/current.log` points to active log file
- [ ] Rotation triggers on size (100MB) and time (daily)
- [ ] Old logs deleted after 30 days
- [ ] File permissions are 0600 (owner read/write only)

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/services/logger/transports/file.transport.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/infrastructure/services/logger/transports/file.transport.test.ts`

**Dependencies**: Task 1.3

---

#### Task 1.6: Implement PinoLogger Service

**Description**: Create PinoLogger class implementing ILogger interface.

**TDD Phases**:

- **RED**: Write tests for PinoLogger calling debug/info/warn/error with context
- **GREEN**: Implement PinoLogger with pino instance, wire up transports, handle log levels
- **REFACTOR**: Add redaction config for sensitive data (passwords, tokens), optimize for production

**Acceptance Criteria**:

- [ ] PinoLogger implements all ILogger methods
- [ ] Logs include timestamp, level, message, context
- [ ] Sensitive fields are redacted (password, apiKey, token)
- [ ] Dev mode uses console transport (pretty), prod uses file transport (JSON)
- [ ] Unit tests verify log output and redaction

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/services/logger/pino-logger.service.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/infrastructure/services/logger/pino-logger.service.test.ts`

**Dependencies**: Task 1.4, Task 1.5

---

#### Task 1.7: Register Logger in DI Container

**Description**: Register ILogger in tsyringe DI container for injection.

**TDD Phases**:

- **RED**: Write test for DI container resolving ILogger
- **GREEN**: Add logger registration to `initializeContainer()` in `infrastructure/di/container.ts`
- **REFACTOR**: Extract logger config resolution into factory, add singleton lifetime

**Acceptance Criteria**:

- [ ] ILogger registered as singleton in DI container
- [ ] Logger can be resolved via `container.resolve('ILogger')`
- [ ] Logger configuration uses multi-layer precedence (CLI > ENV > Settings)
- [ ] Integration test verifies logger injection into other services

**Files Modified**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/di/container.ts`

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/integration/di/logger-registration.integration.test.ts`

**Dependencies**: Task 1.6

---

### Phase 2: Incremental Logger Migration (5 tasks)

**Goal**: Replace all console.\* calls with structured logger, layer by layer.

#### Task 2.1: Create Mock Logger Test Helper

**Description**: Create reusable mock logger factory for tests.

**TDD Phases**:

- **RED**: Write test for createMockLogger() returning ILogger mock
- **GREEN**: Implement `createMockLogger()` using Vitest mocks (`vi.fn()`)
- **REFACTOR**: Add assertion helpers (e.g., `expectLoggedInfo()`, `expectLoggedError()`)

**Acceptance Criteria**:

- [ ] `createMockLogger()` returns ILogger with all methods mocked
- [ ] Mock logger tracks all log calls (method, message, context)
- [ ] Helper exports assertion utilities for common patterns
- [ ] Unit test verifies mock behavior

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/helpers/mock-logger.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/helpers/mock-logger.test.ts`

**Dependencies**: Task 1.7

---

#### Task 2.2: Migrate Infrastructure Layer to Logger

**Description**: Replace console.\* in repositories and services with ILogger.

**TDD Phases**:

- **RED**: Update tests for SQLiteSettingsRepository, AgentValidatorService, VersionService, WebServerService to use createMockLogger()
- **GREEN**: Inject ILogger into constructor of each service, replace all console.\* calls
- **REFACTOR**: Review log messages for consistency, add structured context where missing

**Acceptance Criteria**:

- [ ] All infrastructure services accept ILogger in constructor
- [ ] Zero console.\* calls in infrastructure layer
- [ ] All log messages use structured context (not string interpolation)
- [ ] All tests pass with mocked logger

**Files Modified** (~5 files):

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/repositories/sqlite-settings.repository.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/services/agents/agent-validator.service.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/services/version.service.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/services/web-server.service.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/infrastructure/**/*.test.ts` (update all)

**Dependencies**: Task 2.1

---

#### Task 2.3: Migrate Application Layer to Logger

**Description**: Replace console.\* in use cases with ILogger.

**TDD Phases**:

- **RED**: Update tests for all 5 use cases to use createMockLogger()
- **GREEN**: Inject ILogger into all use case constructors, replace console.\* calls
- **REFACTOR**: Add contextual metadata (repositoryPath, userId, etc.), standardize log sources

**Acceptance Criteria**:

- [ ] All use cases accept ILogger in constructor
- [ ] Zero console.\* calls in application layer
- [ ] Log sources follow pattern: "use-case:settings", "use-case:agent"
- [ ] All tests pass with mocked logger

**Files Modified** (~10 files):

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/use-cases/settings/initialize-settings.use-case.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/use-cases/settings/load-settings.use-case.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/use-cases/settings/update-settings.use-case.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/use-cases/agents/configure-agent.use-case.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/use-cases/agents/validate-agent-auth.use-case.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/application/**/*.test.ts` (update all)

**Dependencies**: Task 2.2

---

#### Task 2.4: Migrate Presentation Layer (CLI) to Logger

**Description**: Replace console.\* in CLI commands with ILogger.

**TDD Phases**:

- **RED**: Update tests for all CLI commands to use createMockLogger()
- **GREEN**: Inject ILogger into commands via DI, replace console.error with logger.error, keep user-facing console.log
- **REFACTOR**: Distinguish between logging (logger.info) and user output (console.log for tables)

**Acceptance Criteria**:

- [ ] All CLI commands resolve ILogger from DI container
- [ ] Error logging uses logger.error with context
- [ ] User-facing output (tables, formatted text) still uses console.log
- [ ] Log sources follow pattern: "cli:settings", "cli:version"
- [ ] All CLI tests pass with mocked logger

**Files Modified** (~15 files):

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/cli/commands/**/*.ts` (all command files)
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/presentation/cli/**/*.test.ts` (update all)

**Dependencies**: Task 2.3

---

#### Task 2.5: Enable ESLint no-console Rule

**Description**: Add ESLint rule to prevent future console.\* usage outside logger.

**TDD Phases**:

- **RED**: N/A (linting configuration)
- **GREEN**: Add `'no-console': ['error', { allow: [] }]` to ESLint config, add exception for logger implementation files
- **REFACTOR**: Run `pnpm lint:fix` to catch any missed console.\* calls

**Acceptance Criteria**:

- [ ] ESLint rule blocks console.\* in all files except logger implementation
- [ ] `pnpm lint` passes with zero console.\* violations
- [ ] Logger implementation files are excluded from rule
- [ ] All existing tests still pass

**Files Modified**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/eslint.config.mjs`

**Dependencies**: Task 2.4

---

### Phase 3: Logs Storage & Repository (4 tasks)

**Goal**: Persist logs to SQLite with full-text search.

#### Task 3.1: Create Database Migration for Logs Table

**Description**: Add migration to create logs table, FTS5 virtual table, and indexes.

**TDD Phases**:

- **RED**: Write test for migration creating tables and triggers
- **GREEN**: Create `003-create-logs-table.sql` with main table, FTS5 table, triggers, indexes
- **REFACTOR**: Optimize index configuration, add down-migration for rollback

**Acceptance Criteria**:

- [ ] Migration creates `logs` table (id, timestamp, level, source, message, context, stack_trace)
- [ ] Migration creates `logs_fts` FTS5 virtual table
- [ ] Triggers auto-sync logs to FTS5 on insert/update/delete
- [ ] Indexes created for timestamp (DESC), level, source
- [ ] Migration runs successfully in test environment

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/persistence/sqlite/migrations/003-create-logs-table.sql`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/integration/persistence/logs-migration.integration.test.ts`

**Dependencies**: Phase 2 complete

---

#### Task 3.2: Define ILogRepository Interface

**Description**: Create repository interface for log storage operations.

**TDD Phases**:

- **RED**: Write test for ILogRepository interface contract
- **GREEN**: Define interface with insert, findAll, findById, count, search, deleteBefore methods
- **REFACTOR**: Add type definitions for filters, query objects, result types

**Acceptance Criteria**:

- [ ] ILogRepository interface defined with all 6 methods
- [ ] Filter types defined (ListLogsFilters, SearchLogsQuery, ClearLogsOptions)
- [ ] Result types defined (LogEntry, LogListResult, ClearLogsResult)
- [ ] TypeScript compilation succeeds

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/ports/output/log-repository.interface.ts`

**Dependencies**: Task 3.1

---

#### Task 3.3: Implement SQLiteLogRepository

**Description**: Implement log repository with SQLite + FTS5.

**TDD Phases**:

- **RED**: Write tests for all repository methods (insert, findAll with filters, search, deleteBefore)
- **GREEN**: Implement SQLiteLogRepository with better-sqlite3, FTS5 queries, parameterized statements
- **REFACTOR**: Optimize query builder, add batch insert for performance, add connection pooling

**Acceptance Criteria**:

- [ ] All repository methods implemented correctly
- [ ] FTS5 search supports boolean operators (AND, OR, NOT)
- [ ] Filters work correctly (level, source, date range, pagination)
- [ ] Queries are parameterized (SQL injection safe)
- [ ] Repository handles 10k+ logs efficiently (< 100ms)
- [ ] Unit and integration tests pass

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/repositories/sqlite-log.repository.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/infrastructure/repositories/sqlite-log.repository.test.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/integration/repositories/sqlite-log.integration.test.ts`

**Dependencies**: Task 3.2

---

#### Task 3.4: Hook PinoLogger to Repository

**Description**: Connect PinoLogger to persist logs to SQLiteLogRepository.

**TDD Phases**:

- **RED**: Write test for PinoLogger inserting logs into repository
- **GREEN**: Add repository hook to PinoLogger, implement async background insertion
- **REFACTOR**: Add error handling for failed inserts, add buffer to batch writes

**Acceptance Criteria**:

- [ ] PinoLogger accepts ILogRepository in constructor
- [ ] All log calls (debug/info/warn/error) persist to repository
- [ ] Insertion is async and non-blocking
- [ ] Failed inserts are handled gracefully (no crash)
- [ ] Repository registered in DI container

**Files Modified**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/services/logger/pino-logger.service.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/di/container.ts`

**Dependencies**: Task 3.3

---

### Phase 4: CLI Commands (6 tasks) [P]

**Goal**: Add `shep logs` command with 6 subcommands.

**Note**: Tasks 4.1-4.6 can be implemented in parallel after their use cases are ready.

#### Task 4.1: Implement ListLogsUseCase + CLI Command

**Description**: Create use case and CLI command for `shep logs list`.

**TDD Phases**:

- **RED**: Write tests for ListLogsUseCase and CLI command with filters
- **GREEN**: Implement use case, CLI command, table formatter
- **REFACTOR**: Add color coding for log levels, optimize table rendering

**Acceptance Criteria**:

- [ ] ListLogsUseCase implemented with filters (level, source, date range, pagination)
- [ ] `shep logs list` command works with all options
- [ ] Table output displays clearly with colors
- [ ] JSON output format works
- [ ] All tests pass

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/use-cases/logs/list-logs.use-case.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/cli/commands/logs/list.command.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/cli/ui/formatters/logs.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/application/use-cases/logs/list-logs.test.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/presentation/cli/commands/logs/list.test.ts`

**Dependencies**: Task 3.4

---

#### Task 4.2: Implement GetLogEntryUseCase + CLI Command

**Description**: Create use case and CLI command for `shep logs show <id>`.

**TDD Phases**:

- **RED**: Write tests for GetLogEntryUseCase and CLI command
- **GREEN**: Implement use case, CLI command, pretty formatter
- **REFACTOR**: Add syntax highlighting for stack traces, improve context formatting

**Acceptance Criteria**:

- [ ] GetLogEntryUseCase retrieves single log by ID
- [ ] `shep logs show <id>` displays full log details
- [ ] Related logs shown in context (±1 second)
- [ ] Pretty and JSON formats work
- [ ] All tests pass

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/use-cases/logs/get-log-entry.use-case.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/cli/commands/logs/show.command.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/application/use-cases/logs/get-log-entry.test.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/presentation/cli/commands/logs/show.test.ts`

**Dependencies**: Task 3.4

---

#### Task 4.3: Implement StreamLogsUseCase + CLI Command

**Description**: Create use case, stream service, and CLI command for `shep logs follow`.

**TDD Phases**:

- **RED**: Write tests for StreamLogsUseCase, LogStreamService, and CLI command
- **GREEN**: Implement async generator use case, EventEmitter-based stream service, CLI command
- **REFACTOR**: Add debouncing for rapid log bursts, optimize filter application

**Acceptance Criteria**:

- [ ] ILogStreamService interface defined
- [ ] LogStreamService implements real-time event emission
- [ ] StreamLogsUseCase yields logs as async generator
- [ ] `shep logs follow` streams logs in real-time
- [ ] Filters work on stream
- [ ] Ctrl+C stops gracefully
- [ ] No memory leaks

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/ports/output/log-stream.interface.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/use-cases/logs/stream-logs.use-case.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/services/log-stream.service.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/cli/commands/logs/follow.command.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/application/use-cases/logs/stream-logs.test.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/infrastructure/services/log-stream.test.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/presentation/cli/commands/logs/follow.test.ts`

**Dependencies**: Task 3.4

---

#### Task 4.4: Implement SearchLogsUseCase + CLI Command

**Description**: Create use case and CLI command for `shep logs search <query>`.

**TDD Phases**:

- **RED**: Write tests for SearchLogsUseCase with FTS5 queries
- **GREEN**: Implement use case with FTS5 search, CLI command, highlight formatter
- **REFACTOR**: Optimize FTS5 query parsing, add relevance scoring (bm25)

**Acceptance Criteria**:

- [ ] SearchLogsUseCase uses FTS5 for full-text search
- [ ] `shep logs search <query>` finds logs by text
- [ ] Wildcard and boolean operators work
- [ ] Results ranked by relevance
- [ ] Matches highlighted in output
- [ ] All tests pass

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/use-cases/logs/search-logs.use-case.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/cli/commands/logs/search.command.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/application/use-cases/logs/search-logs.test.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/presentation/cli/commands/logs/search.test.ts`

**Dependencies**: Task 3.4

---

#### Task 4.5: Implement ExportLogsUseCase + CLI Command

**Description**: Create use case, exporter service, and CLI command for `shep logs export`.

**TDD Phases**:

- **RED**: Write tests for ExportLogsUseCase and LogExporter with all 3 formats
- **GREEN**: Implement use case, exporter service (JSON/NDJSON/CSV), CLI command
- **REFACTOR**: Add streaming export for large datasets, optimize CSV escaping

**Acceptance Criteria**:

- [ ] ILogExporter interface defined
- [ ] LogExporter exports to JSON, NDJSON, CSV formats
- [ ] Gzip compression works
- [ ] ExportLogsUseCase applies filters before export
- [ ] `shep logs export` creates files correctly
- [ ] Large exports don't crash (streaming)
- [ ] All tests pass

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/ports/output/log-exporter.interface.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/use-cases/logs/export-logs.use-case.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/services/log-exporter.service.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/cli/commands/logs/export.command.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/application/use-cases/logs/export-logs.test.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/infrastructure/services/log-exporter.test.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/presentation/cli/commands/logs/export.test.ts`

**Dependencies**: Task 3.4

---

#### Task 4.6: Implement ClearLogsUseCase + CLI Command

**Description**: Create use case and CLI command for `shep logs clear`.

**TDD Phases**:

- **RED**: Write tests for ClearLogsUseCase with dry-run and deletion
- **GREEN**: Implement use case, CLI command with confirmation prompt
- **REFACTOR**: Add progress indicator for large deletions, optimize bulk delete

**Acceptance Criteria**:

- [ ] ClearLogsUseCase implements dry-run and deletion modes
- [ ] `shep logs clear --before <date>` deletes old logs
- [ ] Confirmation prompt works
- [ ] Dry-run shows accurate breakdown by level
- [ ] Deletion is safe and correct
- [ ] All tests pass

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/application/use-cases/logs/clear-logs.use-case.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/cli/commands/logs/clear.command.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/application/use-cases/logs/clear-logs.test.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/unit/presentation/cli/commands/logs/clear.test.ts`

**Dependencies**: Task 3.4

---

#### Task 4.7: Wire Up Logs Commands in CLI

**Description**: Register all `shep logs` subcommands in main CLI.

**TDD Phases**:

- **RED**: Write E2E test for `shep logs --help` showing all subcommands
- **GREEN**: Create `logs/index.ts` combining all subcommands, add to main CLI
- **REFACTOR**: Add command descriptions, examples, option validation

**Acceptance Criteria**:

- [ ] `shep logs` command registered in CLI
- [ ] All 6 subcommands accessible (list, show, follow, search, export, clear)
- [ ] `shep logs --help` displays correctly
- [ ] All use cases registered in DI container
- [ ] All services registered in DI container
- [ ] E2E test passes

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/cli/commands/logs/index.ts`

**Files Modified**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/cli/index.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/infrastructure/di/container.ts`

**Dependencies**: Tasks 4.1-4.6 complete

---

### Phase 5: Web UI (3 tasks) [P]

**Goal**: Add web-based log viewing with real-time streaming.

**Note**: Tasks 5.1-5.3 can be implemented in parallel.

#### Task 5.1: Implement /logs Table View Page

**Description**: Create table view page with filters and pagination.

**TDD Phases**:

- **RED**: Write tests for `/api/logs` route and React components
- **GREEN**: Implement API route, page component, LogsTable, LogsFilters components
- **REFACTOR**: Add loading states, virtualization for 1000+ rows, export button

**Acceptance Criteria**:

- [ ] `/api/logs` route uses ListLogsUseCase
- [ ] `/logs` page renders table with logs
- [ ] Filters work (level, source, date range)
- [ ] Pagination works correctly
- [ ] UI is responsive and fast
- [ ] E2E test passes

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/web/app/logs/page.tsx`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/web/app/api/logs/route.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/web/components/logs/logs-table.tsx`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/web/components/logs/logs-filters.tsx`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/web/hooks/use-logs.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/e2e/web/logs/logs-page.spec.ts`

**Dependencies**: Task 4.7

---

#### Task 5.2: Implement /logs/[id] Detail View Page

**Description**: Create detail view page for single log entry.

**TDD Phases**:

- **RED**: Write tests for `/api/logs/[id]` route and detail page
- **GREEN**: Implement API route, page component, LogDetail component
- **REFACTOR**: Add copy-to-clipboard, syntax highlighting for JSON

**Acceptance Criteria**:

- [ ] `/api/logs/[id]` route uses GetLogEntryUseCase
- [ ] `/logs/[id]` page shows full log details
- [ ] Related logs displayed in context
- [ ] Copy and download buttons work
- [ ] E2E test passes

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/web/app/logs/[id]/page.tsx`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/web/app/api/logs/[id]/route.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/web/components/logs/log-detail.tsx`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/e2e/web/logs/log-detail-page.spec.ts`

**Dependencies**: Task 4.7

---

#### Task 5.3: Implement /logs/stream Real-time Streaming Page

**Description**: Create real-time log streaming page with SSE.

**TDD Phases**:

- **RED**: Write tests for `/api/logs/stream` SSE route and streaming page
- **GREEN**: Implement SSE route with ReadableStream, page component, EventSource hook
- **REFACTOR**: Add reconnection logic, optimize buffer management, add connection status

**Acceptance Criteria**:

- [ ] `/api/logs/stream` route streams logs via SSE
- [ ] `/logs/stream` page displays real-time logs
- [ ] Auto-scroll toggle works
- [ ] Pause/resume works
- [ ] Buffer limit prevents memory leaks
- [ ] Reconnects on connection loss
- [ ] E2E test passes

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/web/app/logs/stream/page.tsx`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/web/app/api/logs/stream/route.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/web/components/logs/log-stream.tsx`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/web/hooks/use-log-stream.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/e2e/web/logs/log-stream-page.spec.ts`

**Dependencies**: Task 4.7 (needs StreamLogsUseCase)

---

#### Task 5.4: Add Logs Navigation to Web UI

**Description**: Add logs link to main navigation.

**TDD Phases**:

- **RED**: Write test for nav link presence
- **GREEN**: Add "Logs" link to layout.tsx navigation
- **REFACTOR**: Add icon, active state styling

**Acceptance Criteria**:

- [ ] "Logs" link appears in main navigation
- [ ] Link routes to `/logs` page
- [ ] Active state styling works
- [ ] E2E test verifies navigation

**Files Modified**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/src/presentation/web/app/layout.tsx`

**Dependencies**: Tasks 5.1-5.3 complete

---

### Phase 6: Testing & Documentation (2 tasks)

**Goal**: Ensure comprehensive test coverage and documentation.

#### Task 6.1: Add E2E and Performance Tests

**Description**: Add end-to-end tests for all CLI commands and performance benchmarks.

**TDD Cycles**:

- **RED**: Write E2E tests for all CLI commands, performance benchmarks
- **GREEN**: Implement tests, verify all pass
- **REFACTOR**: Optimize slow tests, add coverage reporting

**Acceptance Criteria**:

- [ ] E2E tests for all 6 `shep logs` commands
- [ ] Performance benchmarks for logger overhead, repository queries, FTS5 search
- [ ] Security tests for log injection, SQL injection
- [ ] All tests pass
- [ ] Test coverage > 80%

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/e2e/cli/logs/*.spec.ts` (6 files)
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/performance/logger-overhead.bench.ts`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/tests/security/log-injection.test.ts`

**Dependencies**: Phase 5 complete

---

#### Task 6.2: Update Documentation

**Description**: Update all project documentation for logger system.

**TDD Cycles**:

- **RED**: N/A (documentation)
- **GREEN**: Write documentation for CLAUDE.md, developer guides, CLI reference
- **REFACTOR**: Add diagrams, examples, troubleshooting tips

**Acceptance Criteria**:

- [ ] CLAUDE.md updated with logger system architecture
- [ ] Developer guide created for using the logger
- [ ] CLI logs command reference complete
- [ ] Web UI logs pages documented
- [ ] README.md updated with logger feature

**Files Modified**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/CLAUDE.md`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/README.md`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/package.json`

**Files Created**:

- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/docs/development/logging-guide.md`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/docs/cli/logs-commands.md`
- `/home/blackpc/workspaces/shep-ai/cli/.worktrees/refactor-logger-system/docs/web/logs-ui.md`

**Dependencies**: Task 6.1

---

## Parallelization Notes

### Phase 1 (Sequential)

- All tasks must run sequentially (dependency chain)

### Phase 2 (Mostly Sequential)

- Tasks 2.1-2.4 must run sequentially (layer-by-layer migration)
- Task 2.5 can run after Task 2.4

### Phase 3 (Mostly Sequential)

- Tasks 3.1-3.3 must run sequentially
- Task 3.4 can run after Task 3.3

### Phase 4 (Highly Parallel)

- Tasks 4.1-4.6 can run **in parallel** after Task 3.4 complete
- Task 4.7 must run after all 4.1-4.6 complete

### Phase 5 (Highly Parallel)

- Tasks 5.1-5.3 can run **in parallel** after Task 4.7 complete
- Task 5.4 must run after Tasks 5.1-5.3 complete

### Phase 6 (Sequential)

- Task 6.1 must run before Task 6.2

**Estimated Parallel Savings**: Phases 4 and 5 can save ~2-3 days if parallelized across multiple developers.

---

## Acceptance Checklist

Before marking feature complete:

- [ ] All 28 tasks completed
- [ ] All tests passing (`pnpm test`)
  - [ ] Unit tests > 80% coverage
  - [ ] Integration tests pass
  - [ ] E2E tests pass
  - [ ] Performance benchmarks meet targets
- [ ] Code quality checks pass
  - [ ] Linting clean (`pnpm lint`)
  - [ ] Types valid (`pnpm typecheck`)
  - [ ] TypeSpec compilation succeeds (`pnpm tsp:compile`)
  - [ ] Formatting correct (`pnpm format:check`)
- [ ] Documentation complete
  - [ ] CLAUDE.md updated
  - [ ] Developer guides written
  - [ ] CLI reference complete
  - [ ] README.md updated
- [ ] Security checks pass
  - [ ] No sensitive data in logs
  - [ ] SQL injection tests pass
  - [ ] Log injection tests pass
  - [ ] File permissions correct (0600)
- [ ] Feature validation
  - [ ] Zero console.\* calls outside logger
  - [ ] All 6 CLI commands work
  - [ ] All 3 Web UI pages work
  - [ ] Real-time streaming works
  - [ ] Export functionality works
  - [ ] Log rotation configured
- [ ] PR created and reviewed
  - [ ] Branch: `refactor/logger-system`
  - [ ] Base: `main`
  - [ ] CI pipeline passes
  - [ ] Code review approved

---

_Task breakdown for implementation tracking_
