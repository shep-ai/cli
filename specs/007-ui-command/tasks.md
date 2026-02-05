# Tasks: ui-command

> Task breakdown for 007-ui-command

## Status

- **Phase:** Implementation
- **Updated:** 2026-02-05

## Task List

### Phase 1: Port Service (TDD)

- [ ] **RED**: Write failing tests for `isPortAvailable()` — returns true for free port, false for occupied port
- [ ] **RED**: Write failing tests for `findAvailablePort()` — finds next available port, throws after max attempts, validates port range
- [ ] **GREEN**: Implement `isPortAvailable()` using `node:net` try-bind pattern
- [ ] **GREEN**: Implement `findAvailablePort()` with loop and max attempts
- [ ] **REFACTOR**: Extract constants (DEFAULT_PORT=4050, MAX_ATTEMPTS=20, MIN/MAX port range)
- [ ] Verify all port service tests pass

### Phase 2: Web Server Service (TDD)

- [ ] **RED**: Write failing tests for `WebServerService.start()` — calls `next()` with correct options, calls `app.prepare()`, creates HTTP server, listens on port
- [ ] **RED**: Write failing tests for `WebServerService.stop()` — calls `server.close()` and `app.close()`
- [ ] **RED**: Write failing test for start failure — propagates error when `app.prepare()` rejects
- [ ] **GREEN**: Implement `WebServerService` class with `start(port, dir)` and `stop()` methods
- [ ] **GREEN**: Add SIGINT/SIGTERM handlers with re-entrant guard
- [ ] **REFACTOR**: Clean up types, extract interfaces for testability
- [ ] Verify all web server service tests pass

### Phase 3: UI Command (TDD)

- [ ] **RED**: Write failing tests for command structure — name is `ui`, has `--port` option, has description
- [ ] **RED**: Write failing tests for command execution — calls `findAvailablePort()`, calls `WebServerService.start()`, prints URL with CLI design system
- [ ] **RED**: Write failing test for `--port` override — uses provided port directly (no auto-increment)
- [ ] **GREEN**: Implement `createUiCommand()` using Commander fluent API
- [ ] **GREEN**: Wire up port service → web server service → URL output
- [ ] **REFACTOR**: Add help text with examples, align output with design system
- [ ] Verify all ui command tests pass

### Phase 4: Integration & Wiring

- [ ] Register `createUiCommand()` in `src/presentation/cli/index.ts`
- [ ] Run `pnpm lint` and fix any issues
- [ ] Run `pnpm typecheck` and fix any issues
- [ ] Run `pnpm test` and verify all tests pass
- [ ] Manual smoke test: `pnpm dev:cli ui` — verify server starts, URL prints, Ctrl+C shuts down

## Parallelization Notes

- Phase 1 and Phase 2 test writing (RED steps) can run in parallel [P] since they have no dependencies on each other
- Phase 3 depends on Phase 1 and Phase 2 being complete (GREEN)
- Phase 4 depends on all prior phases

## Acceptance Checklist

Before marking feature complete:

- [ ] All tasks completed
- [ ] Tests passing (`pnpm test`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Types valid (`pnpm typecheck`)
- [ ] Manual verification of `shep ui` command
- [ ] PR created and reviewed

---

_Task breakdown for implementation tracking_
