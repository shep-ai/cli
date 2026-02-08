# 010 - Enforce DI Compliance: Plan

## Architecture Overview

Enforce the Dependency Inversion Principle across all service classes by adding `@injectable()` decorators, creating missing port interfaces, and converting all service resolution to go through the tsyringe DI container.

## Implementation Strategy

### Phase 1: Port Interface Creation

**RED**: Write test asserting `IWebServerService` interface exists and is importable from ports index.
**GREEN**: Create `IWebServerService` in `src/application/ports/output/web-server-service.interface.ts` with `start()` and `stop()` methods. Export from index.
**REFACTOR**: Verify interface matches `WebServerService` public API.

### Phase 2: Service Decorators and Constructor Injection

**RED**: Write tests verifying services can be resolved from container with correct dependencies.
**GREEN**:

- Add `@injectable()` to `AgentValidatorService`, `VersionService`, `WebServerService`
- Convert `AgentValidatorService` constructor to use `@inject('ExecFunction')` for `execFileAsync`
- Make `WebServerService` implement `IWebServerService`
  **REFACTOR**: Ensure consistent decorator patterns across all services.

### Phase 3: Container Registration Cleanup

**RED**: Write tests verifying container resolves services correctly via token strings.
**GREEN**:

- Register `ExecFunction` token: `container.registerInstance('ExecFunction', execFileAsync)`
- Convert `useFactory` registrations to `registerSingleton` for all 3 services
- Update `ui.command.ts` to use `container.resolve<IWebServerService>('IWebServerService')`
  **REFACTOR**: Remove unused imports, verify no `new ServiceClass()` remains outside container.

## Files Modified

| File                                                            | Change                                             |
| --------------------------------------------------------------- | -------------------------------------------------- |
| `src/application/ports/output/web-server-service.interface.ts`  | **NEW** - Port interface                           |
| `src/application/ports/output/index.ts`                         | Export new interface                               |
| `src/infrastructure/services/agents/agent-validator.service.ts` | Add `@injectable()`, `@inject('ExecFunction')`     |
| `src/infrastructure/services/version.service.ts`                | Add `@injectable()`                                |
| `src/infrastructure/services/web-server.service.ts`             | Add `@injectable()`, implement `IWebServerService` |
| `src/infrastructure/di/container.ts`                            | `registerSingleton` pattern, `ExecFunction` token  |
| `src/presentation/cli/commands/ui.command.ts`                   | `container.resolve()` instead of `new`             |
| `tests/unit/infrastructure/services/web-server.service.test.ts` | Add `reflect-metadata` import                      |
| `tests/unit/presentation/cli/commands/ui.command.test.ts`       | Update mocks for token-based resolution            |

## Testing Strategy

- All existing 282 tests must continue to pass
- Unit tests for services verify injectable behavior
- E2E tests for `ui` command verify end-to-end resolution
- No new test files needed (existing coverage sufficient)

## Risk Mitigation

- **Low risk**: Pure refactoring with no behavioral changes
- **Rollback**: Single commit, easy to revert
- **Verification**: Full test suite (unit + integration + e2e) validates no regressions
