# 010 - Enforce DI Compliance

## Summary

Enforce `@injectable()` decorators on all service and repository classes, eliminate direct `new` instantiations outside the DI container, and ensure all services are resolved via tsyringe dependency injection.

## Problem

Several services were not properly integrated with the DI container:

- `AgentValidatorService` registered via `useFactory` with manual `new` instantiation
- `VersionService` registered via `useFactory` with manual `new` instantiation
- `WebServerService` directly instantiated with `new` in `ui.command.ts` (no DI at all)
- `WebServerService` had no port interface (violating Dependency Inversion Principle)

## Requirements

### Action Items

1. Add `@injectable()` decorator to `AgentValidatorService`
2. Add `@injectable()` decorator to `VersionService`
3. Add `@injectable()` decorator to `WebServerService`
4. Create `IWebServerService` port interface
5. Replace `new WebServerService()` in `ui.command.ts` with `container.resolve()`
6. Convert `useFactory` + `new` registrations to `registerSingleton` for services
7. Register `ExecFunction` as a DI token for `AgentValidatorService` dependency

### Success Criteria

- [x] All service classes have `@injectable()` decorator
- [x] All services resolved via DI container (zero direct `new` calls outside container)
- [x] Port interfaces exist for all services (`IWebServerService` created)
- [x] All 282 tests pass
- [x] No regressions in CLI commands

## Scope

### In Scope

- Service classes in `src/infrastructure/services/`
- Repository classes in `src/infrastructure/repositories/`
- Use case classes in `src/application/use-cases/`
- DI container registration in `src/infrastructure/di/container.ts`
- Port interfaces in `src/application/ports/output/`

### Out of Scope

- Utility modules (settings.service.ts, port.service.ts, shep-directory.service.ts) - these are functional utilities, not injectable classes
- Domain layer changes
- New features or behavioral changes
