## Status

- **Phase:** Research
- **Updated:** 2026-02-11
- **Researched by:** 5 parallel agents (db, git, agent, cli, bg)

## Technology Decisions

### 1. Feature Storage Schema

**Chosen:** Single `features` table with JSON columns for nested entities

```sql
CREATE TABLE features (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL,
  repository_path TEXT NOT NULL,
  branch TEXT NOT NULL,
  lifecycle TEXT NOT NULL DEFAULT 'Requirements',
  messages TEXT NOT NULL DEFAULT '[]',
  plan TEXT,
  related_artifacts TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_features_slug ON features(slug);
CREATE INDEX idx_features_repository_path ON features(repository_path);
CREATE INDEX idx_features_lifecycle ON features(lifecycle);
CREATE INDEX idx_features_updated_at ON features(updated_at);
```

**Rationale:** Feature is the Aggregate Root - always loaded/saved as a whole unit. JSON columns
for messages[], plan, and relatedArtifacts avoid 5+ normalized tables with complex JOINs for
deeply nested structures (Plan > Task > ActionItem > AcceptanceCriteria). Primary queries (by ID,
slug, lifecycle) don't need SQL queries into JSON content.

### 2. Feature Repository Pattern

**Chosen:** Singleton `IFeatureRepository` in global DB (`~/.shep/data`)

Features are stored in the same global SQLite database as Settings and AgentRun.
The `repositoryPath` column enables per-repo filtering. Simple singleton registered in DI,
same pattern as `IAgentRunRepository`.

**IFeatureRepository interface:**

- `create(feature: Feature): Promise<void>`
- `findById(id: string): Promise<Feature | null>`
- `findBySlug(slug: string): Promise<Feature | null>`
- `list(options?: { repositoryPath?: string, lifecycle?: SdlcLifecycle }): Promise<Feature[]>`
- `update(feature: Feature): Promise<void>`
- `delete(id: string): Promise<void>`

### 3. Git Worktree Management

**Chosen:** Native execFile via injectable `ExecFunction` (zero new dependencies)

**IWorktreeService interface:**

- `create(repoPath, slug): Promise<WorktreeInfo>` - creates worktree + branch `feat/<slug>`
- `remove(repoPath, slug, options?): Promise<void>` - removes worktree, optionally deletes branch
- `list(repoPath): Promise<WorktreeInfo[]>` - parses `git worktree list --porcelain`
- `exists(repoPath, slug): Promise<boolean>`
- `getWorktreePath(repoPath, slug): string` - pure function: `path.join(repoPath, '.worktrees', slug)`

**WorktreeInfo:** `{ path, head, branch, isMain }`

**Error handling:** Typed `WorktreeError` with codes: ALREADY_EXISTS, BRANCH_IN_USE, NOT_FOUND,
DIRTY_WORKTREE, NOT_A_REPO, GIT_ERROR. Parsed from git stderr patterns.

**Location:** `.worktrees/<slug>/` in repo root (already in production use, already in .gitignore).

### 4. LangGraph FeatureAgent Design

**Chosen:** Linear StateGraph with minimal state, IAgentExecutor delegation

```
START -> analyze -> requirements -> research -> plan -> implement -> END
          retry      retry          retry       retry    retry
```

**FeatureAgentState (minimal):**

- Identity: featureId, repositoryPath, worktreePath, description, specDir
- Lifecycle: currentPhase, approvalMode
- Completion: analysisComplete, requirementsComplete, researchComplete, planComplete, implementComplete
- Error: error, retryCount
- Session: sessionId (for IAgentExecutor resume)

**Node pattern:** Each node follows `createAnalyzeNode(executor)` pattern:

1. Read spec files from disk
2. Build prompt with context
3. Call `executor.execute(prompt, { cwd: worktreePath })`
4. Parse output and write to spec YAML files
5. Update feature.yaml status
6. Return minimal state update (completion flag + phase)

**Human-in-the-loop:** `interrupt()` + `Command({ resume })` with approvalMode control:

- `--interactive`: interrupt at every phase
- `--allow-prd`: auto-accept requirements, interrupt rest
- `--allow-plan`: auto-accept requirements + research + plan, interrupt implement
- `--allow-all`: fully autonomous, no interrupts

**Checkpointing:** SQLite per-feature at `~/.shep/repos/<hash>/checkpoints/<feature-id>.db`.
Thread ID = featureId (UUID). Enables resume from last completed node.

**Error handling:** Conditional edges with retry counter (max 3). Each node checks completion
flag first for resume support (skip already-done work).

### 5. CLI Command Architecture

**Chosen:** Directory-based pattern mirroring `settings/` command

```
src/presentation/cli/commands/feat/
  index.ts          - createFeatCommand() parent with addCommand()
  new.command.ts    - createNewCommand()
  ls.command.ts     - createLsCommand()
  show.command.ts   - createShowCommand()
```

**`feat new` options:**

