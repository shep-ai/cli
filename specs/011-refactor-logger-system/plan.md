# Plan: refactor-logger-system

> Implementation plan for 011-refactor-logger-system

## Status

- **Phase:** Planning
- **Updated:** 2026-02-08

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                            │
├──────────────────────────────┬───────────────────────────────────────┤
│ CLI Commands                 │ Web UI Pages                          │
│ ├─ shep logs list           │ ├─ /logs (table view)                 │
│ ├─ shep logs show           │ ├─ /logs/[id] (detail view)           │
│ ├─ shep logs follow         │ └─ /logs/stream (real-time)           │
│ ├─ shep logs search         │                                        │
│ ├─ shep logs export         │ Web API Routes                         │
│ └─ shep logs clear          │ ├─ /api/logs (GET)                    │
│                              │ ├─ /api/logs/[id] (GET)               │
│ All existing commands        │ └─ /api/logs/stream (GET/SSE)         │
│ (settings, version, etc.)    │                                        │
└──────────────────────────────┴───────────────────────────────────────┘
                                 ↓
┌──────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                             │
├──────────────────────────────────────────────────────────────────────┤
│ Use Cases (Logs Viewing):                                            │
│ ├─ ListLogsUseCase(filters, pagination) → LogListResult             │
│ ├─ GetLogEntryUseCase(id) → LogEntry                                │
│ ├─ SearchLogsUseCase(query, filters) → LogEntry[]                   │
│ ├─ StreamLogsUseCase(filters) → AsyncGenerator<LogEntry>            │
│ ├─ ExportLogsUseCase(format, filters) → ExportResult                │
│ └─ ClearLogsUseCase(beforeDate) → ClearLogsResult                   │
│                                                                       │
│ Existing Use Cases (will use ILogger):                               │
│ ├─ InitializeSettingsUseCase                                         │
│ ├─ LoadSettingsUseCase                                               │
│ ├─ UpdateSettingsUseCase                                             │
│ ├─ ConfigureAgentUseCase                                             │
│ └─ ValidateAgentAuthUseCase                                          │
│                                                                       │
│ Ports (Output Interfaces):                                           │
│ ├─ ILogger (new) - Structured logging interface                     │
│ ├─ ILogRepository (new) - Log storage and querying                  │
│ ├─ ILogStreamService (new) - Real-time log streaming                │
│ └─ ILogExporter (new) - Export logs to files                        │
└──────────────────────────────────────────────────────────────────────┘
                                 ↓
┌──────────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                            │
├──────────────────────────────────────────────────────────────────────┤
│ Logger Implementation:                                                │
│ ├─ PinoLogger (implements ILogger)                                   │
│ │  ├─ Development: pino-pretty (colorized, human-readable)          │
│ │  └─ Production: JSON output + pino-roll (log rotation)            │
│ └─ LoggerConfigFactory (multi-layer: CLI > ENV > Settings)          │
│                                                                       │
│ Log Storage:                                                          │
│ ├─ SQLiteLogRepository (implements ILogRepository)                   │
│ │  ├─ Main table: logs (id, timestamp, level, source, message...)   │
│ │  ├─ FTS5 table: logs_fts (full-text search)                       │
│ │  └─ Indexes: timestamp, level, source                             │
│ └─ Database Migration: 003-create-logs-table.sql                    │
│                                                                       │
│ Log Services:                                                         │
│ ├─ LogStreamService (implements ILogStreamService)                   │
│ │  └─ EventEmitter-based SSE streaming with filters                 │
│ └─ LogExporter (implements ILogExporter)                             │
│    └─ Formats: JSON, NDJSON, CSV (with optional gzip)               │
│                                                                       │
│ DI Container Registration:                                            │
│ ├─ ILogger → PinoLogger (singleton)                                 │
│ ├─ ILogRepository → SQLiteLogRepository (singleton)                 │
│ ├─ ILogStreamService → LogStreamService (singleton)                 │
│ └─ ILogExporter → LogExporter (singleton)                           │
└──────────────────────────────────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: Core Logger Implementation (DI, Configuration, Pino Setup)

