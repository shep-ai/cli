# Feature Model

The Feature is the central aggregate root in Shep, representing a piece of work progressing through the SDLC lifecycle.

## Entity Definition

```typescript
export class Feature {
  readonly id: string;
  readonly repoPath: string;
  readonly createdAt: Date;

  name: string;
  description: string;
  lifecycle: SdlcLifecycle;

  requirements: Requirement[];
  tasks: Task[];
  artifacts: Artifact[];
}
```

## Properties

### Identity

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier (UUID) |
| `repoPath` | `string` | Absolute path to repository |
| `createdAt` | `Date` | Creation timestamp |

### Core

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Human-readable feature name |
| `description` | `string` | Detailed feature description |
| `lifecycle` | `SdlcLifecycle` | Current lifecycle phase |

### Relationships

| Property | Type | Description |
|----------|------|-------------|
| `requirements` | `Requirement[]` | Gathered requirements |
| `tasks` | `Task[]` | Planned work items |
| `artifacts` | `Artifact[]` | Generated documents |

## Relationships Diagram

```
                    ┌─────────────────────┐
                    │      Feature        │
                    │                     │
                    │  id                 │
                    │  name               │
                    │  description        │
                    │  lifecycle          │
                    │  repoPath           │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Requirement   │  │      Task       │  │    Artifact     │
│                 │  │                 │  │                 │
│  id             │  │  id             │  │  id             │
│  featureId      │  │  featureId      │  │  featureId      │
│  description    │  │  title          │  │  type           │
│  source         │  │  status         │  │  title          │
└─────────────────┘  │  dependsOn[]    │  │  content        │
                     │  actionItems[]  │  │  filePath       │
                     └────────┬────────┘  └─────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │   ActionItem    │
                     │                 │
                     │  id             │
                     │  taskId         │
                     │  title          │
                     │  status         │
                     │  dependsOn[]    │
                     └─────────────────┘
```

## Lifecycle Integration

Feature lifecycle determines available operations:

| Lifecycle | Allowed Operations |
|-----------|-------------------|
| Requirements | Add/modify requirements |
| Plan | Add/modify tasks, artifacts |
| Implementation | Update task status |
| Test | Update test results |
| Deploy | Update deployment status |
| Maintenance | All (new iteration) |

## Aggregate Rules

As an aggregate root, Feature enforces these invariants:

1. **Lifecycle Consistency**: Tasks only exist after Plan phase
2. **Requirement Lock**: Requirements immutable after Plan phase
3. **Dependency Integrity**: Task dependencies reference valid tasks
4. **Artifact Ownership**: Artifacts belong to exactly one feature

## Factory Method

```typescript
export class Feature {
  static create(props: CreateFeatureProps): Feature {
    return new Feature(
      generateId(),
      props.name,
      props.description,
      SdlcLifecycle.Requirements,
      props.repoPath,
      new Date(),
      [], // requirements
      [], // tasks
      []  // artifacts
    );
  }
}
```

## Domain Methods

### Lifecycle Transitions

```typescript
canTransitionTo(target: SdlcLifecycle): boolean {
  return LifecycleRules.canTransition(this.lifecycle, target);
}

transitionTo(target: SdlcLifecycle): void {
  if (!this.canTransitionTo(target)) {
    throw new InvalidLifecycleTransitionError(this.lifecycle, target);
  }
  this.lifecycle = target;
}
```

### Requirements Management

```typescript
addRequirement(requirement: Requirement): void {
  if (this.lifecycle !== SdlcLifecycle.Requirements) {
    throw new RequirementsLockedError();
  }
  this.requirements.push(requirement);
}
```

### Task Management

```typescript
setTasks(tasks: Task[]): void {
  if (this.lifecycle !== SdlcLifecycle.Plan) {
    throw new InvalidOperationForLifecycleError('setTasks', this.lifecycle);
  }
  this.validateTaskDependencies(tasks);
  this.tasks = tasks;
}

private validateTaskDependencies(tasks: Task[]): void {
  const taskIds = new Set(tasks.map(t => t.id));
  for (const task of tasks) {
    for (const depId of task.dependsOn) {
      if (!taskIds.has(depId)) {
        throw new InvalidDependencyError(task.id, depId);
      }
    }
  }
  // Check for cycles
  if (DependencyValidator.hasCycles(tasks)) {
    throw new CircularDependencyError();
  }
}
```

### Progress Calculation

```typescript
get progress(): FeatureProgress {
  if (this.tasks.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  const completed = this.tasks.filter(
    t => t.status === TaskStatus.Completed
  ).length;

  return {
    completed,
    total: this.tasks.length,
    percentage: Math.round((completed / this.tasks.length) * 100)
  };
}
```

## Persistence

Features are persisted via `IFeatureRepository`:

```typescript
interface IFeatureRepository {
  findById(id: string): Promise<Feature | null>;
  findByRepoPath(repoPath: string): Promise<Feature[]>;
  findByLifecycle(lifecycle: SdlcLifecycle): Promise<Feature[]>;
  save(feature: Feature): Promise<void>;
  delete(id: string): Promise<void>;
}
```

## Usage Example

```typescript
// Create new feature
const feature = Feature.create({
  name: 'User Authentication',
  description: 'Implement OAuth2 login flow',
  repoPath: '/home/user/myapp'
});

// Add requirements (Requirements phase)
feature.addRequirement(new Requirement({
  description: 'Support Google OAuth',
  source: 'user'
}));

// Transition to Plan
feature.transitionTo(SdlcLifecycle.Plan);

// Set tasks (Plan phase)
feature.setTasks(planningResult.tasks);
feature.setArtifacts(planningResult.artifacts);

// Transition to Implementation
feature.transitionTo(SdlcLifecycle.Implementation);

// Track progress
console.log(feature.progress); // { completed: 2, total: 5, percentage: 40 }
```

---

## Maintaining This Document

**Update when:**
- Feature entity properties change
- New domain methods are added
- Aggregate rules evolve
- Relationship structure changes

**Related docs:**
- [sdlc-lifecycle.md](./sdlc-lifecycle.md) - Lifecycle details
- [task-model.md](./task-model.md) - Task entity
- [artifacts.md](./artifacts.md) - Artifact entity
- [../api/domain-models.md](../api/domain-models.md) - Full type definitions
