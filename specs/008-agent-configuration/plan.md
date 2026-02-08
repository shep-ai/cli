# Plan: agent-configuration

> Implementation plan for 008-agent-configuration

## Status

- **Phase:** Planning
- **Updated:** 2026-02-08

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                            │
│  ┌────────────────────────┐   ┌────────────────────────────────────┐ │
│  │  CLI: agent.command.ts │   │  TUI: agent-config.wizard.ts      │ │
│  │  shep settings agent   │──▶│  ┌─ agent-select.prompt.ts        │ │
│  │  --agent / --auth flags│   │  ├─ auth-method.prompt.ts         │ │
│  └───────────┬────────────┘   │  └─ shep.theme.ts                 │ │
│              │                └──────────────┬─────────────────────┘ │
└──────────────┼──────────────────────────────┼───────────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Application Layer                             │
│  ┌───────────────────────────┐  ┌──────────────────────────────────┐ │
│  │ ConfigureAgentUseCase     │  │ ValidateAgentAuthUseCase         │ │
│  │ - validate agent binary   │  │ - check binary availability     │ │
│  │ - update settings         │  │ - verify auth method viable     │ │
│  └────────────┬──────────────┘  └──────────┬───────────────────────┘ │
│               │                            │                         │
│  ┌────────────▼────────────────────────────▼───────────────────────┐ │
│  │              Port Interfaces                                    │ │
│  │  ISettingsRepository (existing)  │  IAgentValidator (new)       │ │
│  └────────────┬─────────────────────┬──────────────────────────────┘ │
└───────────────┼─────────────────────┼────────────────────────────────┘
                │                     │
┌───────────────┼─────────────────────┼────────────────────────────────┐
│               │  Infrastructure Layer                                │
│  ┌────────────▼──────────────┐  ┌──▼───────────────────────────────┐ │
│  │ SQLiteSettingsRepository  │  │ AgentValidatorService            │ │
│  │ + agent columns (mig 002)│  │ - which/claude --version         │ │
│  │ + mapper extension        │  │ - binary existence check         │ │
│  └───────────────────────────┘  └──────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ Persistence: Migration 002 (ALTER TABLE settings ADD COLUMN)  │   │
│  │   agent_type TEXT, agent_auth_method TEXT, agent_token TEXT    │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                │
┌───────────────┼──────────────────────────────────────────────────────┐
│               │  Domain Layer (TypeSpec-first)                       │
│  ┌────────────▼──────────────┐  ┌──────────────────────────────────┐ │
│  │ Settings (extended)       │  │ Enums (new)                      │ │
│  │ + agent: AgentConfig      │  │ AgentType, AgentAuthMethod       │ │
│  └───────────────────────────┘  └──────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ AgentConfig { type, authMethod, token? }                      │   │
│  │ Factory: createDefaultSettings() extended with agent defaults  │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Interactive Mode (`shep settings agent`)

```
User runs "shep settings agent"
    │
    ▼
agent.command.ts detects no --agent/--auth flags
    │
    ▼
Launches agentConfigWizard()
    ├─ Step 1: select() → AgentType (only Claude Code selectable)
    ├─ Step 2: select() → AgentAuthMethod (Session or Token)
    └─ Step 3: password() → token (only if Token auth)
    │
    ▼
ConfigureAgentUseCase.execute({ type, authMethod, token })
    ├─ AgentValidatorService.isAvailable("claude-code") → checks binary
    ├─ Loads current settings via ISettingsRepository.load()
    ├─ Merges agent config into settings
    └─ Persists via ISettingsRepository.update()
    │
    ▼
Success message + agent status display
```

### Non-Interactive Mode (`shep settings agent --agent claude-code --auth session`)

```
User runs "shep settings agent --agent claude-code --auth session"
    │
    ▼
agent.command.ts detects --agent and --auth flags
    │
    ▼
ConfigureAgentUseCase.execute({ type, authMethod }) — same path
```

## Implementation Strategy

### Phase 1: Foundation (No TDD — Build Pipeline)

Install `@inquirer/prompts`, define TypeSpec models (`AgentType`, `AgentAuthMethod`, `AgentConfig`), extend Settings model, compile to TypeScript, write migration 002 SQL, and register in migration runner. This phase produces no testable code — it generates types and SQL that later phases consume.

### Phase 2: Infrastructure — Mapper, Factory & Repository (TDD)

Extend the settings mapper (`SettingsRow`, `toDatabase`, `fromDatabase`) with agent config columns. Update the settings defaults factory to include agent config. Update repository INSERT/UPDATE SQL. All changes follow existing flat-column pattern.

- **RED**: Write tests for mapper round-trip with agent fields, factory agent defaults, repository with new columns
- **GREEN**: Extend mapper, factory, repository with minimal code
- **REFACTOR**: Extract constants, improve type safety

### Phase 3: Infrastructure — Agent Validator Service (TDD) [P]

Create the `IAgentValidator` port interface and `AgentValidatorService` implementation that checks agent binary availability via subprocess (`which claude` / `claude --version`).

- **RED**: Write tests for validator with mocked child_process
- **GREEN**: Implement validator service
- **REFACTOR**: Clean up error handling

### Phase 4: Application — Use Cases (TDD)

Create `ConfigureAgentUseCase` (orchestrates validation + persistence) and `ValidateAgentAuthUseCase` (checks agent availability). Register in DI container.

- **RED**: Write tests with mocked repository and validator
- **GREEN**: Implement use cases
- **REFACTOR**: Simplify, register in DI

### Phase 5: Presentation — TUI Layer (TDD) [P]

Build the TUI components: Shep theme, agent selection prompt, auth method prompt, and the multi-step wizard. Uses `@inquirer/prompts` with the project's design system colors.

