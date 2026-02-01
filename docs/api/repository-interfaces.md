# Repository Interfaces

Data access interfaces (ports) defined in the Application layer.

## Overview

Repository interfaces abstract data persistence, allowing the domain to remain independent of storage implementation. These are defined in `src/application/ports/output/`.

## IFeatureRepository

Primary repository for Feature aggregate.

```typescript
/**
 * Repository interface for Feature aggregate persistence.
 * @see Feature - Domain entity
 * @see SqliteFeatureRepository - Default implementation
 */
export interface IFeatureRepository {
  /**
   * Find a feature by its unique identifier.
   * @param id - Feature UUID
   * @returns Feature if found, null otherwise
   */
  findById(id: string): Promise<Feature | null>;

  /**
   * Find all features for a specific repository path.
   * @param repoPath - Absolute path to repository
   * @returns Array of features (may be empty)
   */
  findByRepoPath(repoPath: string): Promise<Feature[]>;

  /**
   * Find all features in a specific lifecycle state.
   * @param lifecycle - Target lifecycle state
   * @returns Array of matching features
   */
  findByLifecycle(lifecycle: SdlcLifecycle): Promise<Feature[]>;

  /**
   * Persist a feature (insert or update).
   * @param feature - Feature to save
   * @throws RepositoryError on persistence failure
   */
  save(feature: Feature): Promise<void>;

  /**
   * Delete a feature and all related entities.
   * @param id - Feature UUID to delete
   * @throws RepositoryError if feature not found
   */
  delete(id: string): Promise<void>;
}
```

### Implementation Notes

- `findById` should load related entities (requirements, tasks, artifacts)
- `save` should use upsert semantics
- `delete` should cascade to related entities

### Example Implementation

```typescript
export class SqliteFeatureRepository implements IFeatureRepository {
  constructor(
    private readonly db: Database,
    private readonly taskRepo: ITaskRepository,
    private readonly artifactRepo: IArtifactRepository,
    private readonly requirementRepo: IRequirementRepository
  ) {}

  async findById(id: string): Promise<Feature | null> {
    const row = await this.db.get<FeatureRow>(
      'SELECT * FROM features WHERE id = ?',
      [id]
    );

    if (!row) return null;

    const [tasks, artifacts, requirements] = await Promise.all([
      this.taskRepo.findByFeatureId(id),
      this.artifactRepo.findByFeatureId(id),
      this.requirementRepo.findByFeatureId(id)
    ]);

    return FeatureMapper.toDomain(row, tasks, artifacts, requirements);
  }

  async save(feature: Feature): Promise<void> {
    await this.db.run(`
      INSERT INTO features (id, name, description, lifecycle, repo_path)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        lifecycle = excluded.lifecycle,
        updated_at = CURRENT_TIMESTAMP
    `, [
      feature.id,
      feature.name,
      feature.description,
      feature.lifecycle,
      feature.repoPath
    ]);
  }
}
```

## ITaskRepository

Repository for Task entities.

```typescript
/**
 * Repository interface for Task entity persistence.
 */
export interface ITaskRepository {
  /**
   * Find a task by its unique identifier.
   * @param id - Task UUID
   * @returns Task if found, null otherwise
   */
  findById(id: string): Promise<Task | null>;

  /**
   * Find all tasks belonging to a feature.
   * @param featureId - Parent feature UUID
   * @returns Array of tasks with action items loaded
   */
  findByFeatureId(featureId: string): Promise<Task[]>;

  /**
   * Find all tasks with a specific status.
   * @param status - Target status
   * @returns Matching tasks
   */
  findByStatus(status: TaskStatus): Promise<Task[]>;

  /**
   * Find a task with its full dependency graph.
   * @param taskId - Task UUID
   * @returns Task with populated dependsOn and dependents
   */
  findWithDependencies(taskId: string): Promise<TaskWithDependencies | null>;

  /**
   * Persist a single task.
   * @param task - Task to save
   */
  save(task: Task): Promise<void>;

  /**
   * Persist multiple tasks in a transaction.
   * @param tasks - Tasks to save
   */
  saveMany(tasks: Task[]): Promise<void>;

  /**
   * Delete a task and its action items.
   * @param id - Task UUID
   */
  delete(id: string): Promise<void>;

  /**
   * Delete all tasks for a feature.
   * @param featureId - Parent feature UUID
   */
  deleteByFeatureId(featureId: string): Promise<void>;
}

/**
 * Task with resolved dependency references.
 */
export interface TaskWithDependencies {
  task: Task;
  dependsOn: Task[];
  dependents: Task[];
}
```

## IActionItemRepository

Repository for ActionItem entities.

```typescript
/**
 * Repository interface for ActionItem entity persistence.
 */
export interface IActionItemRepository {
  /**
   * Find an action item by its unique identifier.
   * @param id - ActionItem UUID
   */
  findById(id: string): Promise<ActionItem | null>;

  /**
   * Find all action items belonging to a task.
   * @param taskId - Parent task UUID
   */
  findByTaskId(taskId: string): Promise<ActionItem[]>;

  /**
   * Persist a single action item.
   * @param actionItem - ActionItem to save
   */
  save(actionItem: ActionItem): Promise<void>;

  /**
   * Persist multiple action items in a transaction.
   * @param actionItems - ActionItems to save
   */
  saveMany(actionItems: ActionItem[]): Promise<void>;

  /**
   * Delete an action item.
   * @param id - ActionItem UUID
   */
  delete(id: string): Promise<void>;
}
```