**Goal**: Add structured logger to DI container with multi-layer configuration, ready to replace console.\* calls.

**TDD Cycles**:

**RED Phase (Tests First)**:

1. Write test for `ILogger` interface contract (debug, info, warn, error methods)
2. Write test for `LoggerConfigFactory` with precedence (CLI > ENV > Settings)
3. Write test for `PinoLogger` instantiation with different log levels
4. Write test for log output format (JSON in production, pretty in dev)
5. Write test for DI container registration and resolution

**GREEN Phase (Minimal Implementation)**:

1. Create `ILogger` interface in `application/ports/output/logger.interface.ts`
2. Create `PinoLogger` class in `infrastructure/services/logger/pino-logger.service.ts`
3. Install dependencies: `pino`, `pino-roll`, `pino-pretty` (dev)
4. Implement `LoggerConfigFactory` with multi-layer precedence
5. Register logger in DI container (`infrastructure/di/container.ts`)
6. Add `logLevel` field to Settings domain model (TypeSpec)
7. Run TypeSpec compilation to generate updated types

**REFACTOR Phase**:

1. Extract log transport configuration into separate factory
2. Add JSDoc documentation for all logger interfaces
3. Optimize pino configuration for production (worker threads)
4. Add environment detection for dev/prod mode switching

**Acceptance Criteria**:

- [ ] `ILogger` interface defined with all 4 log levels
- [ ] `PinoLogger` implements `ILogger` correctly
- [ ] Logger resolves via DI container
- [ ] Configuration precedence works (CLI > ENV > Settings)
- [ ] Dev mode outputs pretty logs, prod outputs JSON
- [ ] All tests pass

**Files Created**:

- `src/application/ports/output/logger.interface.ts`
- `src/infrastructure/services/logger/pino-logger.service.ts`
- `src/infrastructure/services/logger/logger-config.factory.ts`
- `src/infrastructure/services/logger/transports/console.transport.ts`
- `src/infrastructure/services/logger/transports/file.transport.ts`
- `tests/unit/infrastructure/services/logger/pino-logger.test.ts`
- `tests/unit/infrastructure/services/logger/logger-config.factory.test.ts`

**Files Modified**:

- `src/infrastructure/di/container.ts` (register ILogger)
- `tsp/domain/entities/settings.tsp` (add logLevel field to SystemConfig)
- `package.json` (add pino, pino-roll, pino-pretty)

---

### Phase 2: Incremental Logger Migration (Layer by Layer)

**Goal**: Replace all `console.*` calls with structured logger, starting from infrastructure and moving outward.

**TDD Cycles**:

**RED Phase (Tests First)**:

1. Update all existing tests to mock `ILogger` instead of `console.*`
2. Write tests verifying no direct console usage in migrated files
3. Add ESLint rule tests for `no-console` enforcement

**GREEN Phase (Minimal Implementation)**:

1. **Infrastructure Layer** (repositories, services):
   - Inject `ILogger` into `SQLiteSettingsRepository`
   - Inject `ILogger` into `AgentValidatorService`, `VersionService`, `WebServerService`
   - Replace all `console.*` with `logger.debug/info/warn/error`
2. **Application Layer** (use cases):
   - Inject `ILogger` into all 5 existing use cases
   - Replace error logging with `logger.error` + context
3. **Presentation Layer** (CLI commands):
   - Inject `ILogger` into CLI commands (via DI resolution)
   - Replace `console.log` with `logger.info`, `console.error` with `logger.error`
   - Keep user-facing output (tables, formatted text) as direct `console.log` (not logger)
4. **Test Layer**:
   - Update all test files to import `'reflect-metadata'` first
   - Create `tests/helpers/mock-logger.ts` factory
   - Replace all test console mocks with `createMockLogger()`

**REFACTOR Phase**:

1. Review all log messages for consistency (structured context, not string interpolation)
2. Add contextual metadata (userId, repositoryPath, etc.) where relevant
3. Standardize log sources (e.g., "cli:settings", "use-case:agent", "repository:db")