- **RED**: Write tests for wizard logic (mocked @inquirer/prompts)
- **GREEN**: Implement theme, prompts, wizard
- **REFACTOR**: Extract shared config

### Phase 6: Presentation — CLI Command (TDD)

Create `shep settings agent` command with both interactive (wizard) and non-interactive (flags) modes. Register as subcommand of settings group.

- **RED**: Write tests with mocked wizard and use cases
- **GREEN**: Implement command, register in settings group + bootstrap
- **REFACTOR**: Clean up option parsing

### Phase 7: E2E Tests

Write E2E tests for the `shep settings agent` command using the non-interactive flag mode (CI-safe). Verify the full stack from CLI flags through to settings persistence.

- **RED**: Write E2E tests using `runCli()` helper
- **GREEN**: Fix any integration issues
- **REFACTOR**: Final cleanup

## Files to Create/Modify

### New Files

| File                                                                        | Purpose                                        |
| --------------------------------------------------------------------------- | ---------------------------------------------- |
| `tsp/common/enums/agent-config.tsp`                                         | AgentType and AgentAuthMethod enum definitions |
| `src/infrastructure/persistence/sqlite/migrations/002_add_agent_config.sql` | ALTER TABLE to add agent columns               |
| `src/application/ports/output/agent-validator.interface.ts`                 | IAgentValidator port interface                 |
| `src/infrastructure/services/agents/agent-validator.service.ts`             | Binary availability check implementation       |
| `src/application/use-cases/agents/configure-agent.use-case.ts`              | Orchestrate agent configuration + validation   |
| `src/application/use-cases/agents/validate-agent-auth.use-case.ts`          | Validate agent authentication viability        |
| `src/presentation/tui/index.ts`                                             | Barrel exports for TUI layer                   |
| `src/presentation/tui/themes/shep.theme.ts`                                 | Custom Inquirer theme using CLI design system  |
| `src/presentation/tui/prompts/agent-select.prompt.ts`                       | Agent selection prompt configuration           |
| `src/presentation/tui/prompts/auth-method.prompt.ts`                        | Auth method selection prompt configuration     |
| `src/presentation/tui/wizards/agent-config.wizard.ts`                       | Multi-step agent configuration wizard          |
| `src/presentation/cli/commands/settings/agent.command.ts`                   | `shep settings agent` CLI command              |

### Modified Files

| File                                                               | Changes                                                  |
| ------------------------------------------------------------------ | -------------------------------------------------------- |
| `tsp/common/enums/index.tsp`                                       | Import `agent-config.tsp`                                |
| `tsp/domain/entities/settings.tsp`                                 | Add `AgentConfig` model + `agent` field on Settings      |
| `src/domain/generated/output.ts`                                   | Regenerated with AgentType, AgentAuthMethod, AgentConfig |
| `src/infrastructure/persistence/sqlite/migrations.ts`              | Register migration 002                                   |
| `src/infrastructure/persistence/sqlite/mappers/settings.mapper.ts` | Extend with agent fields                                 |
| `src/domain/factories/settings-defaults.factory.ts`                | Add agent config defaults                                |
| `src/infrastructure/repositories/sqlite-settings.repository.ts`    | Update INSERT/UPDATE SQL                                 |
| `src/infrastructure/di/container.ts`                               | Register IAgentValidator, new use cases                  |
| `src/presentation/cli/commands/settings/index.ts`                  | Add agent subcommand                                     |
| `package.json`                                                     | Add `@inquirer/prompts` dependency                       |

## Testing Strategy

### Unit Tests (RED first in each TDD phase)

- Settings mapper: round-trip with agent_type, agent_auth_method, agent_token (including nulls)
- Settings factory: `createDefaultSettings()` returns agent config with claude-code + session defaults
- Agent validator: `isAvailable()` returns true/false based on subprocess result
- ConfigureAgentUseCase: validates agent, updates settings, handles errors
- ValidateAgentAuthUseCase: checks binary, validates auth method viability
- Agent config wizard: correct prompt sequence, result mapping
- Agent command: flag parsing, wizard invocation, error handling

### Integration Tests (RED first)

- Migration 002: columns added correctly, defaults applied, existing data preserved
- Repository round-trip: initialize/load/update with agent config fields

### E2E Tests (RED first)

- `shep settings agent --agent claude-code --auth session`: non-interactive success
- `shep settings agent --agent claude-code --auth token --token sk-test`: token-based config
- `shep settings agent --agent invalid`: error handling
- `shep settings show --output json`: agent config appears in settings output

## Risk Mitigation

| Risk                                           | Mitigation                                                     |
| ---------------------------------------------- | -------------------------------------------------------------- |
| Migration 002 fails on existing databases      | `ALTER TABLE ADD COLUMN` with DEFAULT values (safe for SQLite) |
| `@inquirer/prompts` incompatibility with ESM   | Confirmed ESM-first in research; test in Phase 1               |
| Claude binary not found during wizard          | Validator returns clear error; wizard shows diagnostic message |
| Token accidentally logged                      | Never include token in error messages or debug output          |
| Existing settings tests break with new columns | Migration auto-runs; extend test fixtures with agent fields    |

## Rollback Plan

Feature is additive — all changes extend existing structures:

1. **Database**: Migration 002 adds nullable/defaulted columns; no data loss. Unused columns cause no harm.
2. **TypeSpec/Types**: New types are additive; existing types only gain an optional field.
3. **Code**: New files can be deleted; modified files revert with the branch.
4. **Dependencies**: `@inquirer/prompts` can be removed from package.json.

Rollback = revert the feature branch merge. No destructive changes to existing data or APIs.

---

_Updated by `/shep-kit:plan` — see tasks.md for detailed breakdown_
