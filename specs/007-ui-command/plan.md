# Plan: ui-command

> Implementation plan for 007-ui-command

## Status

- **Phase:** Planning
- **Updated:** 2026-02-05

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    CLI Bootstrap                      │
│   initializeContainer() → DI Container ready         │
│   initializeSettings() → Settings singleton ready    │
└─────────────────┬───────────────────────────────────┘
                  │
         ┌────────┴────────┐
         │  shep ui --port  │  (presentation/cli)
         └────────┬────────┘
                  │
    ┌─────────────┴──────────────┐
    │     WebServerService       │  (infrastructure/services)
    │  ┌──────────────────────┐  │
    │  │  findAvailablePort() │  │  (infrastructure/services)
    │  │  node:net try-bind   │  │
    │  └──────────┬───────────┘  │
    │             │              │
    │  ┌──────────┴───────────┐  │
    │  │  next({ dev, dir })  │  │  Next.js programmatic API
    │  │  app.prepare()       │  │
    │  │  http.createServer() │  │  node:http
    │  └──────────────────────┘  │
    └────────────────────────────┘
                  │
    ┌─────────────┴──────────────┐
    │   Next.js In-Process       │
    │   API routes / pages       │
    │   container.resolve(...)   │  ← Direct access to DI container
    │   getSettings()            │  ← Direct access to settings
    └────────────────────────────┘
```

The key insight: Next.js runs in the same Node.js process as the CLI. API routes and server components can directly `import { container }` and `container.resolve(UseCase)` to access all application/domain layer services.

## Implementation Strategy

### Phase 1: Port Service (TDD)

Implement `findAvailablePort()` and `isPortAvailable()` using `node:net`.

- **RED**: Write tests for port checking (available port, occupied port, auto-increment, max attempts exceeded, port validation)
- **GREEN**: Implement with `net.createServer().listen()` try-bind pattern
- **REFACTOR**: Extract constants, clean up error handling

### Phase 2: Web Server Service (TDD)

Implement `WebServerService` that wraps Next.js programmatic API + HTTP server lifecycle.

- **RED**: Write tests for service (start with port, graceful shutdown, error on prepare failure)
- **GREEN**: Implement using `next()`, `app.prepare()`, `http.createServer()`, signal handlers
- **REFACTOR**: Clean up lifecycle management, extract shutdown logic

### Phase 3: UI Command (TDD)

Implement `createUiCommand()` as a Commander command with `--port` option.

- **RED**: Write tests for command structure (name, options), port validation, service invocation
- **GREEN**: Implement command that calls port service → web server service → prints URL
- **REFACTOR**: Align with CLI design system patterns

### Phase 4: Integration & Wiring

Register command in CLI entry point, run full integration test.

- Register `createUiCommand()` in `src/presentation/cli/index.ts`
- Verify end-to-end flow with manual testing

## Files to Create/Modify

### New Files

| File                                                            | Purpose                               |
| --------------------------------------------------------------- | ------------------------------------- |
| `src/infrastructure/services/port.service.ts`                   | Port availability checking            |
| `src/infrastructure/services/web-server.service.ts`             | Next.js programmatic server lifecycle |
| `src/presentation/cli/commands/ui.command.ts`                   | `shep ui` CLI command                 |
| `tests/unit/infrastructure/services/port.service.test.ts`       | Unit tests for port service           |
| `tests/unit/infrastructure/services/web-server.service.test.ts` | Unit tests for web server service     |
| `tests/unit/presentation/cli/commands/ui.command.test.ts`       | Unit tests for ui command             |

### Modified Files

| File                            | Changes                                 |
| ------------------------------- | --------------------------------------- |
| `src/presentation/cli/index.ts` | Import and register `createUiCommand()` |

## Testing Strategy

### Unit Tests (RED first in each phase)

- **Port service**: `isPortAvailable()` returns true for free port, false for occupied; `findAvailablePort()` skips occupied ports; throws after max attempts; validates port range (1024-65535)
- **Web server service**: Mocks `next()` and `http.createServer()`; verifies `app.prepare()` is called; verifies `server.listen()` with correct port; verifies shutdown calls `server.close()` + `app.close()`
- **UI command**: Creates valid Commander command named `ui`; has `--port` option with number parsing; calls web server service on execution; outputs URL using CLI design system

### Integration Tests

Not needed for this feature — the port service uses `node:net` (difficult to integration-test without actually binding ports) and the web server service wraps Next.js (too heavy for automated integration tests). Manual verification in Phase 4 covers the integration path.

### E2E Tests

Deferred — starting the full Next.js server in E2E is expensive. The unit tests with mocked Next.js provide sufficient coverage. E2E can be added later when the web UI has real pages to test.

## Risk Mitigation

| Risk                                       | Mitigation                                                      |
| ------------------------------------------ | --------------------------------------------------------------- |
| Next.js `app.close()` doesn't exit cleanly | HTTP `server.close()` first, then `process.exit(0)` as fallback |
| Port still occupied between check and bind | Acceptable TOCTOU for dev tool; user can retry or use `--port`  |
| Next.js programmatic API changes in future | Pin to `next@^16`, API stable since Next.js 9                   |
| High memory from in-process Next.js        | Expected for dev tool; document in `shep ui --help`             |

## Rollback Plan

All changes are additive (new files + one import line in `index.ts`). Rollback by removing the new files and the `addCommand` line. No database migrations or schema changes.

---

_Updated by `/shep-kit:plan` — see tasks.md for detailed breakdown_