**Acceptance Criteria**:

- [ ] Zero `console.*` calls remain outside logger implementation
- [ ] All infrastructure services log via `ILogger`
- [ ] All use cases log via `ILogger`
- [ ] All CLI commands log via `ILogger`
- [ ] All tests use `createMockLogger()` helper
- [ ] ESLint `no-console` rule enabled
- [ ] All existing tests still pass

**Files Modified** (~40 files):

- `src/infrastructure/repositories/sqlite-settings.repository.ts`
- `src/infrastructure/services/agents/agent-validator.service.ts`
- `src/infrastructure/services/version.service.ts`
- `src/infrastructure/services/web-server.service.ts`
- `src/application/use-cases/settings/*.ts` (3 files)
- `src/application/use-cases/agents/*.ts` (2 files)
- `src/presentation/cli/commands/**/*.ts` (~10 files)
- `tests/**/*.test.ts` (~30 test files)

**Files Created**:

- `tests/helpers/mock-logger.ts`

---

### Phase 3: Logs Storage & Repository (SQLite + FTS5)

**Goal**: Persist logs to SQLite with full-text search capability.

**TDD Cycles**:

**RED Phase (Tests First)**:

1. Write test for `ILogRepository.insert()` - creates log entry
2. Write test for `ILogRepository.findAll()` with filters (level, source, date range)
3. Write test for `ILogRepository.findById()` - retrieves single log
4. Write test for `ILogRepository.count()` - counts with filters
5. Write test for `ILogRepository.search()` - FTS5 full-text search
6. Write test for `ILogRepository.deleteBefore()` - retention policy
7. Write test for database migration creating logs table + FTS5

**GREEN Phase (Minimal Implementation)**:

1. Define `ILogRepository` interface in `application/ports/output/log-repository.interface.ts`
2. Create database migration `003-create-logs-table.sql`:
   - Main table: `logs` (id, timestamp, level, source, message, context, stack_trace)
   - FTS5 virtual table: `logs_fts` (message, content=logs)
   - Triggers for auto-sync to FTS5
   - Indexes: timestamp (DESC), level, source
3. Implement `SQLiteLogRepository` with all CRUD methods
4. Hook PinoLogger to insert logs into repository (background async)
5. Register `ILogRepository` in DI container

**REFACTOR Phase**:

1. Add connection pooling for log writes (batch inserts)
2. Optimize FTS5 query performance (test with 100k+ logs)
3. Add query builder abstraction for filter composition
4. Implement pagination helpers

**Acceptance Criteria**:

- [ ] Database migration creates logs table successfully
- [ ] FTS5 full-text search works with boolean operators
- [ ] All repository methods handle filters correctly
- [ ] Logs are persisted from PinoLogger automatically
- [ ] Repository handles 10k+ log entries efficiently (< 100ms queries)
- [ ] All repository tests pass

**Files Created**:

- `src/application/ports/output/log-repository.interface.ts`
- `src/infrastructure/repositories/sqlite-log.repository.ts`
- `src/infrastructure/persistence/sqlite/migrations/003-create-logs-table.sql`
- `tests/unit/infrastructure/repositories/sqlite-log.repository.test.ts`
- `tests/integration/repositories/log-repository.integration.test.ts`

**Files Modified**:

- `src/infrastructure/services/logger/pino-logger.service.ts` (add repository hook)
- `src/infrastructure/di/container.ts` (register ILogRepository)

---

### Phase 4: CLI Commands (6 New Subcommands)

**Goal**: Add `shep logs` command with 6 subcommands for log viewing/management.

**TDD Cycles** (per subcommand):

#### 4.1: `shep logs list` Command

**RED Phase**:

1. Write test for ListLogsUseCase with default filters
2. Write test for pagination (limit, offset)
3. Write test for level filtering
4. Write test for date range filtering
5. Write test for CLI table output formatting
6. Write test for JSON output format

**GREEN Phase**:

