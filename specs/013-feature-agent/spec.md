## Problem Statement

Shep AI currently lacks a user-facing feature management system. While we have the `shep run`
command for executing individual agents (e.g., `shep run analyze-repository`), users cannot:

1. **Create and track features** - No way to create a feature entity in the local database with
   proper repository association, branch, and lifecycle tracking
2. **List and view features** - No `shep feat ls` or `shep feat show` commands to see features
   across repositories
3. **Autonomous feature development** - No background agent that autonomously orchestrates the
   full SDLC workflow (analyze → requirements → research → plan → implement)
4. **Worktree management** - No automated git worktree creation for isolated feature development
5. **Interactive requirement gathering** - No conversational AI interface for clarifying
   requirements with `--interactive`, `--allow-prd`, `--allow-plan` modes
6. **External tool integration** - No support for `--tool-jira-ticket` or `--tool-github-issue`
   to bootstrap features from external sources

The existing infrastructure provides:

- ✅ Feature entity TypeSpec model with `repositoryPath` property
- ✅ LangGraph foundation (analyze-repository-graph example)
- ✅ Agent execution framework (IAgentExecutor, AgentRunRepository)
- ✅ Settings-based agent configuration

But we're missing the **user-facing CLI** and **autonomous feature agent** that ties it all together.

## Success Criteria

**CLI Commands**:

- [ ] `shep feat new <description>` creates feature, branch, worktree, and spawns agent
- [ ] `shep feat ls [--repo <path>]` lists features with table output (status indicators)
- [ ] `shep feat show <id>` displays feature details (lifecycle, plan, artifacts)
- [ ] Support for options: `--repo`, `--interactive`, `--allow-prd`, `--allow-plan`, `--allow-all`
- [ ] Support for external tools: `--tool-jira-ticket`, `--tool-github-issue`

**Domain & Application**:

- [ ] IFeatureRepository interface defined in `application/ports/output/`
- [ ] SQLiteFeatureRepository implementation with per-repo database
- [ ] CreateFeatureUseCase (creates feature, branch, worktree, spawns agent)
- [ ] ListFeaturesUseCase (lists features for a repository)
- [ ] ShowFeatureUseCase (retrieves feature by ID)
- [ ] UpdateFeatureUseCase (updates lifecycle, status, plan)

**Infrastructure**:

- [ ] Feature database in `~/.shep/repos/<base64-repo>/data` (SQLite)
- [ ] WorktreeService for git worktree management
- [ ] FeatureAgent (LangGraph) with nodes: analyze, requirements, research, plan, implement
- [ ] SQLite checkpointing for agent state persistence
- [ ] Background agent spawning (detached process or async execution)

**Agent Workflow**:

- [ ] Analyze node: Repository analysis (reuses analyze-repository-graph)
- [ ] Requirements node: Interactive requirements gathering with user questions
- [ ] Research node: Technical decision-making and approach selection
- [ ] Plan node: Task decomposition and artifact generation (updates plan.yaml)
- [ ] Implement node: Autonomous code execution following TDD (updates tasks.yaml)

**Testing**:

- [ ] Unit tests for all use cases
- [ ] Integration tests for SQLiteFeatureRepository
- [ ] E2E tests for CLI commands (feat new, feat ls, feat show)
- [ ] Integration tests for FeatureAgent workflow (full lifecycle)

**Documentation**:

- [ ] Update AGENTS.md with actual FeatureAgent implementation
- [ ] Add CLI reference for `shep feat` commands
- [ ] Add user guide for feature development workflow

## Affected Areas

| Area                              | Impact | Reasoning                                                       |
| --------------------------------- | ------ | --------------------------------------------------------------- |
| `presentation/cli/commands/`      | High   | New command: `feat.command.ts` with subcommands (new, ls, show) |
| `application/use-cases/features/` | High   | New use cases: Create, List, Show, Update Feature               |
| `application/ports/output/`       | High   | New port: `IFeatureRepository` interface                        |
| `infrastructure/repositories/`    | High   | New repo: `SQLiteFeatureRepository` with per-repo database      |
| `infrastructure/services/agents/` | High   | New LangGraph agent: `FeatureAgent` with 5 nodes                |
| `infrastructure/services/git/`    | Medium | New service: `WorktreeService` for git worktree operations      |
| `infrastructure/di/container.ts`  | Medium | Register new repositories, use cases, and services              |
| `tsp/domain/entities/feature.tsp` | Low    | Already exists with `repositoryPath` ✓                          |
| Dependencies                      | High   | New packages: @langchain/langgraph, @langchain/core, etc.       |
| Tests                             | High   | Extensive unit, integration, and E2E tests                      |
| Documentation                     | Medium | AGENTS.md, CLI reference, user guides                           |

## Dependencies

**NPM Packages** (not yet installed):

- `@langchain/langgraph` - StateGraph workflow orchestration
- `@langchain/core` - Tools, messages, prompts
- `@langchain/anthropic` - Claude model integration (uses Settings.agent config)
- `@langchain/langgraph-checkpoint-sqlite` - SQLite checkpoint persistence
- `simple-git` (may already exist) - Git operations for branch/worktree management

**Existing Infrastructure**:

- ✅ TypeSpec domain models (`tsp/domain/entities/feature.tsp`)
- ✅ Settings system with agent configuration (`Settings.agent`)
- ✅ Repository data storage pattern (`~/.shep/repos/<base64-repo>/`)
- ✅ DI container (tsyringe) with existing repository/use case registration patterns
- ✅ LangGraph foundation (`analyze-repository-graph.ts` example)
- ✅ Agent execution framework (`IAgentExecutor`, `RunAgentUseCase`)
- ✅ CLI UI system (colors, messages, tables, formatters)

**Pre-requisite Features**:

- ✅ Feature entity (TypeSpec model exists)
- ✅ Agent configuration (Settings.agent with type/token)
- ✅ Agent execution framework (run.command.ts, RunAgentUseCase)
- ✅ Spec-driven workflow (shep-kit skills for spec/research/plan/tasks)

## Size Estimate

**XL (Extra Large)** - This is a comprehensive feature requiring:

1. **CLI Commands** (3 commands: new, ls, show) with interactive prompts and options
2. **Use Cases** (4 use cases: Create, List, Show, Update) with full CRUD logic
3. **Repository** (IFeatureRepository + SQLiteFeatureRepository) with per-repo database
4. **LangGraph Agent** (5 nodes: analyze, requirements, research, plan, implement)
5. **Git Integration** (WorktreeService for automated worktree management)
6. **Background Execution** (Agent spawning in detached process or async)
7. **State Management** (SQLite checkpointing for agent resumability)
8. **External Integrations** (Jira, GitHub tools for feature bootstrapping)
9. **Extensive Testing** (Unit tests for each layer, integration tests for workflows, E2E for CLI)
10. **Documentation Updates** (AGENTS.md, CLI reference, user guides)

Estimated effort:

- **10-15 implementation phases** (following TDD with RED-GREEN-REFACTOR)
- **40-60 tasks** (CLI, use cases, repos, agents, services, tests, docs)
- **3-4 weeks** for full implementation, testing, and documentation

Key complexity drivers:

- Multi-layer architecture (CLI → Use Cases → Repositories → Agents)
- Asynchronous agent execution with state persistence
- Git worktree management and branch orchestration
- Interactive requirement gathering with LangGraph human-in-the-loop
- External tool integrations (Jira, GitHub)

---

_Specification created with `/shep-kit:new-feature` — proceed with `/shep-kit:research`_
