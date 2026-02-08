# 010 - Enforce DI Compliance: Research

## Technology Decisions

### tsyringe DI Pattern

**Decision**: Use `registerSingleton` with `@injectable()` decorators instead of `useFactory` with manual `new` instantiation.

**Rationale**: `registerSingleton` leverages tsyringe's automatic constructor injection via `reflect-metadata`, eliminating manual dependency wiring. This is the idiomatic tsyringe pattern and ensures new dependencies are automatically resolved.

### ExecFunction Token

**Decision**: Register `execFileAsync` as a named DI token (`'ExecFunction'`) rather than creating a wrapper class.

**Rationale**: `execFileAsync` is a simple function dependency. Wrapping it in a class would add unnecessary abstraction. A named token keeps it simple while making it injectable.

### Port Interface for WebServerService

**Decision**: Create `IWebServerService` interface with `start()` and `stop()` methods.

**Rationale**: Aligns with existing patterns (`IAgentValidator`, `IVersionService`) and the Dependency Inversion Principle. Allows future substitution (e.g., test doubles, alternative server implementations).

## Audit Results

### Classes Requiring @injectable()

| Class                    | Had @injectable? | Had Port Interface?       |
| ------------------------ | ---------------- | ------------------------- |
| AgentValidatorService    | No               | Yes (IAgentValidator)     |
| VersionService           | No               | Yes (IVersionService)     |
| WebServerService         | No               | No                        |
| SQLiteSettingsRepository | Yes              | Yes (ISettingsRepository) |
| All 5 Use Cases          | Yes              | N/A                       |

### Direct Instantiations Found

| Location         | Pattern                                                   | Issue                           |
| ---------------- | --------------------------------------------------------- | ------------------------------- |
| container.ts:62  | `useFactory` + `new AgentValidatorService(execFileAsync)` | Manual wiring bypasses DI       |
| container.ts:66  | `useFactory` + `new VersionService()`                     | Manual wiring bypasses DI       |
| ui.command.ts:64 | `new WebServerService()`                                  | Completely outside DI container |

## Open Questions

None - all resolved during implementation.