1. Create `ListLogsUseCase` in `application/use-cases/logs/list-logs.use-case.ts`
2. Create `createLogsListCommand()` in `presentation/cli/commands/logs/list.command.ts`
3. Add table formatter in `presentation/cli/ui/formatters/logs.ts`
4. Wire up use case with repository via DI

**REFACTOR Phase**:

1. Extract date parsing logic into helper
2. Add color coding for log levels in table
3. Optimize table rendering for large datasets

**Acceptance Criteria**:

- [ ] Lists logs with default limit (50 entries)
- [ ] Filters by level, source, date range work
- [ ] Pagination works correctly
- [ ] Table format displays clearly
- [ ] JSON format exports valid JSON

#### 4.2: `shep logs show <id>` Command

**RED Phase**:

1. Write test for GetLogEntryUseCase
2. Write test for detailed pretty output
3. Write test for related logs (±1 second)
4. Write test for JSON export

**GREEN Phase**:

1. Create `GetLogEntryUseCase`
2. Create `createLogsShowCommand()`
3. Add pretty formatter for single log entry

**REFACTOR Phase**:

1. Add syntax highlighting for stack traces
2. Improve context object formatting

**Acceptance Criteria**:

- [ ] Shows full log entry with all metadata
- [ ] Displays related logs in context
- [ ] Pretty format is readable
- [ ] JSON format exports complete entry

#### 4.3: `shep logs follow` Command

**RED Phase**:

1. Write test for StreamLogsUseCase with filters
2. Write test for real-time log emission
3. Write test for graceful shutdown (Ctrl+C)

**GREEN Phase**:

1. Create `StreamLogsUseCase`
2. Create `createLogsFollowCommand()`
3. Hook into LogStreamService for real-time updates

**REFACTOR Phase**:

1. Add debouncing for rapid log bursts
2. Optimize filter application on stream

**Acceptance Criteria**:

- [ ] Tails logs in real-time like `tail -f`
- [ ] Filters apply to stream correctly
- [ ] Ctrl+C stops gracefully
- [ ] No memory leaks on long-running streams

#### 4.4: `shep logs search <query>` Command

**RED Phase**:

1. Write test for SearchLogsUseCase with FTS5 query
2. Write test for wildcard searches
3. Write test for boolean operators (AND, OR, NOT)
4. Write test for result highlighting

**GREEN Phase**:

1. Create `SearchLogsUseCase`
2. Create `createLogsSearchCommand()`
3. Add highlight formatter

**REFACTOR Phase**:

1. Optimize FTS5 query parsing
2. Add relevance scoring (bm25)

**Acceptance Criteria**:

- [ ] Full-text search works across all logs
- [ ] Wildcard and boolean queries work
- [ ] Results are ranked by relevance
- [ ] Matches are highlighted in output

#### 4.5: `shep logs export` Command

**RED Phase**:

1. Write test for ExportLogsUseCase
2. Write test for JSON export format
3. Write test for NDJSON export format
4. Write test for CSV export format
5. Write test for gzip compression

**GREEN Phase**:

1. Create `ExportLogsUseCase`
2. Create `ILogExporter` interface
3. Implement `LogExporter` with all 3 formats
4. Create `createLogsExportCommand()`

**REFACTOR Phase**:

1. Add streaming export for large datasets
2. Optimize CSV escaping

**Acceptance Criteria**:

- [ ] Exports to JSON, NDJSON, CSV correctly
- [ ] Filters apply before export
- [ ] Gzip compression works
- [ ] Large exports don't crash (streaming)

#### 4.6: `shep logs clear` Command

**RED Phase**:

1. Write test for ClearLogsUseCase dry-run mode
2. Write test for actual deletion
3. Write test for confirmation prompt
4. Write test for breakdown by level

**GREEN Phase**:

1. Create `ClearLogsUseCase`
2. Create `createLogsClearCommand()`
3. Add confirmation prompt logic

**REFACTOR Phase**:

1. Add progress indicator for large deletions
2. Optimize bulk delete performance

**Acceptance Criteria**:

- [ ] Dry-run shows what would be deleted
- [ ] Confirmation prompt works
- [ ] Deletion is correct and safe
- [ ] Breakdown by level is accurate

