# Feature: LangChain Agent Infrastructure

> Foundation infrastructure for LangGraph-based agent orchestration with a configurable task runner, starting with a multi-step repository analysis agent.

## Status

- **Number:** 009
- **Created:** 2026-02-08
- **Branch:** feat/langchain-agent-infra
- **Phase:** Planning Complete

## Problem Statement

Shep CLI currently only configures external AI coding tools (Claude Code, Gemini CLI) via `shep settings agent`, but has no internal agent orchestration capability. The planned LangGraph StateGraph architecture described in AGENTS.md has no implementation. We need a foundational infrastructure layer that:

1. Provides a **LangGraph-based agent runtime** that wraps configured AI tools via an agent-agnostic executor (starting with Claude Code CLI subprocess)
2. Introduces a **task management system** for running agent jobs in foreground/background with status tracking
3. Delivers a **`shep run <agent>`** CLI command pattern for triggering agents
4. Proves the architecture with a concrete **`analyze-repository`** agent that generates `shep-analysis.md`

This infrastructure must be designed for extensibility — future agents (requirements, planning, implementation) will build on the same foundation.

## Success Criteria

- [x] `shep run analyze-repository` command triggers a LangGraph agent that produces `shep-analysis.md` in the current repository
- [x] Agent-agnostic executor: `IAgentExecutor` port with `IAgentExecutorFactory` resolves implementation from `Settings.agent.type` (Claude Code CLI first, extensible to Gemini CLI, etc.)
- [x] LangGraph nodes are agent-agnostic — same node code works regardless of which agent is configured
- [x] Task management system tracks job state (pending, running, completed, failed) with SQLite persistence
- [x] Jobs can run in foreground (streaming output) or background (`--background` flag)
- [x] Agent execution is observable: structured logging, progress events, duration tracking
- [x] Agent execution is fault-tolerant: LangGraph checkpointing enables resume-on-failure
- [x] Infrastructure follows Clean Architecture (ports/adapters, DI, use cases)
- [x] TypeSpec-first: all new domain models defined in `.tsp` files, TypeScript generated
- [x] Architecture supports adding new agents with minimal boilerplate (agent registry pattern)

## Affected Areas

| Area                              | Impact                                      | Reasoning                                                           |
| --------------------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| `infrastructure/services/agents/` | **New** — LangGraph runtime, agent registry | Core agent orchestration layer                                      |
| `infrastructure/services/tasks/`  | **New** — Task runner, job persistence      | Background/foreground execution                                     |
| `application/use-cases/agents/`   | **Extended** — RunAgentUseCase              | Orchestrates agent execution                                        |
| `application/ports/output/`       | **Extended** — New port interfaces          | IAgentExecutor, IAgentExecutorFactory, IAgentRunner, IAgentRegistry |
| `presentation/cli/commands/`      | **Extended** — `run` command group          | `shep run <agent>` entry point                                      |
| `tsp/agents/`                     | **Extended** — New TypeSpec models          | AgentRun, TaskJob, AgentDefinition                                  |
| `infrastructure/persistence/`     | **Extended** — New migrations               | Task/job tables in repo database                                    |
| `domain/generated/`               | **Regenerated** — New types                 | Generated from new TypeSpec models                                  |

## Dependencies

| Feature                                     | Status      | Why Needed                                                        |
| ------------------------------------------- | ----------- | ----------------------------------------------------------------- |
| Agent configuration (`shep settings agent`) | Implemented | Provides Claude Code credentials and agent type selection         |
| Settings system                             | Implemented | Model configuration (analyze model name) feeds into LLM selection |
| SQLite persistence                          | Implemented | Task management persists to repo-level database                   |
| TypeSpec pipeline                           | Implemented | Domain models generated from TypeSpec definitions                 |

## Size Estimate

**Large** — New infrastructure layer spanning all four Clean Architecture layers, new TypeSpec models, new CLI command group, task management system, and a concrete agent implementation. Estimated 15-25 files across domain, application, infrastructure, and presentation layers.

## Open Questions

None - requirements are clear.

---

_Generated by `/shep-kit:new-feature` — proceed with `/shep-kit:research`_