- `<description>` (argument) - feature description
- `-r, --repo <path>` - repository path (default: cwd)
- `-i, --interactive` - enable interactive mode
- `--allow-prd` / `--allow-plan` / `--allow-all` - approval modes
- `--tool-jira-ticket <id>` / `--tool-github-issue <id>` - external context

**Slug generation:** `description.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').substring(0,50)`

**`feat ls` output:** Table with ID, Name, Status columns using status indicators.

**`feat show` output:** Section-based display using existing TableFormatter pattern with
Overview, Plan, and Tasks sections.

### 6. Background Agent Execution

**Chosen:** Node.js `fork()` with `detached: true` + `unref()`

**Sequence:**

1. CLI creates Feature in global DB (lifecycle=Requirements)
2. CLI creates AgentRun in global DB (status=pending)
3. CLI creates git branch + worktree
4. CLI forks background worker with --feature-id, --run-id, --repo
5. Worker sends "started" via IPC
6. CLI receives confirmation, prints success, unrefs, exits
7. Worker initializes own DI container + DB connections
8. Worker executes LangGraph feature-agent graph
9. Worker updates Feature + AgentRun as graph progresses
10. Worker writes heartbeat every 30s to AgentRun.lastHeartbeat
11. Worker exits on completion

**Process management:**

- PID stored in AgentRun.pid (already exists in TypeSpec model)
- Liveness check: `process.kill(pid, 0)`
- Graceful stop: SIGTERM -> wait 5s -> SIGKILL
- Crash detection: PID dead + status="running" -> mark "interrupted"

**Logging:** File-based at `~/.shep/logs/<feature-slug>/agent.log`

**Feature <-> AgentRun link:** Same global DB. featureId on AgentRun, agentRunId on Feature.

## Library Analysis

| Library                                | Status            | Purpose                           | Decision                      |
| -------------------------------------- | ----------------- | --------------------------------- | ----------------------------- |
| @langchain/langgraph                   | To install        | StateGraph workflow orchestration | Use for FeatureAgent graph    |
| @langchain/core                        | To install        | Tools, messages, prompts          | Required by LangGraph         |
| @langchain/anthropic                   | Already installed | Claude model integration          | Use existing                  |
| @langchain/langgraph-checkpoint-sqlite | To install        | SQLite checkpoint persistence     | Use for durable state         |
| better-sqlite3                         | Already installed | SQLite driver                     | Use for per-repo feature DB   |
| cli-table3                             | Already installed | Table rendering                   | Use for feat ls output        |
| simple-git                             | Not needed        | Git wrapper                       | Rejected: no worktree API     |
| isomorphic-git                         | Not needed        | Pure JS git                       | Rejected: no worktree support |

## Security Considerations

- **Database permissions**: Global database directory (~/.shep/) created with 0700 (owner-only), matching existing pattern
- **Background process**: Fork inherits parent environment. Sensitive env vars (API tokens) are needed by the agent
- **PID tracking**: Only process owner can send signals (no privilege escalation risk)
- **SQLite WAL mode**: Safe for concurrent reader (CLI) + writer (agent) pattern

## Performance Implications

- **Single global DB**: No per-repo connection overhead. All features in one database with repositoryPath filtering
- **JSON columns**: Larger row sizes but SQLite handles BLOBs efficiently. Acceptable for aggregate root pattern
- **Background fork()**: ~50-100MB per background agent (V8 instance). One agent per feature is acceptable
- **LangGraph checkpointing**: SQLite writes on every node completion. Minimal overhead for crash recovery benefit
- **Worktree operations**: Native git commands are fast (<100ms for create/list/remove)

## TypeSpec Changes Needed

- Add `featureId?: string` and `repositoryPath?: string` to `AgentRun` model
- Add `agentRunId?: string` to `Feature` model (optional back-reference)

## New Files Summary

**Application Layer:**

- `src/application/ports/output/feature-repository.interface.ts`
- `src/application/ports/output/worktree-service.interface.ts`
- `src/application/use-cases/features/create-feature.use-case.ts`
- `src/application/use-cases/features/list-features.use-case.ts`
- `src/application/use-cases/features/show-feature.use-case.ts`
- `src/application/use-cases/features/update-feature.use-case.ts`

**Infrastructure Layer:**

- `src/infrastructure/repositories/sqlite-feature.repository.ts`
- `src/infrastructure/persistence/sqlite/mappers/feature.mapper.ts`
- `src/infrastructure/services/git/worktree.service.ts`
- `src/infrastructure/services/agents/langgraph/feature-agent-graph.ts`
- `src/infrastructure/services/agents/langgraph/prompts/feature-agent.prompt.ts`
- `src/infrastructure/services/agents/feature-agent-worker.ts`

**Presentation Layer:**

- `src/presentation/cli/commands/feat/index.ts`
- `src/presentation/cli/commands/feat/new.command.ts`
- `src/presentation/cli/commands/feat/ls.command.ts`
- `src/presentation/cli/commands/feat/show.command.ts`

---

_Researched by 5 parallel agents. Proceed with `/shep-kit:plan`_