**Summary Files for Phase 4**:

**Files Created** (~30 files):

- `src/application/use-cases/logs/list-logs.use-case.ts`
- `src/application/use-cases/logs/get-log-entry.use-case.ts`
- `src/application/use-cases/logs/search-logs.use-case.ts`
- `src/application/use-cases/logs/stream-logs.use-case.ts`
- `src/application/use-cases/logs/export-logs.use-case.ts`
- `src/application/use-cases/logs/clear-logs.use-case.ts`
- `src/application/ports/output/log-stream.interface.ts`
- `src/application/ports/output/log-exporter.interface.ts`
- `src/infrastructure/services/log-stream.service.ts`
- `src/infrastructure/services/log-exporter.service.ts`
- `src/presentation/cli/commands/logs/index.ts`
- `src/presentation/cli/commands/logs/list.command.ts`
- `src/presentation/cli/commands/logs/show.command.ts`
- `src/presentation/cli/commands/logs/follow.command.ts`
- `src/presentation/cli/commands/logs/search.command.ts`
- `src/presentation/cli/commands/logs/export.command.ts`
- `src/presentation/cli/commands/logs/clear.command.ts`
- `src/presentation/cli/ui/formatters/logs.ts`
- `tests/unit/application/use-cases/logs/*.test.ts` (6 files)
- `tests/unit/presentation/cli/commands/logs/*.test.ts` (6 files)
- `tests/integration/cli/logs/*.integration.test.ts` (6 files)

**Files Modified**:

- `src/presentation/cli/index.ts` (add `shep logs` command)
- `src/infrastructure/di/container.ts` (register new use cases, services)

---

### Phase 5: Web UI (3 Pages + SSE Streaming)

**Goal**: Add web-based log viewing with real-time streaming.

**TDD Cycles**:

#### 5.1: `/logs` Table View Page

**RED Phase**:

1. Write test for `/api/logs` route using ListLogsUseCase
2. Write test for React component with table rendering
3. Write test for filter controls (level, source, date)
4. Write test for pagination controls

**GREEN Phase**:

1. Create API route `/api/logs/route.ts`
2. Create page component `app/logs/page.tsx`
3. Create `LogsTable` component
4. Create `LogsFilters` component
5. Wire up API client with filters

**REFACTOR Phase**:

1. Add loading states and skeletons
2. Optimize table rendering (virtualization for 1000+ rows)
3. Add export button

**Acceptance Criteria**:

- [ ] Table displays logs with pagination
- [ ] Filters update results correctly
- [ ] API route uses shared use case
- [ ] UI is responsive and fast

#### 5.2: `/logs/[id]` Detail View Page

**RED Phase**:

1. Write test for `/api/logs/[id]` route
2. Write test for detail page rendering
3. Write test for related logs display

**GREEN Phase**:

1. Create API route `/api/logs/[id]/route.ts`
2. Create page component `app/logs/[id]/page.tsx`
3. Create `LogDetail` component

**REFACTOR Phase**:

1. Add copy-to-clipboard for context/stack
2. Add syntax highlighting for JSON context

**Acceptance Criteria**:

- [ ] Shows full log details
- [ ] Related logs appear in context
- [ ] Copy and download work

#### 5.3: `/logs/stream` Real-time Streaming Page

**RED Phase**:

1. Write test for `/api/logs/stream` SSE route
2. Write test for EventSource client connection
3. Write test for auto-scroll toggle
4. Write test for pause/resume

**GREEN Phase**:

1. Create SSE route `/api/logs/stream/route.ts` using ReadableStream
2. Create page component `app/logs/stream/page.tsx`
3. Create EventSource hook for SSE connection
4. Add auto-scroll and buffer limit logic

**REFACTOR Phase**:

1. Add reconnection logic on disconnect
2. Optimize buffer management (prevent memory leaks)
3. Add connection status indicator

**Acceptance Criteria**:

- [ ] Real-time logs stream via SSE
- [ ] Auto-scroll toggles correctly
- [ ] Buffer limit prevents memory leaks
- [ ] Reconnects on connection loss

