# Tasks: agent-configuration

> Task breakdown for 008-agent-configuration

## Status

- **Phase:** Implementation
- **Updated:** 2026-02-08

## Task List

### Phase 1: Foundation (No TDD — Build Pipeline)

- [ ] Install `@inquirer/prompts` dependency via pnpm
- [ ] Create `tsp/common/enums/agent-config.tsp` with AgentType and AgentAuthMethod enums
- [ ] Update `tsp/common/enums/index.tsp` to import agent-config.tsp
- [ ] Add AgentConfig model to `tsp/domain/entities/settings.tsp` and extend Settings with `agent: AgentConfig`
- [ ] Run `pnpm tsp:compile` to regenerate TypeScript types
- [ ] Create `src/infrastructure/persistence/sqlite/migrations/002_add_agent_config.sql`
- [ ] Register migration 002 in `src/infrastructure/persistence/sqlite/migrations.ts`
- [ ] Verify build passes: `pnpm validate`

### Phase 2: Infrastructure — Mapper, Factory & Repository (TDD)

**RED:**

- [ ] Write mapper tests: `tests/unit/infrastructure/persistence/sqlite/mappers/settings.mapper.agent.test.ts`
- [ ] Write factory tests: `tests/unit/domain/factories/settings-defaults.factory.agent.test.ts`
- [ ] Write migration integration tests: `tests/integration/infrastructure/persistence/sqlite/migrations/002-agent-config.test.ts`
- [ ] Verify all new tests FAIL (RED)

**GREEN:**

- [ ] Extend `SettingsRow` interface with agent_type, agent_auth_method, agent_token fields
- [ ] Extend `toDatabase()` to serialize agent config fields
- [ ] Extend `fromDatabase()` to reconstruct agent config from row
- [ ] Update `createDefaultSettings()` with agent config defaults
- [ ] Update `initialize()` INSERT SQL with agent columns
- [ ] Update `update()` UPDATE SQL with agent columns
- [ ] Verify all tests PASS (GREEN)

**REFACTOR:**

- [ ] Extract agent-related constants (DEFAULT_AGENT_TYPE, DEFAULT_AUTH_METHOD)
- [ ] Ensure existing settings tests still pass with new columns

### Phase 3: Infrastructure — Agent Validator Service (TDD) [P]

**RED:**

- [ ] Create `src/application/ports/output/agent-validator.interface.ts` with IAgentValidator interface
- [ ] Write validator tests: `tests/unit/infrastructure/services/agents/agent-validator.service.test.ts`
- [ ] Verify tests FAIL (RED)

**GREEN:**

- [ ] Create `src/infrastructure/services/agents/agent-validator.service.ts` implementing IAgentValidator
- [ ] Implement `isAvailable(agentType)` using dependency-injected command executor
- [ ] Verify tests PASS (GREEN)

**REFACTOR:**

- [ ] Clean up error handling and timeout logic

### Phase 4: Application — Use Cases (TDD)

**RED:**

- [ ] Write tests: `tests/unit/application/use-cases/agents/configure-agent.use-case.test.ts`
- [ ] Write tests: `tests/unit/application/use-cases/agents/validate-agent-auth.use-case.test.ts`
- [ ] Verify tests FAIL (RED)

**GREEN:**

- [ ] Create `src/application/use-cases/agents/configure-agent.use-case.ts`
- [ ] Create `src/application/use-cases/agents/validate-agent-auth.use-case.ts`
- [ ] Register IAgentValidator and new use cases in `src/infrastructure/di/container.ts`
- [ ] Verify tests PASS (GREEN)

**REFACTOR:**

- [ ] Simplify use case logic, ensure error messages are descriptive

### Phase 5: Presentation — TUI Layer (TDD) [P]

**RED:**

- [ ] Write wizard tests: `tests/unit/presentation/tui/wizards/agent-config.wizard.test.ts`
- [ ] Verify tests FAIL (RED)

**GREEN:**

- [ ] Create `src/presentation/tui/themes/shep.theme.ts`
- [ ] Create `src/presentation/tui/prompts/agent-select.prompt.ts`
- [ ] Create `src/presentation/tui/prompts/auth-method.prompt.ts`
- [ ] Create `src/presentation/tui/wizards/agent-config.wizard.ts`
- [ ] Create `src/presentation/tui/index.ts` barrel exports
- [ ] Verify tests PASS (GREEN)

**REFACTOR:**

- [ ] Extract shared prompt configuration patterns

### Phase 6: Presentation — CLI Command (TDD)

**RED:**

- [ ] Write command tests: `tests/unit/presentation/cli/commands/settings/agent.command.test.ts`
- [ ] Verify tests FAIL (RED)

**GREEN:**

- [ ] Create `src/presentation/cli/commands/settings/agent.command.ts`
- [ ] Register agent subcommand in `src/presentation/cli/commands/settings/index.ts`
- [ ] Verify tests PASS (GREEN)

**REFACTOR:**

- [ ] Clean up option parsing and validation logic

### Phase 7: E2E Tests

**RED:**

- [ ] Write E2E tests: `tests/e2e/cli/settings-agent.test.ts`
- [ ] Verify tests FAIL (RED)

**GREEN:**

- [ ] Fix any integration issues discovered by E2E tests
- [ ] Verify tests PASS (GREEN)

**REFACTOR:**

- [ ] Final cleanup and documentation verification

<!-- [P] indicates tasks in this phase can run in parallel with other phases -->

## Parallelization Notes

- Tasks marked [P] can be executed concurrently
- Phase 3 (Agent Validator) and Phase 5 (TUI Layer) are independent and can run in parallel
- Phase 6 (CLI Command) depends on both Phase 4 (Use Cases) and Phase 5 (TUI Layer)
- Phase 7 (E2E) depends on Phase 6 (CLI Command)

## Acceptance Checklist

Before marking feature complete:

- [ ] All tasks completed
- [ ] Tests passing (`pnpm test`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Types valid (`pnpm typecheck`)
- [ ] Format clean (`pnpm format:check`)
- [ ] TypeSpec compiles (`pnpm tsp:compile`)
- [ ] Full validation (`pnpm validate`)
- [ ] E2E tests passing (`pnpm test:e2e`)
- [ ] `shep settings agent` works interactively
- [ ] `shep settings agent --agent claude-code --auth session` works non-interactively
- [ ] `shep settings show --output json` displays agent config
- [ ] Documentation updated (docs/cli/commands.md, docs/tui/ if needed)
- [ ] PR created and reviewed

---

_Task breakdown for implementation tracking_
