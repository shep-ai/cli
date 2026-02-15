# Agent Executor Provider — Design & Implementation Plan

## Problem Statement

When a user runs `shep settings agent` and selects Cursor, then runs `shep feat new ...`, Claude Code is used instead of Cursor. The root cause: consumers of `IAgentExecutorFactory` are responsible for reading settings and passing the correct agent type. This is error-prone — any consumer can hardcode, default, or forget to read from settings.

## Design Decision

**Approach B: New `IAgentExecutorProvider` port interface** — a settings-aware provider that encapsulates the "read settings + call factory" pattern. Consumers inject the provider and call `getExecutor()` with no arguments. The provider reads settings internally. There is no way to get the wrong agent.

### Architecture (Clean Architecture + DI)

```
Application Layer (Ports):
  IAgentExecutorProvider   →  getExecutor(): IAgentExecutor  (NEW)
  IAgentExecutorFactory    →  createExecutor(type, config), getSupportedAgents()  (UNCHANGED)

Infrastructure Layer (Implementations):
  AgentExecutorProvider    →  reads getSettings(), delegates to factory  (NEW)
  AgentExecutorFactory     →  switch(type) → concrete executor  (UNCHANGED)

DI Container:
  'IAgentExecutorProvider' → AgentExecutorProvider(factory)  (NEW registration)
  'IAgentExecutorFactory'  → AgentExecutorFactory(spawn)  (UNCHANGED)
```

### Consumer Migration (Before → After)

```typescript
// BEFORE (error-prone — caller reads settings, passes type manually):
const settings = getSettings();
const executor = this.executorFactory.createExecutor(settings.agent.type, settings.agent);

// AFTER (guardrail — provider reads settings internally):
const executor = this.executorProvider.getExecutor();
```

## Documentation Updates (ALREADY DONE)

These files have already been updated with the settings-driven agent resolution rule and Cursor availability:

- [x] `AGENTS.md` — Added "Settings-Driven Agent Resolution (MANDATORY)" section, updated Cursor status to Available, updated directory structure, updated "What Exists Today" table
- [x] `CLAUDE.md` — Added "Settings-Driven Agent Resolution (MANDATORY)" section under Agent System
- [x] `docs/architecture/agent-system.md` — Added mandatory rule callout at top
- [x] `docs/development/adding-agents.md` — Added mandatory rule as prerequisite
- [x] `docs/architecture/settings-service.md` — Added "Agent Configuration Flow" section with architectural rule
- [x] `docs/guides/configuration.md` — Added "Agent Selection (Settings-Driven)" section with available agents table
- [x] `docs/guides/langgraph-agents.md` — Updated implementation status note
- [x] `docs/tui/design-system.md` — Updated example: Cursor moved out of "Coming Soon" section
- [x] `docs/api/domain-models.md` — Updated Cursor doc comment from "coming soon" to supported

**NOTE:** These docs currently reference `AgentExecutorFactory.createExecutor()` as the resolution path. After implementation, update them to reference `IAgentExecutorProvider.getExecutor()` as the consumer-facing API.

## Implementation TODOs

All code changes follow TDD (Red-Green-Refactor). Use `pnpm test:single <path>` for individual test files, `pnpm test:unit` for all unit tests.

### Phase 1: Create the Port Interface

**Task 1: Create `IAgentExecutorProvider` port interface**

- **File to CREATE:** `src/application/ports/output/agents/agent-executor-provider.interface.ts`
- **Content:**

  ```typescript
  import type { IAgentExecutor } from './agent-executor.interface.js';

  export interface IAgentExecutorProvider {
    getExecutor(): IAgentExecutor;
  }
  ```

- **Update:** `src/application/ports/output/agents/index.ts` — add export for `IAgentExecutorProvider`
- **Update:** `src/application/ports/output/index.ts` — add re-export if pattern requires it

### Phase 2: Create the Infrastructure Implementation

**Task 2: Create `AgentExecutorProvider` service**