**Summary Files for Phase 5**:

**Files Created** (~25 files):

- `src/presentation/web/app/logs/page.tsx`
- `src/presentation/web/app/logs/[id]/page.tsx`
- `src/presentation/web/app/logs/stream/page.tsx`
- `src/presentation/web/app/api/logs/route.ts`
- `src/presentation/web/app/api/logs/[id]/route.ts`
- `src/presentation/web/app/api/logs/stream/route.ts`
- `src/presentation/web/components/logs/logs-table.tsx`
- `src/presentation/web/components/logs/logs-filters.tsx`
- `src/presentation/web/components/logs/log-detail.tsx`
- `src/presentation/web/components/logs/log-stream.tsx`
- `src/presentation/web/hooks/use-logs.ts`
- `src/presentation/web/hooks/use-log-stream.ts`
- `tests/e2e/web/logs/*.spec.ts` (3 files)

**Files Modified**:

- `src/presentation/web/app/layout.tsx` (add logs nav link)

---

### Phase 6: Testing & Documentation

**Goal**: Ensure comprehensive test coverage and update all documentation.

**TDD Cycles**:

**RED Phase**:

1. Write E2E tests for all CLI commands
2. Write E2E tests for all Web UI pages
3. Write performance tests (10k+ logs)
4. Write security tests (log injection, SQL injection)

**GREEN Phase**:

1. Implement E2E tests using Vitest + Playwright
2. Add benchmark tests for logger performance
3. Add security audit tests

**REFACTOR Phase**:

1. Optimize slow tests
2. Add test coverage reporting
3. Document test patterns

**Acceptance Criteria**:

- [ ] Unit test coverage > 80%
- [ ] All E2E scenarios pass
- [ ] Performance benchmarks meet targets
- [ ] Security tests pass

**Documentation Updates**:

**Files Modified**:

- `CLAUDE.md` - Add logger system documentation
- `docs/development/architecture.md` - Update with logger architecture
- `docs/cli/README.md` - Document `shep logs` commands
- `README.md` - Update feature list
- `package.json` - Update description

**Files Created**:

- `docs/development/logging-guide.md` - How to use the logger
- `docs/cli/logs-commands.md` - Full `shep logs` command reference
- `docs/web/logs-ui.md` - Web UI logs pages documentation

---

## Files to Create/Modify Summary

### New Files (Total: ~90)

| Category            | Count | Location                                             |
| ------------------- | ----- | ---------------------------------------------------- |
| Application Layer   | 8     | `src/application/use-cases/logs/*.ts`                |
| Application Ports   | 3     | `src/application/ports/output/log-*.interface.ts`    |
| Infrastructure      | 6     | `src/infrastructure/services/logger/*.ts`            |
| Infrastructure      | 4     | `src/infrastructure/services/log-*.service.ts`       |
| Infrastructure      | 1     | `src/infrastructure/repositories/sqlite-log.repo.ts` |
| Infrastructure      | 1     | `src/infrastructure/persistence/migrations/*.sql`    |
| Presentation (CLI)  | 8     | `src/presentation/cli/commands/logs/*.ts`            |
| Presentation (CLI)  | 1     | `src/presentation/cli/ui/formatters/logs.ts`         |
| Presentation (Web)  | 9     | `src/presentation/web/app/(logs pages)/*.tsx`        |
| Presentation (Web)  | 6     | `src/presentation/web/components/logs/*.tsx`         |
| Presentation (Web)  | 2     | `src/presentation/web/hooks/use-log*.ts`             |
| Tests (Unit)        | 20    | `tests/unit/**/*.test.ts`                            |
| Tests (Integration) | 8     | `tests/integration/**/*.test.ts`                     |
| Tests (E2E)         | 9     | `tests/e2e/**/*.spec.ts`                             |
| Tests (Helpers)     | 1     | `tests/helpers/mock-logger.ts`                       |
| Documentation       | 3     | `docs/**/*.md`                                       |

### Modified Files (Total: ~50)

