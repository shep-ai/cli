# Task Model

Tasks and ActionItems represent the executable work breakdown structure within a Feature.

## Task Entity

```typescript
export class Task {
  readonly id: string;
  readonly featureId: string;
  readonly createdAt: Date;

  title: string;
  description: string;
  status: TaskStatus;
  orderIndex: number;

  dependsOn: string[]; // Task IDs
  actionItems: ActionItem[];
}
```

### Properties

| Property      | Type           | Description                           |
| ------------- | -------------- | ------------------------------------- |
| `id`          | `string`       | Unique identifier (UUID)              |
| `featureId`   | `string`       | Parent feature reference              |
| `title`       | `string`       | Concise task title                    |
| `description` | `string`       | Detailed task description             |
| `status`      | `TaskStatus`   | Current execution status              |
| `orderIndex`  | `number`       | Display/execution order hint          |
| `dependsOn`   | `string[]`     | IDs of tasks that must complete first |
| `actionItems` | `ActionItem[]` | Granular steps within task            |

## ActionItem Entity

```typescript
export class ActionItem {
  readonly id: string;
  readonly taskId: string;
  readonly createdAt: Date;

  title: string;
  status: TaskStatus;
  orderIndex: number;

  dependsOn: string[]; // ActionItem IDs (within same task)
}
```

### Properties

| Property     | Type         | Description                                  |
| ------------ | ------------ | -------------------------------------------- |
| `id`         | `string`     | Unique identifier (UUID)                     |
| `taskId`     | `string`     | Parent task reference                        |
| `title`      | `string`     | Action description                           |
| `status`     | `TaskStatus` | Current status                               |
| `orderIndex` | `number`     | Execution order within task                  |
| `dependsOn`  | `string[]`   | IDs of action items that must complete first |

## TaskStatus Enum

```typescript
export enum TaskStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Blocked = 'blocked',
}
```

### Status Transitions

```
┌─────────┐
│ Pending │
└────┬────┘
     │ start
     ▼
┌────────────┐     block     ┌─────────┐
│ InProgress │ ────────────► │ Blocked │
└─────┬──────┘               └────┬────┘
      │                           │ unblock
      │ complete                  │
      ▼                           ▼
┌───────────┐              ┌────────────┐
│ Completed │              │ InProgress │
└───────────┘              └────────────┘
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
      for (const depId of task.dependsOn) {
        if (!taskIds.has(depId)) {
          errors.push({
            type: 'missing_dependency',
            taskId: task.id,
            dependencyId: depId,
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
        task.status === TaskStatus.Pending &&
        task.dependsOn.every((depId) => this.completed.has(depId))
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
        completed: this.status === TaskStatus.Completed ? 1 : 0,
        total: 1,
        percentage: this.status === TaskStatus.Completed ? 100 : 0,
      };
    }

    const completed = this.actionItems.filter((ai) => ai.status === TaskStatus.Completed).length;

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
  featureId: feature.id,
  title: 'Setup project structure',
  description: 'Initialize directories and configs',
  dependsOn: [],
});

const implementTask = new Task({
  featureId: feature.id,
  title: 'Implement core logic',
  description: 'Build the main functionality',
  dependsOn: [setupTask.id],
});

// Add action items
setupTask.actionItems = [
  new ActionItem({ taskId: setupTask.id, title: 'Create src directory' }),
  new ActionItem({ taskId: setupTask.id, title: 'Add tsconfig.json' }),
  new ActionItem({ taskId: setupTask.id, title: 'Configure ESLint' }),
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
