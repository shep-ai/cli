# Repository Pattern

Data persistence strategy using the Repository Pattern with SQLite.

## Overview

The Repository Pattern abstracts data access, providing a collection-like interface for domain objects while hiding storage implementation details.

```
┌─────────────────────────┐
│     Application Layer   │
│                         │
│  ┌───────────────────┐  │
│  │  IFeatureRepository│  │  ← Interface (Port)
│  └─────────┬─────────┘  │
└────────────┼────────────┘
             │ implements
┌────────────┼────────────┐
│  Infrastructure Layer   │
│                         │
│  ┌───────────────────┐  │
│  │SqliteFeatureRepo  │  │  ← Implementation
│  └─────────┬─────────┘  │
│            │            │
│  ┌─────────▼─────────┐  │
│  │   SQLite Database │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

## Repository Interfaces

Defined in `src/application/ports/output/`:

### IFeatureRepository

```typescript
export interface IFeatureRepository {
  // Queries
  findById(id: string): Promise<Feature | null>;
  findByRepoPath(repoPath: string): Promise<Feature[]>;
  findByLifecycle(lifecycle: SdlcLifecycle): Promise<Feature[]>;

  // Commands
  save(feature: Feature): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### ITaskRepository

```typescript
export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findByFeatureId(featureId: string): Promise<Task[]>;
  findByStatus(status: TaskStatus): Promise<Task[]>;
  findWithDependencies(taskId: string): Promise<TaskWithDeps>;

  save(task: Task): Promise<void>;
  saveMany(tasks: Task[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByFeatureId(featureId: string): Promise<void>;
}
```

### IActionItemRepository

```typescript
export interface IActionItemRepository {
  findById(id: string): Promise<ActionItem | null>;
  findByTaskId(taskId: string): Promise<ActionItem[]>;

  save(actionItem: ActionItem): Promise<void>;
  saveMany(actionItems: ActionItem[]): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### IArtifactRepository

```typescript
export interface IArtifactRepository {
  findById(id: string): Promise<Artifact | null>;
  findByFeatureId(featureId: string): Promise<Artifact[]>;
  findByType(type: ArtifactType): Promise<Artifact[]>;