| Category           | Count | Examples                                             |
| ------------------ | ----- | ---------------------------------------------------- |
| Infrastructure     | 1     | `src/infrastructure/di/container.ts`                 |
| Infrastructure     | 4     | `src/infrastructure/services/*.service.ts`           |
| Infrastructure     | 1     | `src/infrastructure/repositories/sqlite-settings.ts` |
| Application        | 5     | `src/application/use-cases/**/*.ts`                  |
| Presentation (CLI) | 10    | `src/presentation/cli/commands/**/*.ts`              |
| Presentation (Web) | 1     | `src/presentation/web/app/layout.tsx`                |
| Domain (TypeSpec)  | 1     | `tsp/domain/entities/settings.tsp`                   |
| Tests              | 25    | `tests/**/*.test.ts`                                 |
| Config             | 1     | `package.json`                                       |
| Documentation      | 1     | `CLAUDE.md`, `README.md`                             |

---

## Testing Strategy

### Unit Tests

**Domain Layer**:

- No tests needed (no logger in domain)

**Application Layer**:

- All 6 log use cases (ListLogs, GetLogEntry, SearchLogs, StreamLogs, ExportLogs, ClearLogs)
- Updated tests for existing use cases (mocked ILogger)

**Infrastructure Layer**:

- `PinoLogger` - log level filtering, output format (JSON/pretty)
- `LoggerConfigFactory` - multi-layer precedence (CLI > ENV > Settings)
- `SQLiteLogRepository` - CRUD operations, FTS5 search, pagination
- `LogStreamService` - event emission, filtering, async iteration
- `LogExporter` - JSON/NDJSON/CSV export, compression

**Presentation Layer (CLI)**:

- All 6 `shep logs` commands - argument parsing, output formatting
- Updated tests for existing commands (mocked logger)

**Test Coverage Target**: > 80% overall, 100% for critical paths (logger, repository)

### Integration Tests

**Database Integration**:

- Log repository with real SQLite database (in-memory)
- FTS5 search with 1000+ sample logs
- Migration execution and rollback

**DI Container Integration**:

- Logger resolution and injection
- Use case dependency wiring

**Test Coverage Target**: All repository methods, all use cases

### E2E Tests

**CLI E2E** (using spawned process):

- `shep logs list` - verify table output
- `shep logs search` - verify FTS5 results
- `shep logs export` - verify file creation
- `shep logs follow` - verify real-time streaming
- All existing CLI commands - verify logger integration

**Web UI E2E** (using Playwright):

- `/logs` page - table rendering, filters, pagination
- `/logs/[id]` page - detail view, related logs
- `/logs/stream` page - SSE connection, auto-scroll

**Test Coverage Target**: All user-facing workflows

### Performance Tests

**Benchmarks**:

- Logger overhead: < 5% CPU vs console.log baseline
- Repository queries: < 100ms for 100k+ logs
- FTS5 search: < 200ms for complex queries on 1M+ logs
- SSE streaming: < 50ms latency for new log events

**Load Tests**:

- Sustained logging: 10k+ log entries/sec
- Concurrent SSE clients: 50+ simultaneous streams

---

## Risk Mitigation

| Risk                                 | Likelihood | Impact | Mitigation                                                      |
| ------------------------------------ | ---------- | ------ | --------------------------------------------------------------- |
| **Breaking existing functionality**  | Medium     | High   | Incremental migration (layer by layer), keep all tests green    |
| **Performance degradation**          | Low        | High   | Benchmark logger overhead, use pino (fastest), worker threads   |
| **FTS5 search performance issues**   | Low        | Medium | Index optimization, query profiling, limit result size          |
| **SSE connection instability**       | Medium     | Medium | Auto-reconnection, buffer limits, connection monitoring         |
| **Log injection attacks**            | Low        | Medium | Pino auto-escapes JSON, use context objects (not string interp) |
| **Disk space exhaustion**            | Medium     | Medium | Log rotation (pino-roll), retention policy (30 days default)    |
| **Test suite slowdown**              | Medium     | Low    | Mock ILogger in tests, avoid real I/O, use in-memory DB         |
| **Migration complexity (80+ files)** | High       | Medium | Detailed task breakdown, checkpoint after each layer            |
| **TypeSpec compilation breaking**    | Low        | High   | Add Settings.logLevel field carefully, test compilation early   |

