# 010 - Enforce DI Compliance: Tasks

## Phase 1: Port Interface Creation

- [x] Create `IWebServerService` interface with `start()` and `stop()` methods
- [x] Export `IWebServerService` from `src/application/ports/output/index.ts`

## Phase 2: Service Decorators and Constructor Injection

- [x] Add `@injectable()` decorator to `AgentValidatorService`
- [x] Convert `AgentValidatorService` constructor to use `@inject('ExecFunction')`
- [x] Add `@injectable()` decorator to `VersionService`
- [x] Add `@injectable()` decorator to `WebServerService`
- [x] Make `WebServerService` implement `IWebServerService`

## Phase 3: Container Registration Cleanup

- [x] Register `ExecFunction` token via `container.registerInstance()`
- [x] Convert `AgentValidatorService` from `useFactory` to `registerSingleton`
- [x] Convert `VersionService` from `useFactory` to `registerSingleton`
- [x] Register `WebServerService` via `registerSingleton`
- [x] Replace `new WebServerService()` in `ui.command.ts` with `container.resolve()`

## Phase 4: Test Updates

- [x] Add `reflect-metadata` import to `web-server.service.test.ts`
- [x] Update `ui.command.test.ts` mocks for token-based resolution

## Acceptance Checklist

- [x] All service classes have `@injectable()` decorator
- [x] Zero direct `new ServiceClass()` outside DI container
- [x] Port interfaces exist for all services
- [x] All 282 tests pass (unit + integration + e2e)
- [x] No regressions
