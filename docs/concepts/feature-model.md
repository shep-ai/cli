# Feature Model

The Feature is the central aggregate root in Shep, representing a piece of work progressing through the SDLC lifecycle.

## Entity Definition

```typescript
export class Feature {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  name: string;
  userQuery: string;
  slug: string;
  description: string;
  repositoryPath: string;
  branch: string;
  lifecycle: SdlcLifecycle;

  messages: Message[];
  plan?: Plan;
  relatedArtifacts: Artifact[];

  agentRunId?: string;
  specPath?: string;
  worktreePath?: string;
  push: boolean;
  openPr: boolean;
  approvalGates: ApprovalGate[];
  pr?: PullRequest;
}
```

## Properties

### Identity

| Property         | Type     | Description                 |
| ---------------- | -------- | --------------------------- |
| `id`             | `string` | Unique identifier (UUID)    |
| `repositoryPath` | `string` | Absolute path to repository |
| `createdAt`      | `Date`   | Creation timestamp          |
| `updatedAt`      | `Date`   | Last update timestamp       |

### Core

| Property       | Type            | Description                       |
| -------------- | --------------- | --------------------------------- |
| `name`         | `string`        | Human-readable feature name       |
| `userQuery`    | `string`        | Original user query/request       |
| `slug`         | `string`        | URL-friendly identifier           |
| `description`  | `string`        | Detailed feature description      |
| `branch`       | `string`        | Git branch for the feature        |
| `lifecycle`    | `SdlcLifecycle` | Current lifecycle phase           |
| `push`         | `boolean`       | Whether to push changes           |
| `openPr`       | `boolean`       | Whether to open a pull request    |
| `agentRunId`   | `string?`       | Agent execution run ID (optional) |
| `specPath`     | `string?`       | Path to feature spec (optional)   |
| `worktreePath` | `string?`       | Path to git worktree (optional)   |

### Relationships

| Property           | Type             | Description                                               |
| ------------------ | ---------------- | --------------------------------------------------------- |
| `messages`         | `Message[]`      | Conversation messages                                     |
| `plan`             | `Plan?`          | Plan (contains requirements, tasks, artifacts) (optional) |
| `relatedArtifacts` | `Artifact[]`     | Generated documents                                       |
| `approvalGates`    | `ApprovalGate[]` | Approval gates for the feature                            |
| `pr`               | `PullRequest?`   | Associated pull request (optional)                        |

## Relationships Diagram

```
                    ┌─────────────────────────┐
                    │        Feature          │
                    │                         │
                    │  id                     │
                    │  name, slug, userQuery  │
                    │  description            │
                    │  repositoryPath, branch │
                    │  lifecycle              │
                    └──────────┬──────────────┘
                               │
          ┌────────────────────┼──────────────────┐
          │                    │                  │
          ▼                    ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│    Message[]    │  │   Plan? ────────┼──│ relatedArtifacts │
│                 │  │                 │  │   Artifact[]     │
│  conversation   │  │  requirements[] │  └──────────────────┘
│  messages       │  │  tasks[]        │
└─────────────────┘  │  artifacts[]    │
                     └────────┬────────┘
                              │
               ┌──────────────┼──────────────┐
               │              │              │
               ▼              ▼              ▼
     ┌──────────────┐ ┌────────────┐ ┌────────────┐
     │ Requirement  │ │    Task    │ │  Artifact  │
     │              │ │            │ │            │
     │ id, slug     │ │ id         │ │ id, name   │
     │ userQuery    │ │ title?     │ │ type       │
     │ type         │ │ state      │ │ category   │
     │ researches[] │ │ baseBranch │ │ format     │
     └──────────────┘ │ branch     │ │ summary    │
                      │ dependsOn[]│ │ path       │
                      │ actions[] ─┤ │ state      │
                      └────────┬───┘ └────────────┘
                               │
                               ▼
                     ┌──────────────────────┐
                     │     ActionItem       │
                     │                      │
                     │  id, name            │
                     │  description, branch │
                     │  dependsOn[]         │
                     │  acceptanceCriteria[]│
                     └──────────────────────┘
```

## Lifecycle Integration

Feature lifecycle determines available operations:

| Lifecycle      | Allowed Operations          |
| -------------- | --------------------------- |
| Started        | Initialize feature metadata |
| Analyze        | Repository analysis         |
| Requirements   | Add/modify requirements     |
| Research       | Technical investigation     |
| Planning       | Add/modify tasks, artifacts |
| Implementation | Update task state           |
| Review         | Review and approve changes  |
| Maintain       | All (new iteration)         |

## Aggregate Rules

As an aggregate root, Feature enforces these invariants:

1. **Lifecycle Consistency**: Plan (with tasks/requirements) only exists after Planning phase
2. **Requirement Lock**: Requirements immutable after Planning phase
3. **Dependency Integrity**: Task dependencies reference valid tasks within the plan
4. **Artifact Ownership**: Artifacts belong to exactly one feature (via plan or relatedArtifacts)

## Factory Method

```typescript
export class Feature {
  static create(props: CreateFeatureProps): Feature {
    return new Feature(
      generateId(),
      props.name,
      props.userQuery,
      props.slug,
      props.description,
      props.repositoryPath,
      props.branch,
      SdlcLifecycle.Started,
      new Date(),
      new Date(),
      [], // messages
      undefined, // plan
      [] // relatedArtifacts
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
  if (!this.plan) {
    throw new PlanNotInitializedError();
  }
  this.plan.requirements.push(requirement);
}
```

### Task Management

```typescript
setTasks(tasks: Task[]): void {
  if (this.lifecycle !== SdlcLifecycle.Planning) {
    throw new InvalidOperationForLifecycleError('setTasks', this.lifecycle);
  }
  if (!this.plan) {
    throw new PlanNotInitializedError();
  }
  this.validateTaskDependencies(tasks);
  this.plan.tasks = tasks;
}

private validateTaskDependencies(tasks: Task[]): void {
  const taskIds = new Set(tasks.map(t => t.id));
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      if (!taskIds.has(dep.id)) {
        throw new InvalidDependencyError(task.id, dep.id);
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
  const tasks = this.plan?.tasks ?? [];
  if (tasks.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  const completed = tasks.filter(
    t => t.state === TaskState.Done
  ).length;

  return {
    completed,
    total: tasks.length,
    percentage: Math.round((completed / tasks.length) * 100)
  };
}
```

## Persistence

Features are persisted via `IFeatureRepository`:

```typescript
interface IFeatureRepository {
  findById(id: string): Promise<Feature | null>;
  findByRepositoryPath(repositoryPath: string): Promise<Feature[]>;
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
  userQuery: 'Add OAuth2 login flow',
  slug: 'user-authentication',
  description: 'Implement OAuth2 login flow',
  repositoryPath: '/home/user/myapp',
  branch: 'feat/auth',
});

// Transition through early phases
feature.transitionTo(SdlcLifecycle.Analyze);
feature.transitionTo(SdlcLifecycle.Requirements);

// Add requirements (Requirements phase)
feature.addRequirement(
  new Requirement({
    slug: 'google-oauth',
    userQuery: 'Support Google OAuth',
    type: RequirementType.Functional,
  })
);

// Transition to Research, then Planning
feature.transitionTo(SdlcLifecycle.Research);
feature.transitionTo(SdlcLifecycle.Planning);

// Set tasks (Planning phase)
feature.setTasks(planningResult.tasks);

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
