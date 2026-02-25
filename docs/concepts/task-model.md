# Task Model

Tasks and ActionItems represent the executable work breakdown structure within a Feature.

## Task Entity

```typescript
export class Task {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  title?: string;
  description?: string;
  state: TaskState;
  baseBranch: string;
  branch: string;

  dependsOn: Task[];
  actionItems: ActionItem[];
}
```

### Properties

| Property      | Type           | Description                          |
| ------------- | -------------- | ------------------------------------ |
| `id`          | `string`       | Unique identifier (UUID)             |
| `title`       | `string?`      | Concise task title (optional)        |
| `description` | `string?`      | Detailed task description (optional) |
| `state`       | `TaskState`    | Current execution state              |
| `baseBranch`  | `string`       | Base branch for the task             |
| `branch`      | `string`       | Working branch for the task          |
| `dependsOn`   | `Task[]`       | Tasks that must complete first       |
| `actionItems` | `ActionItem[]` | Granular steps within task           |
| `createdAt`   | `Date`         | Creation timestamp                   |
| `updatedAt`   | `Date`         | Last update timestamp                |

## ActionItem Entity

```typescript
export class ActionItem {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  name: string;
  description: string;
  branch: string;

  dependsOn: ActionItem[];
  acceptanceCriteria: AcceptanceCriteria[];
}
```

### Properties

| Property             | Type                   | Description                           |
| -------------------- | ---------------------- | ------------------------------------- |
| `id`                 | `string`               | Unique identifier (UUID)              |
| `name`               | `string`               | Action item name                      |
| `description`        | `string`               | Detailed description                  |
| `branch`             | `string`               | Working branch for the action item    |
| `dependsOn`          | `ActionItem[]`         | Action items that must complete first |
| `acceptanceCriteria` | `AcceptanceCriteria[]` | Criteria for completion               |
| `createdAt`          | `Date`                 | Creation timestamp                    |
| `updatedAt`          | `Date`                 | Last update timestamp                 |

## AcceptanceCriteria Entity

```typescript
export class AcceptanceCriteria {
  readonly id: string;

  description: string;
  met: boolean;
}
```

### Properties

| Property      | Type      | Description                  |
| ------------- | --------- | ---------------------------- |
| `id`          | `string`  | Unique identifier (UUID)     |
| `description` | `string`  | Criterion description        |
| `met`         | `boolean` | Whether the criterion is met |

## TaskState Enum

```typescript
export enum TaskState {
  Todo = 'Todo',
  WIP = 'WIP',
  Done = 'Done',
  Review = 'Review',
}
```

### State Transitions

```
┌──────┐
│ Todo │
└──┬───┘
   │ start
   ▼
┌──────┐
│ WIP  │
└──┬───┘
   │ submit for review
   ▼
┌────────┐
│ Review │
└──┬─────┘
   │ approve
   ▼
┌──────┐
│ Done │
└──────┘
```

## Dependency Model

### Task Dependencies

Tasks can depend on other Tasks within the same Feature:

```
┌─────────────────────────────────────────────────────────────┐
│                         Feature                              │
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Task A  │───►│  Task B  │───►│  Task C  │              │
│  └──────────┘    └──────────┘    └──────────┘              │
│       │                               ▲                     │
│       │                               │                     │
│       └───────────────────────────────┘                     │
│                                                             │
│  Task C depends on Task A AND Task B                        │
└─────────────────────────────────────────────────────────────┘
```

### ActionItem Dependencies

ActionItems can depend on other ActionItems within the same Task:

```
┌─────────────────────────────────────────────────────────────┐
│                          Task                                │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ ActionItem 1 │───►│ ActionItem 2 │───►│ ActionItem 3 │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Rules

1. **No cross-task ActionItem dependencies** - ActionItems only depend on siblings
2. **No circular dependencies** - Validated at creation time
3. **Cascading blocks** - Dependent items blocked when dependency is blocked
4. **Automatic unblock** - Items unblock when dependencies complete

## Dependency Validation

```typescript
// src/domain/services/dependency-validator.ts
export class DependencyValidator {
  static validateTasks(tasks: Task[]): ValidationResult {
    const errors: ValidationError[] = [];

    // Check all dependencies exist
    const taskIds = new Set(tasks.map((t) => t.id));
    for (const task of tasks) {
      for (const dep of task.dependsOn) {
        if (!taskIds.has(dep.id)) {
          errors.push({
            type: 'missing_dependency',
            taskId: task.id,
            dependencyId: dep.id,
          });
        }
      }
    }

    // Check for cycles
    if (this.hasCycles(tasks)) {
      errors.push({ type: 'circular_dependency' });
    }

    return { valid: errors.length === 0, errors };
  }

