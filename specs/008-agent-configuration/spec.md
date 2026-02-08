# Feature: agent-configuration

> Configure the AI coding agent (Claude Code, Gemini CLI, etc.) used by Shep for all LLM-powered operations

## Status

- **Number:** 008
- **Created:** 2026-02-08
- **Branch:** feat/008-agent-configuration
- **Phase:** Planning

## Problem Statement

The Shep platform orchestrates AI agents for SDLC automation (analyze, requirements, plan, implement), but currently has no concept of **which underlying AI coding tool** powers these agents. Users may use different tools — Claude Code, Gemini CLI, Aider, Continue, etc. — and Shep needs to:

- **Know which tool is available** — Detect and configure the AI coding agent on first use
- **Store agent selection globally** — Persist the choice in the settings database alongside existing config
- **Handle authentication per agent** — Each tool has different auth mechanisms (OAuth sessions, API tokens, etc.)
- **Provide a unified interface** — Future features that need LLM capabilities will consume a single agent abstraction, not tool-specific code
- **Be extensible** — New agents can be added without restructuring existing code; folder structures must prevent ever-growing flat file lists

Currently, the Settings entity has `ModelConfiguration` (which models to use per SDLC phase) but no concept of **which agent tool** executes those models. This feature bridges that gap.

## Success Criteria

**Domain & TypeSpec:**

- [ ] New TypeSpec models defined: `AgentType` enum, `AgentConfig`, `ClaudeCodeConfig` (and pattern for future agent configs)
- [ ] Settings TypeSpec model extended with `agent: AgentConfig` field
- [ ] Generated TypeScript types available via `src/domain/generated/output.ts`
- [ ] Agent config defaults to Claude Code with session-based auth

**Application Layer:**

- [ ] `ConfigureAgentUseCase` — orchestrates agent selection and auth configuration
- [ ] `ValidateAgentAuthUseCase` — validates the selected agent's authentication works
- [ ] Use cases depend only on port interfaces (no infrastructure coupling)

**Infrastructure Layer:**

- [ ] Settings database migration (002) adds agent configuration columns
- [ ] Settings mapper updated to serialize/deserialize agent config
- [ ] Agent validation service that checks if the agent tool is available (e.g., `claude --version`)

**CLI Command:**

- [ ] `shep settings agent` command shows interactive TUI wizard
- [ ] Step 1: Agent selection list with popular tools (only Claude Code selectable; others show "Coming Soon" badge)
- [ ] Step 2: Auth configuration for the selected agent
- [ ] For Claude Code auth: two options — "Use existing session" or "Use API token" (stored in settings DB via `claude setup-token`)
- [ ] Success confirmation with agent status display
- [ ] Non-interactive fallback: `shep settings agent --agent claude-code --auth session` for CI/scripting

**Testing:**

- [ ] Unit tests for new use cases (mocked repositories)
- [ ] Unit tests for agent validation logic
- [ ] Unit tests for CLI command (mocked use cases)
- [ ] Integration tests for settings migration and mapper with agent config
- [ ] E2E tests for `shep settings agent` command flow

## Affected Areas

| Area                                                               | Impact | Reasoning                                                                     |
| ------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------- |
| `tsp/domain/entities/settings.tsp`                                 | High   | Extend Settings with AgentConfig; add new agent-related models                |
| `tsp/domain/entities/agents/`                                      | High   | New directory for agent-specific TypeSpec models (claude-code, future agents) |
| `tsp/common/enums/`                                                | Medium | New AgentType enum                                                            |
| `src/domain/generated/output.ts`                                   | High   | Regenerated with agent types                                                  |
| `src/domain/factories/settings-defaults.factory.ts`                | Medium | Update defaults to include agent config                                       |
| `src/application/use-cases/agents/`                                | High   | New use cases directory for agent configuration                               |
| `src/application/ports/output/`                                    | Medium | Agent validation port interface                                               |
| `src/infrastructure/persistence/sqlite/migrations/`                | High   | Migration 002 for agent columns                                               |
| `src/infrastructure/persistence/sqlite/mappers/settings.mapper.ts` | High   | Extend to handle agent config serialization                                   |
| `src/infrastructure/services/agents/`                              | High   | New directory for agent-specific services (validation, auth)                  |
| `src/presentation/cli/commands/settings/agent.command.ts`          | High   | New TUI-based agent configuration command                                     |
| `src/presentation/cli/commands/settings/index.ts`                  | Low    | Register agent subcommand                                                     |
| `tests/unit/application/use-cases/agents/`                         | High   | Tests for new use cases                                                       |
| `tests/unit/presentation/cli/commands/settings/`                   | High   | Tests for agent command                                                       |
| `tests/integration/infrastructure/`                                | Medium | Migration and mapper integration tests                                        |
| `tests/e2e/cli/`                                                   | Medium | E2E tests for agent command                                                   |

## Dependencies

| Feature                     | Status   | Why Needed                                                             |
| --------------------------- | -------- | ---------------------------------------------------------------------- |
| 005-global-settings-service | Complete | Provides Settings entity, repository, use cases, and DB infrastructure |
| 006-cli-settings-commands   | Planning | Provides CLI settings command group to register under                  |

**Blocks:**

- All future features requiring LLM agent access (analyze, requirements, plan, implement commands)
- Agent-specific adapters (Claude Code adapter, future Gemini CLI adapter, etc.)
- `shep settings show` display of agent configuration

## Size Estimate

**L (Large)** — Extends the foundational settings system with a new vertical slice:

- **TypeSpec model additions** — New enum, nested config models, Settings extension
- **Database migration** — Schema evolution with new columns
- **Two new use cases** — Configure + Validate agent
- **Interactive TUI command** — Multi-step wizard with selection and auth configuration
- **Agent validation infrastructure** — Service to check tool availability
- **Extensible folder structure** — Organized for future agent additions
- **Comprehensive testing** — Unit, integration, E2E across all layers
- **~20-25 new files** across domain, application, infrastructure, and presentation layers

## Open Questions

None - requirements are clear.

**Decisions made:**

- [x] **Agent list**: Claude Code (selectable), Gemini CLI, Aider, Continue, Cursor (all "Coming Soon" / WIP badge)
- [x] **Claude Code auth options**: "Use existing session" (default) or "Use API token" (via `claude setup-token`)
- [x] **Token storage**: API tokens stored in settings DB (encrypted column, future consideration for secrets management)
- [x] **Agent validation**: Check tool binary availability (`claude --version`) before accepting selection
- [x] **Folder strategy**: Group by agent type in domain, infrastructure, and presentation layers to prevent flat file growth
- [x] **Non-interactive mode**: Support `--agent` and `--auth` flags for CI/scripting use cases
- [x] **TUI library**: Use `@inquirer/prompts` (standard Node.js interactive prompt library) for the wizard steps

---

_Generated by `/shep-kit:new-feature` — proceed with `/shep-kit:research`_