- **File to CREATE:** `src/infrastructure/services/agents/common/agent-executor-provider.service.ts`
- **Content:**

  ```typescript
  import type { IAgentExecutorProvider } from '../../../../application/ports/output/agents/agent-executor-provider.interface.js';
  import type { IAgentExecutorFactory } from '../../../../application/ports/output/agents/agent-executor-factory.interface.js';
  import type { IAgentExecutor } from '../../../../application/ports/output/agents/agent-executor.interface.js';
  import { getSettings } from '../../settings.service.js';

  export class AgentExecutorProvider implements IAgentExecutorProvider {
    constructor(private readonly factory: IAgentExecutorFactory) {}

    getExecutor(): IAgentExecutor {
      const settings = getSettings();
      return this.factory.createExecutor(settings.agent.type, settings.agent);
    }
  }
  ```

**Task 3: Write unit tests for `AgentExecutorProvider`**

- **File to CREATE:** `tests/unit/infrastructure/services/agents/agent-executor-provider.test.ts`
- **Test cases:**
  - Should call `getSettings()` and pass `settings.agent.type` and `settings.agent` to factory
  - Should return the executor from the factory
  - Should use the configured agent type (e.g., `cursor`) not a hardcoded default
  - Should throw if settings not initialized (getSettings throws)
- **Mocking:** Mock `getSettings` (from `settings.service.ts`), mock `IAgentExecutorFactory`

### Phase 3: Register in DI Container

**Task 4: Register `IAgentExecutorProvider` in DI container**

- **File to MODIFY:** `src/infrastructure/di/container.ts`
- **Changes:**
  - Import `IAgentExecutorProvider` type
  - Import `AgentExecutorProvider` class
  - Add registration:
    ```typescript
    container.register<IAgentExecutorProvider>('IAgentExecutorProvider', {
      useFactory: (c) => {
        const factory = c.resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
        return new AgentExecutorProvider(factory);
      },
    });
    ```
  - Place registration AFTER `IAgentExecutorFactory` registration (it depends on it)

### Phase 4: Migrate Consumers

**Task 5: Migrate `CreateFeatureUseCase`**

- **File to MODIFY:** `src/application/use-cases/features/create-feature.use-case.ts`
- **Changes:**
  - Replace `@inject('IAgentExecutorFactory') private readonly executorFactory: IAgentExecutorFactory` with `@inject('IAgentExecutorProvider') private readonly executorProvider: IAgentExecutorProvider`
  - In `generateMetadata()` (line ~146): replace `const settings = getSettings(); const executor = this.executorFactory.createExecutor(settings.agent.type, settings.agent);` with `const executor = this.executorProvider.getExecutor();`
  - Remove `IAgentExecutorFactory` import if no longer used, add `IAgentExecutorProvider` import
  - Keep `getSettings()` usage for OTHER purposes (e.g., reading settings for metadata generation) — only remove the executor-related settings read
- **Update tests:** `tests/unit/application/use-cases/features/create-feature.use-case.test.ts` — mock `IAgentExecutorProvider` instead of `IAgentExecutorFactory`

**Task 6: Migrate `AgentRunnerService`**

- **File to MODIFY:** `src/infrastructure/services/agents/common/agent-runner.service.ts`
- **Changes:**
  - Replace `private readonly executorFactory: IAgentExecutorFactory` constructor param with `private readonly executorProvider: IAgentExecutorProvider`
  - At line ~110: replace `const executor = this.executorFactory.createExecutor(agentType, settings.agent);` with `const executor = this.executorProvider.getExecutor();`
  - Remove manual `settings.agent` reads that were only for executor creation
  - The `agentType` variable read from settings (line ~109) may still be needed for the `AgentRun` record — keep that read, just remove the executor creation part
- **Update DI:** In `container.ts`, the `AgentRunnerService` factory function (line ~157-160) must resolve `IAgentExecutorProvider` instead of `IAgentExecutorFactory`
- **Update tests:** Any tests for `AgentRunnerService` — mock `IAgentExecutorProvider` instead