---

## Rollback Plan

### Immediate Rollback (Within Phase)

If a phase fails partway through:

1. **Revert Git Commits**: Use `git revert` or `git reset --hard` to previous checkpoint
2. **Restore Database**: Run down-migrations for any schema changes
3. **Restore Dependencies**: `pnpm install` from previous package.json
4. **Verify Tests**: Ensure all tests pass after rollback

### Phase-Level Rollback

**Phase 1 Rollback**:

- Remove logger from DI container
- Revert TypeSpec changes to Settings
- Uninstall pino dependencies
- No runtime impact (logger not used yet)

**Phase 2 Rollback**:

- Re-add console.\* calls (git revert all Phase 2 commits)
- Remove ILogger injections
- Restore test mocks for console
- **Risk**: May lose log data from testing

**Phase 3 Rollback**:

- Drop logs table and FTS5 virtual table
- Remove log repository from DI
- Unhook repository from PinoLogger
- **Risk**: Permanent loss of stored logs (acceptable for rollback)

**Phase 4 Rollback**:

- Remove `shep logs` command from CLI
- Unregister use cases from DI
- No data loss (logs still stored)

**Phase 5 Rollback**:

- Remove web UI pages and API routes
- No impact on CLI or stored logs

**Phase 6 Rollback**:

- Revert documentation changes
- Remove E2E tests (optional)

### Full Rollback Strategy

If the entire feature must be abandoned:

1. **Create rollback branch**: `git checkout -b rollback/logger-system`
2. **Revert all commits** from Phase 6 to Phase 1 in reverse order
3. **Clean up database**: Drop logs table if created
4. **Remove dependencies**: `pnpm remove pino pino-roll pino-pretty`
5. **Restore console.\* calls**: Re-add console logging where needed
6. **Test thoroughly**: Run full test suite, manual testing
7. **Document rollback**: Update CHANGELOG.md with reason

### Checkpoints for Safe Rollback

Create git tags at each phase completion:

- `checkpoint/logger-phase-1-complete`
- `checkpoint/logger-phase-2-complete`
- `checkpoint/logger-phase-3-complete`
- `checkpoint/logger-phase-4-complete`
- `checkpoint/logger-phase-5-complete`

These tags allow easy rollback to known-good states.

---

## Dependencies

### New NPM Packages

```json
{
  "dependencies": {
    "pino": "^9.7.0",
    "pino-roll": "^1.3.0"
  },
  "devDependencies": {
    "pino-pretty": "^14.1.0"
  }
}
```

**No breaking changes**: All existing dependencies remain unchanged.

### External Dependencies

- **SQLite FTS5**: Built into better-sqlite3 (already installed)
- **Node.js 18+**: Already required by project

---

## Deployment Considerations

### Production Checklist

Before deploying to production:

- [ ] Log rotation configured (daily, max 100MB per file, 30 day retention)
- [ ] Log level set to `info` or higher (no `debug` in prod)
- [ ] File permissions secured (0600 for log files)
- [ ] Sensitive data redaction enabled (passwords, API keys)
- [ ] Disk space monitoring enabled
- [ ] Log aggregation configured (if using external service)

### Environment Variables

```bash
LOG_LEVEL=info              # Overrides Settings default
LOG_FILE=/var/log/shep.log  # Custom log file location (optional)
NODE_ENV=production         # Enables JSON output, disables pino-pretty
```

### Docker Considerations

If running in Docker:

- Mount `/var/log` volume for persistent logs
- Set `LOG_LEVEL` via environment variable
- Use structured logging (JSON) for container logs
- Forward logs to stdout for container orchestration (Kubernetes, Docker Compose)

---

_Updated by `/shep-kit:plan` — see tasks.md for detailed breakdown_