  save(artifact: Artifact): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### IRequirementRepository

```typescript
export interface IRequirementRepository {
  findById(id: string): Promise<Requirement | null>;
  findByFeatureId(featureId: string): Promise<Requirement[]>;

  save(requirement: Requirement): Promise<void>;
  saveMany(requirements: Requirement[]): Promise<void>;
  delete(id: string): Promise<void>;
}
```

## SQLite Implementation

### Database Location

```
~/.shep/repos/<base64-encoded-repo-path>/data
```

The repo path is base64-encoded to create valid directory names while preserving uniqueness.

### Schema

```sql
-- features table
CREATE TABLE features (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  lifecycle TEXT NOT NULL DEFAULT 'requirements',
  repo_path TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- task_dependencies table (self-referencing many-to-many)
CREATE TABLE task_dependencies (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_id)
);

-- action_items table
CREATE TABLE action_items (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- action_item_dependencies table
CREATE TABLE action_item_dependencies (
  action_item_id TEXT NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
  depends_on_id TEXT NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
  PRIMARY KEY (action_item_id, depends_on_id)
);

-- artifacts table
CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- requirements table
CREATE TABLE requirements (
  id TEXT PRIMARY KEY,
  feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  source TEXT,  -- 'user' | 'inferred' | 'clarified'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tasks_feature_id ON tasks(feature_id);
CREATE INDEX idx_action_items_task_id ON action_items(task_id);
CREATE INDEX idx_artifacts_feature_id ON artifacts(feature_id);
CREATE INDEX idx_requirements_feature_id ON requirements(feature_id);
CREATE INDEX idx_features_repo_path ON features(repo_path);
```

### Data Mappers

Mappers translate between domain entities and persistence format:

```typescript
// src/infrastructure/repositories/mappers/feature.mapper.ts
export class FeatureMapper {
  static toDomain(row: FeatureRow): Feature {
    return new Feature(
      row.id,
      row.name,
      row.description,
      row.lifecycle as SdlcLifecycle,
      [], // Requirements loaded separately
      [], // Tasks loaded separately
      []  // Artifacts loaded separately
    );
  }

  static toPersistence(feature: Feature): FeatureRow {
    return {
      id: feature.id,
      name: feature.name,
      description: feature.description,
      lifecycle: feature.lifecycle,
      repo_path: feature.repoPath
    };
  }
}
```

### Repository Implementation Example

```typescript
// src/infrastructure/repositories/sqlite/feature.repository.ts
export class SqliteFeatureRepository implements IFeatureRepository {
  constructor(
    private readonly db: Database,
    private readonly taskRepository: ITaskRepository,
    private readonly artifactRepository: IArtifactRepository,
    private readonly requirementRepository: IRequirementRepository
  ) {}

  async findById(id: string): Promise<Feature | null> {
    const row = await this.db.get<FeatureRow>(
      'SELECT * FROM features WHERE id = ?',
      [id]
    );

    if (!row) return null;

    // Load aggregates
    const [tasks, artifacts, requirements] = await Promise.all([
      this.taskRepository.findByFeatureId(id),
      this.artifactRepository.findByFeatureId(id),
      this.requirementRepository.findByFeatureId(id)
    ]);

    return FeatureMapper.toDomain(row, tasks, artifacts, requirements);
  }

  async save(feature: Feature): Promise<void> {
    const data = FeatureMapper.toPersistence(feature);

    await this.db.run(`
      INSERT INTO features (id, name, description, lifecycle, repo_path, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        lifecycle = excluded.lifecycle,
        updated_at = CURRENT_TIMESTAMP
    `, [data.id, data.name, data.description, data.lifecycle, data.repo_path]);
  }
}
```

## Unit of Work

For transactions spanning multiple repositories:

```typescript
export interface IUnitOfWork {
  features: IFeatureRepository;
  tasks: ITaskRepository;
  actionItems: IActionItemRepository;
  artifacts: IArtifactRepository;
  requirements: IRequirementRepository;

  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
```

Usage:

```typescript
async function createFeatureWithPlan(
  uow: IUnitOfWork,
  feature: Feature,
  tasks: Task[]
): Promise<void> {
  await uow.begin();
  try {
    await uow.features.save(feature);
    await uow.tasks.saveMany(tasks);
    await uow.commit();
  } catch (error) {
    await uow.rollback();
    throw error;
  }
}
```

## Migrations

Migrations live in `src/infrastructure/persistence/migrations/`:

```
migrations/
├── 001_initial_schema.ts
├── 002_add_task_dependencies.ts
└── ...
```

Migration runner:

```typescript
export async function runMigrations(db: Database): Promise<void> {
  await db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = await db.all<{ name: string }>(
    'SELECT name FROM migrations'
  );
  const appliedNames = new Set(applied.map(m => m.name));

  for (const migration of migrations) {
    if (!appliedNames.has(migration.name)) {
      await migration.up(db);
      await db.run(
        'INSERT INTO migrations (name) VALUES (?)',
        [migration.name]
      );
    }
  }
}
```

## Future Considerations

The interface-based design allows for:

- **Alternative backends**: PostgreSQL, MongoDB, etc.
- **Caching layer**: Redis or in-memory cache wrapper
- **Sync adapters**: Cloud storage, remote databases
- **Testing**: In-memory implementations for fast tests

---

## Maintaining This Document

**Update when:**
- Schema changes occur
- New repositories are added
- Migration strategy changes
- New persistence features are introduced

**Related docs:**
- [clean-architecture.md](./clean-architecture.md) - Layer context
- [../api/repository-interfaces.md](../api/repository-interfaces.md) - Full interface specs
- [../api/domain-models.md](../api/domain-models.md) - Entity definitions
