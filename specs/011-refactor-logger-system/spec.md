# Feature: refactor-logger-system

> Replace ad-hoc console logging with a modern, structured logging library

## Status

- **Number:** 011
- **Created:** 2026-02-08
- **Branch:** refactor/logger-system
- **Phase:** Planning

## Problem Statement

The codebase currently uses direct `console.log`, `console.error`, etc. calls scattered throughout the application. This approach has several limitations:

1. **No structured logging**: Cannot easily parse or query logs in production
2. **No log levels**: Cannot filter logs by severity (debug, info, warn, error)
3. **No context**: Missing request IDs, timestamps, or metadata for troubleshooting
4. **No transports**: Cannot redirect logs to files, monitoring systems, or third-party services
5. **Testing difficulty**: Hard to suppress or verify logs in tests

We need to adopt a modern, professional logging library that provides:

- Structured JSON logging
- Configurable log levels
- Contextual metadata (request IDs, user IDs, etc.)
- Multiple transports (console, file, remote)
- Type-safe API
- Minimal performance overhead

## Success Criteria

### Core Logger Implementation

- [ ] All `console.*` calls replaced with structured logger
- [ ] Logger configured via DI container (singleton)
- [ ] Log levels configurable via multi-layer precedence (CLI flag > ENV > Settings)
- [ ] All tests pass with logger properly mocked
- [ ] Logger output is JSON in production, pretty in development
- [ ] Zero console.\* calls remain outside of logger implementation
- [ ] Log rotation enabled for file transports

### Logs Viewing System (CLI + Web)

- [ ] CLI commands implemented: `shep logs list|show|follow|search|export|clear`
- [ ] Web UI pages implemented: `/logs` (table), `/logs/[id]` (detail), `/logs/stream` (real-time)
- [ ] Shared use cases for both CLI and Web (Clean Architecture)
- [ ] SQLite log storage with repository pattern
- [ ] Real-time log streaming via Server-Sent Events (SSE)
- [ ] Full-text search across log messages and context
- [ ] Export functionality (JSON, CSV, NDJSON formats)

## Affected Areas

### Logger Migration

| Area              | Impact | Reasoning                                        |
| ----------------- | ------ | ------------------------------------------------ |
| Infrastructure/DI | High   | Logger must be registered in DI container        |
| CLI commands      | High   | All commands use console.log/error directly      |
| Use cases         | Medium | Some use cases log errors or debug info          |
| Services          | Medium | Agent services, web server, version service log  |
| Tests             | High   | All tests must mock logger instead of console.\* |
| Error handling    | Medium | Error reporting currently uses console.error     |
| Web server        | Low    | Next.js logs separately, but API routes may log  |

### Logs Viewing System (NEW)

| Area                      | Impact | Reasoning                                               |
| ------------------------- | ------ | ------------------------------------------------------- |
| CLI commands (new)        | High   | Add 6 new subcommands under `shep logs`                 |
| Web UI (new pages)        | High   | Add 3 new routes: `/logs`, `/logs/[id]`, `/logs/stream` |
| Application (use cases)   | High   | Add 6 new use cases for log querying/management         |
| Application (ports)       | High   | Add 3 new port interfaces (repository, stream, export)  |
| Infrastructure (repos)    | High   | Implement SQLiteLogRepository with FTS                  |
| Infrastructure (services) | High   | Implement LogStreamService (SSE) and LogExporter        |
| Database                  | High   | New logs table + FTS table + indexes                    |
| DI Container              | Medium | Register new repositories and services                  |

## Dependencies

None identified.

## Size Estimate

**Extra Large (XL)** - This is a cross-cutting refactor plus a new feature affecting ~80+ files across all layers. Requires:

1. **Logger Migration** (Large):

   - Research phase to evaluate logging libraries (pino confirmed)
   - DI integration design with multi-layer configuration
   - Incremental migration strategy (can't break existing functionality)
   - Test fixture updates for all affected tests
   - Log rotation implementation

2. **Logs Viewing System** (Large):

   - 6 CLI commands with full option parsing
   - 3 Web UI pages with real-time streaming
   - 6 use cases + 3 port interfaces
   - SQLite repository implementation with FTS
   - SSE (Server-Sent Events) streaming service
   - Export system (JSON/CSV/NDJSON)

3. **Cross-cutting**:
   - Database migrations for logs table
   - DI container updates for new services
   - Documentation updates (CLAUDE.md, developer guides)
   - E2E tests for CLI and Web UI

Estimated effort: 4-6 days for a single developer.

**Detailed Design**: See [logs-ui-design.md](./logs-ui-design.md) for complete architecture.

## Decisions Made

- [x] **Logger Library**: pino - Fastest performance, JSON-first, minimal overhead, excellent TypeScript support
- [x] **Log Rotation**: Yes - Include daily/size-based rotation for production readiness
- [x] **Logger Scope**: Single shared logger instance configured via DI (consistent across CLI and web)
- [x] **Configuration**: Multi-layered with precedence order:
  1. CLI flag (`--log-level`) - highest priority
  2. Environment variable (`LOG_LEVEL`)
  3. Settings (persisted in SQLite) - fallback default

## Open Questions

None - all requirements clarified and ready for research phase.

---

_Generated by `/shep-kit:new-feature` — proceed with `/shep-kit:research`_