**Task 7: Migrate `feature-agent-worker.ts`**

- **File to MODIFY:** `src/infrastructure/services/agents/feature-agent/feature-agent-worker.ts`
- **Changes:**
  - At line ~122: replace `const executorFactory = container.resolve<IAgentExecutorFactory>('IAgentExecutorFactory');` with `const executorProvider = container.resolve<IAgentExecutorProvider>('IAgentExecutorProvider');`
  - At lines ~125-130: replace the 5-line manual settings read + factory call with `const executor = executorProvider.getExecutor();`
  - Keep the log line but update: `log('Creating executor from configured agent settings...');`
  - Import `IAgentExecutorProvider` instead of `IAgentExecutorFactory`

### Phase 5: Update Documentation to Reference Provider

**Task 8: Update docs to reference `IAgentExecutorProvider`**

After code changes are done, update documentation to reflect the new consumer API:

- **AGENTS.md** — Update "Settings-Driven Agent Resolution" section: consumers now inject `IAgentExecutorProvider` and call `getExecutor()`. The rule becomes: "inject `IAgentExecutorProvider`, call `getExecutor()`". Update the resolution flow diagrams.
- **CLAUDE.md** — Update Agent System section: reference `IAgentExecutorProvider` as the consumer interface
- **docs/architecture/settings-service.md** — Update "Agent Configuration Flow" to show provider
- **AGENTS.md "What Exists Today" table** — Add `IAgentExecutorProvider` and `AgentExecutorProvider` rows

### Phase 6: Validation

**Task 9: Run full validation**

- `pnpm test:unit` — all unit tests pass
- `pnpm typecheck` — TypeScript compilation succeeds
- `pnpm lint` — no lint errors
- `pnpm format:check` — formatting OK
- `pnpm validate` — full validation passes
- Verify: no remaining direct `IAgentExecutorFactory` usage for executor creation outside the provider (grep for `createExecutor` in consumer code — should only appear in `AgentExecutorProvider` and `AgentExecutorFactory` itself)

## Key Files Reference

| File                                                                           | Layer          | Role                                 |
| ------------------------------------------------------------------------------ | -------------- | ------------------------------------ |
| `src/application/ports/output/agents/agent-executor-provider.interface.ts`     | Application    | NEW port interface                   |
| `src/application/ports/output/agents/agent-executor-factory.interface.ts`      | Application    | EXISTING factory port (unchanged)    |
| `src/application/ports/output/agents/agent-executor.interface.ts`              | Application    | EXISTING executor port (unchanged)   |
| `src/infrastructure/services/agents/common/agent-executor-provider.service.ts` | Infrastructure | NEW provider implementation          |
| `src/infrastructure/services/agents/common/agent-executor-factory.service.ts`  | Infrastructure | EXISTING factory (unchanged)         |
| `src/infrastructure/services/settings.service.ts`                              | Infrastructure | Settings singleton (`getSettings()`) |
| `src/infrastructure/di/container.ts`                                           | Infrastructure | DI container (add registration)      |
| `src/application/use-cases/features/create-feature.use-case.ts`                | Application    | Consumer — migrate to provider       |
| `src/infrastructure/services/agents/common/agent-runner.service.ts`            | Infrastructure | Consumer — migrate to provider       |
| `src/infrastructure/services/agents/feature-agent/feature-agent-worker.ts`     | Infrastructure | Consumer — migrate to provider       |

## Testing Notes

- Vitest with jsdom environment
- `vi.mock()` factories are hoisted — cannot reference outer variables
- For mocking `getSettings()`: use `vi.mock('../../settings.service.js', () => ({ getSettings: vi.fn() }))` pattern
- Always mock `console.log`/`console.error` in CLI command tests
- Test files use relative paths (not `@/` aliases)
- Run `source /home/blackpc/.nvm/nvm.sh` before any pnpm/node commands

## Branch

Current branch: `feat/cursor-support`