## IArtifactRepository

Repository for Artifact entities.

```typescript
/**
 * Repository interface for Artifact entity persistence.
 */
export interface IArtifactRepository {
  /**
   * Find an artifact by its unique identifier.
   * @param id - Artifact UUID
   */
  findById(id: string): Promise<Artifact | null>;

  /**
   * Find all artifacts belonging to a feature.
   * @param featureId - Parent feature UUID
   */
  findByFeatureId(featureId: string): Promise<Artifact[]>;

  /**
   * Find all artifacts of a specific type.
   * @param type - Artifact type
   */
  findByType(type: ArtifactType): Promise<Artifact[]>;

  /**
   * Persist an artifact.
   * @param artifact - Artifact to save
   */
  save(artifact: Artifact): Promise<void>;

  /**
   * Delete an artifact.
   * @param id - Artifact UUID
   */
  delete(id: string): Promise<void>;
}
```

## IRequirementRepository

Repository for Requirement entities.

```typescript
/**
 * Repository interface for Requirement entity persistence.
 */
export interface IRequirementRepository {
  /**
   * Find a requirement by its unique identifier.
   * @param id - Requirement UUID
   */
  findById(id: string): Promise<Requirement | null>;

  /**
   * Find all requirements belonging to a feature.
   * @param featureId - Parent feature UUID
   */
  findByFeatureId(featureId: string): Promise<Requirement[]>;

  /**
   * Persist a single requirement.
   * @param requirement - Requirement to save
   */
  save(requirement: Requirement): Promise<void>;

  /**
   * Persist multiple requirements in a transaction.
   * @param requirements - Requirements to save
   */
  saveMany(requirements: Requirement[]): Promise<void>;

  /**
   * Delete a requirement.
   * @param id - Requirement UUID
   */
  delete(id: string): Promise<void>;
}
```

## IUnitOfWork

Transaction management across repositories.

```typescript
/**
 * Unit of Work pattern for transactional operations.
 */
export interface IUnitOfWork {
  /** Feature repository instance */
  features: IFeatureRepository;

  /** Task repository instance */
  tasks: ITaskRepository;

  /** ActionItem repository instance */
  actionItems: IActionItemRepository;

  /** Artifact repository instance */
  artifacts: IArtifactRepository;

  /** Requirement repository instance */
  requirements: IRequirementRepository;

  /**
   * Begin a transaction.
   */
  begin(): Promise<void>;

  /**
   * Commit the current transaction.
   * @throws TransactionError on commit failure
   */
  commit(): Promise<void>;

  /**
   * Rollback the current transaction.
   */
  rollback(): Promise<void>;
}
```

### Usage Example

```typescript
async function createFeatureWithPlan(
  uow: IUnitOfWork,
  featureData: CreateFeatureData,
  tasks: Task[]
): Promise<Feature> {
  await uow.begin();

  try {
    const feature = Feature.create(featureData);
    await uow.features.save(feature);

    for (const task of tasks) {
      task.featureId = feature.id;
    }
    await uow.tasks.saveMany(tasks);

    await uow.commit();
    return feature;
  } catch (error) {
    await uow.rollback();
    throw error;
  }
}
```

## IAnalysisRepository

Repository for repository analysis documents.

```typescript
/**
 * Repository for analysis document persistence.
 * Note: This uses file system, not SQLite.
 */
export interface IAnalysisRepository {
  /**
   * Get the analysis directory path for a repository.
   * @param repoPath - Repository path
   */
  getAnalysisPath(repoPath: string): string;

  /**
   * Check if analysis exists and is current.
   * @param repoPath - Repository path
   * @param maxAge - Maximum age in milliseconds
   */
  isAnalysisCurrent(repoPath: string, maxAge?: number): Promise<boolean>;

  /**
   * Read an analysis document.
   * @param repoPath - Repository path
   * @param docName - Document name (e.g., 'architecture.md')
   */
  readDocument(repoPath: string, docName: string): Promise<string | null>;

  /**
   * Write an analysis document.
   * @param repoPath - Repository path
   * @param docName - Document name
   * @param content - Document content
   */
  writeDocument(repoPath: string, docName: string, content: string): Promise<void>;

  /**
   * Read the analysis summary.
   * @param repoPath - Repository path
   */
  readSummary(repoPath: string): Promise<AnalysisSummary | null>;

  /**
   * Write the analysis summary.
   * @param repoPath - Repository path
   * @param summary - Summary data
   */
  writeSummary(repoPath: string, summary: AnalysisSummary): Promise<void>;
}
```

---

## Maintaining This Document

**Update when:**
- Repository interfaces change
- New repositories are added
- Method signatures change
- New patterns are introduced

**Related docs:**
- [domain-models.md](./domain-models.md) - Entity definitions
- [../architecture/repository-pattern.md](../architecture/repository-pattern.md) - Pattern details
- [../architecture/clean-architecture.md](../architecture/clean-architecture.md) - Layer context
