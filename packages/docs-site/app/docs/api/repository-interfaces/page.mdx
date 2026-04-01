# Repository Interfaces

Data access interfaces (ports) defined in the Application layer.

## Overview

Repository interfaces abstract data persistence, allowing the domain to remain independent of storage implementation. These are defined in `packages/core/src/application/ports/output/repositories/`.

## IFeatureRepository

Primary repository for Feature aggregate. Located at `packages/core/src/application/ports/output/repositories/feature-repository.interface.ts`.

```typescript
export interface FeatureListFilters {
  repositoryPath?: string;
  lifecycle?: SdlcLifecycle;
}

export interface IFeatureRepository {
  /**
   * Create a new feature record.
   */
  create(feature: Feature): Promise<void>;

  /**
   * Find a feature by its unique ID.
   */
  findById(id: string): Promise<Feature | null>;

  /**
   * Find a feature by an ID prefix (e.g. first 8 chars from `feat ls`).
   * Returns the feature if exactly one match, null if none, throws if ambiguous.
   */
  findByIdPrefix(prefix: string): Promise<Feature | null>;

  /**
   * Find a feature by its slug within a repository.
   */
  findBySlug(slug: string, repositoryPath: string): Promise<Feature | null>;

  /**
   * List features with optional filters.
   */
  list(filters?: FeatureListFilters): Promise<Feature[]>;

  /**
   * Update an existing feature.
   */
  update(feature: Feature): Promise<void>;

  /**
   * Returns all direct (non-recursive) children of the given parent feature ID.
   * Children are ordered by creation time ascending.
   */
  findByParentId(parentId: string): Promise<Feature[]>;

  /**
   * Delete a feature by ID.
   */
  delete(id: string): Promise<void>;
}
```

### Implementation

`SqliteFeatureRepository` in `packages/core/src/infrastructure/repositories/sqlite-feature.repository.ts` stores features in the `features` SQLite table with JSON columns for nested data (messages, plan, related_artifacts, attachments, ci_fix_history).

## ISettingsRepository

Singleton settings persistence. Located at `packages/core/src/application/ports/output/repositories/settings.repository.interface.ts`.

```typescript
export interface ISettingsRepository {
  /**
   * Initialize settings for the first time.
   * @throws Error if settings already exist (singleton constraint)
   */
  initialize(settings: Settings): Promise<void>;

  /**
   * Load existing settings from the database.
   */
  load(): Promise<Settings | null>;

  /**
   * Update existing settings in the database.
   * @throws Error if settings don't exist (must initialize first)
   */
  update(settings: Settings): Promise<void>;
}
```

### Implementation

`SQLiteSettingsRepository` in `packages/core/src/infrastructure/repositories/sqlite-settings.repository.ts` stores settings in a flattened column format in the `settings` table.

## IRepositoryRepository

Repository entity management with soft delete. Located at `packages/core/src/application/ports/output/repositories/repository-repository.interface.ts`.

```typescript
export interface IRepositoryRepository {
  create(repository: Repository): Promise<Repository>;
  findById(id: string): Promise<Repository | null>;
  findByPath(path: string): Promise<Repository | null>;
  /** Find by path including soft-deleted records (for re-activation). */
  findByPathIncludingDeleted(path: string): Promise<Repository | null>;
  list(): Promise<Repository[]>;
  remove(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  /** Restore a soft-deleted repository by clearing deletedAt. */
  restore(id: string): Promise<void>;
}
```

### Implementation

`SqliteRepositoryRepository` in `packages/core/src/infrastructure/repositories/sqlite-repository.repository.ts`.

## Agent-Related Repositories

Defined in `packages/core/src/application/ports/output/agents/`:

### IAgentRunRepository

Persists agent execution run records in the `agent_runs` table.

### IPhaseTimingRepository

Tracks SDLC phase durations per agent run in the `phase_timings` table.

### IAgentSessionRepository

Manages agent sessions with list and get operations.

```typescript
export interface IAgentSessionRepository {
  list(options?: ListSessionsOptions): Promise<AgentSession[]>;
  get(options: GetSessionOptions): Promise<AgentSession | null>;
}
```

## Implementation Summary

| Interface                | Implementation                | Table           |
| ------------------------ | ----------------------------- | --------------- |
| `IFeatureRepository`     | `SqliteFeatureRepository`     | `features`      |
| `ISettingsRepository`    | `SQLiteSettingsRepository`    | `settings`      |
| `IRepositoryRepository`  | `SqliteRepositoryRepository`  | `repositories`  |
| `IAgentRunRepository`    | `AgentRunRepository`          | `agent_runs`    |
| `IPhaseTimingRepository` | `SqlitePhaseTimingRepository` | `phase_timings` |

---

## Maintaining This Document

**Update when:**

- Repository interfaces change
- New repositories are added
- Method signatures change

**Related docs:**

- [domain-models.md](./domain-models.md) - Entity definitions
- [../architecture/repository-pattern.md](../architecture/repository-pattern.md) - Pattern details
- [../architecture/clean-architecture.md](../architecture/clean-architecture.md) - Layer context
