# Repository Pattern

Data persistence strategy using the Repository Pattern with SQLite.

## Overview

The Repository Pattern abstracts data access, providing a collection-like interface for domain objects while hiding storage implementation details.

```
+-------------------------+
|     Application Layer   |
|                         |
|  +-------------------+  |
|  | IFeatureRepository|  |  <-- Interface (Port)
|  +---------+---------+  |
+------------+------------+
             | implements
+------------+------------+
|  Infrastructure Layer   |
|                         |
|  +-------------------+  |
|  |SqliteFeatureRepo  |  |  <-- Implementation
|  +---------+---------+  |
|            |            |
|  +---------v---------+  |
|  |   SQLite Database |  |
|  +-------------------+  |
+-------------------------+
```

## Repository Interfaces

Defined in `packages/core/src/application/ports/output/repositories/`:

### IFeatureRepository

```typescript
export interface IFeatureRepository {
  create(feature: Feature): Promise<void>;
  findById(id: string): Promise<Feature | null>;
  findByIdPrefix(prefix: string): Promise<Feature | null>;
  findBySlug(slug: string, repositoryPath: string): Promise<Feature | null>;
  list(filters?: FeatureListFilters): Promise<Feature[]>;
  update(feature: Feature): Promise<void>;
  findByParentId(parentId: string): Promise<Feature[]>;
  delete(id: string): Promise<void>;
}

export interface FeatureListFilters {
  repositoryPath?: string;
  lifecycle?: SdlcLifecycle;
}
```

### ISettingsRepository

```typescript
export interface ISettingsRepository {
  initialize(settings: Settings): Promise<void>;
  load(): Promise<Settings | null>;
  update(settings: Settings): Promise<void>;
}
```

### IRepositoryRepository

```typescript
export interface IRepositoryRepository {
  create(repository: Repository): Promise<Repository>;
  findById(id: string): Promise<Repository | null>;
  findByPath(path: string): Promise<Repository | null>;
  findByPathIncludingDeleted(path: string): Promise<Repository | null>;
  list(): Promise<Repository[]>;
  remove(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
```

### Agent-Related Repositories

Defined in `packages/core/src/application/ports/output/agents/`:

- **IAgentRunRepository** -- Persist agent run records
- **IPhaseTimingRepository** -- Track SDLC phase durations per agent run
- **IAgentSessionRepository** -- Manage agent sessions (list, get)

## SQLite Implementation

### Database Locations

- **Global settings**: `~/.shep/data` (settings table)
- **Per-repo data**: `~/.shep/repos/<base64-encoded-repo-path>/data` (features, agent_runs, etc.)

The repo path is base64-encoded to create valid directory names while preserving uniqueness.

### Actual Schema

The schema is managed through 28 migrations in `packages/core/src/infrastructure/persistence/sqlite/migrations.ts`. Key tables:

#### settings table

Singleton row with flattened columns for nested configuration objects:

- Model config: `model_default`, `model_analyze`, `model_requirements`, `model_plan`, `model_implement`
- User profile: `user_name`, `user_email`, `user_github_username`
- Environment: `env_default_editor`, `env_shell_preference`
- System: `sys_auto_update`, `sys_log_level`
- Agent: `agent_type`, `agent_auth_method`, `agent_token`
- Notifications: `notif_in_app_enabled`, `notif_browser_enabled`, `notif_desktop_enabled`, plus event filters
- Workflow: `workflow_open_pr_on_impl_complete`, approval gate defaults
- Feature flags: `feature_flag_skills`, `feature_flag_env_deploy`, `feature_flag_debug`
- CI config: `ci_max_fix_attempts`, `ci_watch_timeout_ms`, `ci_log_max_chars`

#### features table

Stores Feature entities with JSON columns for complex nested data (`messages`, `plan`, `related_artifacts`, `ci_fix_history`, `attachments`). Includes columns for lifecycle tracking, PR state, approval gates, worktree paths, and parent/child hierarchy.

#### agent_runs table

Tracks agent execution records with status, timing, PID for background processes, approval configuration, and model selection.

#### repositories table

Tracked code repositories with soft delete support via `deleted_at` column.

#### phase_timings table

Per-phase timing data for agent runs, including approval wait tracking.

### Implementation Files

```
packages/core/src/infrastructure/
+-- persistence/
|   +-- sqlite/
|       +-- connection.ts          # Database connection
|       +-- migrations.ts          # 28 migrations (user_version pragma)
|       +-- mappers/               # Domain <-> Persistence mapping
+-- repositories/
    +-- sqlite-feature.repository.ts
    +-- sqlite-settings.repository.ts
    +-- sqlite-repository.repository.ts
    +-- agent-run.repository.ts
    +-- sqlite-phase-timing.repository.ts
```

### Migrations

Migrations are managed via SQLite `user_version` pragma. All migration SQL is inlined in TypeScript (not separate .sql files) so it survives tsc compilation. The `runSQLiteMigrations()` function applies pending migrations transactionally.

---

## Maintaining This Document

**Update when:**

- Schema changes occur (new migrations added)
- New repositories are added
- Migration strategy changes
- New persistence features are introduced

**Related docs:**

- [clean-architecture.md](./clean-architecture.md) - Layer context
- [../api/repository-interfaces.md](../api/repository-interfaces.md) - Full interface specs
- [../api/domain-models.md](../api/domain-models.md) - Entity definitions