  static hasCycles(tasks: Task[]): boolean {
    const graph = this.buildGraph(tasks);
    return this.detectCycle(graph);
  }

  private static detectCycle(graph: Map<string, string[]>): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      for (const neighbor of graph.get(nodeId) ?? []) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of graph.keys()) {
      if (!visited.has(nodeId) && dfs(nodeId)) {
        return true;
      }
    }

    return false;
  }
}
```

## Execution Order

The execution engine determines order based on dependencies:

```typescript
export class ExecutionGraph {
  private tasks: Map<string, Task>;
  private completed: Set<string>;

  getExecutable(): Task[] {
    return Array.from(this.tasks.values()).filter(
      (task) =>
        task.state === TaskState.Todo && task.dependsOn.every((dep) => this.completed.has(dep.id))
    );
  }

  markCompleted(taskId: string): void {
    this.completed.add(taskId);
    this.unblockDependents(taskId);
  }
}
```

## Task Progress

```typescript
class Task {
  get progress(): TaskProgress {
    if (this.actionItems.length === 0) {
      return {
        completed: this.state === TaskState.Done ? 1 : 0,
        total: 1,
        percentage: this.state === TaskState.Done ? 100 : 0,
      };
    }

    const completed = this.actionItems.filter((ai) =>
      ai.acceptanceCriteria.every((c) => c.met)
    ).length;

    return {
      completed,
      total: this.actionItems.length,
      percentage: Math.round((completed / this.actionItems.length) * 100),
    };
  }
}
```

## UI Representation

From the inspiration screenshot, tasks are displayed hierarchically:

```
┌─────────────────────────────────────────────────────────────┐
│ STORY  Develop Backend Service                    5 tasks   │
├─────────────────────────────────────────────────────────────┤
│   □ Design and implement Event Listener Module              │
│   □ Implement Event Accuracy Verification Service           │
│   □ Define and implement Notification data models           │
│   □ Develop Notification Dispatcher Service                 │
│   □ Integrate with a Message Queue                          │
└─────────────────────────────────────────────────────────────┘
```

## Example Usage

```typescript
// Create tasks during planning
const setupTask = new Task({
  title: 'Setup project structure',
  description: 'Initialize directories and configs',
  state: TaskState.Todo,
  baseBranch: 'main',
  branch: 'feat/setup',
  dependsOn: [],
});

const implementTask = new Task({
  title: 'Implement core logic',
  description: 'Build the main functionality',
  state: TaskState.Todo,
  baseBranch: 'main',
  branch: 'feat/core',
  dependsOn: [setupTask],
});

// Add action items
setupTask.actionItems = [
  new ActionItem({
    name: 'Create src directory',
    description: 'Initialize source directory',
    branch: 'feat/setup',
  }),
  new ActionItem({
    name: 'Add tsconfig.json',
    description: 'Configure TypeScript',
    branch: 'feat/setup',
  }),
  new ActionItem({
    name: 'Configure ESLint',
    description: 'Setup linting rules',
    branch: 'feat/setup',
  }),
];

// Check executability
const graph = new ExecutionGraph([setupTask, implementTask]);
console.log(graph.getExecutable()); // [setupTask] - implementTask blocked

// Mark complete and check again
graph.markCompleted(setupTask.id);
console.log(graph.getExecutable()); // [implementTask] - now executable
```

---

## Maintaining This Document

**Update when:**

- Task/ActionItem properties change
- Dependency rules evolve
- Status transitions change
- Execution logic updates

**Related docs:**

- [feature-model.md](./feature-model.md) - Parent entity
- [sdlc-lifecycle.md](./sdlc-lifecycle.md) - Lifecycle context
- [../architecture/agent-system.md](../architecture/agent-system.md) - Execution agents
