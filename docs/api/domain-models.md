# Domain Models

Complete reference for domain entities and value objects.

## Entities

### Feature

The central aggregate root representing a piece of work.

```typescript
/**
 * Feature aggregate root.
 * Represents a piece of work progressing through the SDLC lifecycle.
 *
 * @example
 * const feature = Feature.create({
 *   name: 'User Authentication',
 *   description: 'Implement OAuth login',
 *   repoPath: '/home/user/myapp'
 * });
 */
export class Feature {
  /** Unique identifier (UUID v4) */
  readonly id: string;

  /** Absolute path to the repository */
  readonly repoPath: string;

  /** Creation timestamp */
  readonly createdAt: Date;

  /** Human-readable feature name */
  name: string;

  /** Detailed feature description */
  description: string;

  /** Current lifecycle phase */
  lifecycle: SdlcLifecycle;

  /** Gathered requirements (mutable only in Requirements phase) */
  requirements: Requirement[];

  /** Planned tasks (set during Plan phase) */
  tasks: Task[];

  /** Generated documentation artifacts */
  artifacts: Artifact[];

  /**
   * Factory method to create a new Feature.
   * @param props - Feature creation properties
   * @returns New Feature instance in Requirements phase
   */
  static create(props: CreateFeatureProps): Feature;

  /**
   * Check if transition to target lifecycle is valid.
   * @param target - Target lifecycle state
   */
  canTransitionTo(target: SdlcLifecycle): boolean;

  /**
   * Transition to a new lifecycle state.
   * @param target - Target lifecycle state
   * @throws InvalidLifecycleTransitionError if transition not allowed
   */
  transitionTo(target: SdlcLifecycle): void;

  /**
   * Add a requirement to the feature.
   * @param requirement - Requirement to add
   * @throws RequirementsLockedError if not in Requirements phase
   */
  addRequirement(requirement: Requirement): void;

  /**
   * Set the tasks for this feature.
   * @param tasks - Tasks to set
   * @throws InvalidOperationForLifecycleError if not in Plan phase
   * @throws InvalidDependencyError if dependencies invalid
   * @throws CircularDependencyError if cycle detected
   */
  setTasks(tasks: Task[]): void;

  /**
   * Calculate feature progress.
   * @returns Progress object with completed/total/percentage
   */
  get progress(): FeatureProgress;
}

interface CreateFeatureProps {
  name: string;
  description: string;
  repoPath: string;
}

interface FeatureProgress {
  completed: number;
  total: number;
  percentage: number;
}
```

### Task

Work item within a Feature.

```typescript
/**
 * Task entity representing a unit of work.
 * Contains ActionItems and can depend on other Tasks.
 */
export class Task {
  /** Unique identifier (UUID v4) */
  readonly id: string;

  /** Parent feature reference */
  readonly featureId: string;

  /** Creation timestamp */
  readonly createdAt: Date;

  /** Concise task title */
  title: string;

  /** Detailed task description */
  description: string;

  /** Current execution status */
  status: TaskStatus;

  /** Display/execution order hint */
  orderIndex: number;

  /** IDs of tasks that must complete before this one */
  dependsOn: string[];

  /** Granular steps within this task */
  actionItems: ActionItem[];

  /**
   * Check if this task can be executed.
   * @param completedTaskIds - Set of completed task IDs
   */
  canExecute(completedTaskIds: Set<string>): boolean;

  /**
   * Mark task as in progress.
   * @throws InvalidStatusTransitionError if not pending
   */
  start(): void;

  /**
   * Mark task as completed.
   * @throws InvalidStatusTransitionError if not in progress
   */
  complete(): void;

  /**
   * Mark task as blocked.
   * @param reason - Block reason
   */
  block(reason?: string): void;

  /**
   * Calculate task progress from action items.
   */
  get progress(): TaskProgress;
}
```

### ActionItem

Granular step within a Task.

```typescript
/**
 * ActionItem entity representing a single step.
 * Can depend on other ActionItems within the same Task.
 */
export class ActionItem {
  /** Unique identifier (UUID v4) */
  readonly id: string;

  /** Parent task reference */
  readonly taskId: string;

  /** Creation timestamp */
  readonly createdAt: Date;

  /** Action description */
  title: string;

  /** Current status */
  status: TaskStatus;

  /** Execution order within task */
  orderIndex: number;

  /** IDs of action items that must complete first (same task only) */
  dependsOn: string[];

  /**
   * Check if this action item can be executed.
   * @param completedIds - Set of completed action item IDs
   */
  canExecute(completedIds: Set<string>): boolean;

  /** Mark as in progress */
  start(): void;

  /** Mark as completed */
  complete(): void;

  /** Mark as blocked */
  block(reason?: string): void;
}
```

### Artifact

Generated documentation attached to a Feature.

```typescript
/**
 * Artifact entity representing generated documentation.
 */
export class Artifact {
  /** Unique identifier (UUID v4) */
  readonly id: string;

  /** Parent feature reference */
  readonly featureId: string;

  /** Creation timestamp */
  readonly createdAt: Date;

  /** Document type */
  type: ArtifactType;

  /** Document title */
  title: string;

  /** Markdown content */
  content: string;

  /** Relative file path in artifacts directory */
  filePath: string;

  /**
   * Update artifact content.
   * @param content - New content
   */
  updateContent(content: string): void;
}
```

### Requirement

Gathered requirement attached to a Feature.

```typescript
/**
 * Requirement entity representing a gathered requirement.
 */
export class Requirement {
  /** Unique identifier (UUID v4) */
  readonly id: string;

  /** Parent feature reference */
  readonly featureId: string;

  /** Creation timestamp */
  readonly createdAt: Date;

  /** Requirement description */
  description: string;

  /** Source of requirement */
  source: RequirementSource;
}

type RequirementSource = 'user' | 'inferred' | 'clarified';
```

## Value Objects

### SdlcLifecycle

Feature lifecycle states.

```typescript
/**
 * SDLC lifecycle phases.
 */
export enum SdlcLifecycle {
  /** Gathering requirements through conversation */
  Requirements = 'requirements',

  /** Breaking down into tasks and generating artifacts */
  Plan = 'plan',

  /** Executing code changes */
  Implementation = 'implementation',

  /** Validating implementation */
  Test = 'test',

  /** Releasing to target environment */
  Deploy = 'deploy',

  /** Ongoing support and iteration */
  Maintenance = 'maintenance',
}

/**
 * Lifecycle display names.
 */
export const LIFECYCLE_DISPLAY_NAMES: Record<SdlcLifecycle, string> = {
  [SdlcLifecycle.Requirements]: 'Requirements',
  [SdlcLifecycle.Plan]: 'Plan',
  [SdlcLifecycle.Implementation]: 'Implementation',
  [SdlcLifecycle.Test]: 'Test',
  [SdlcLifecycle.Deploy]: 'Deploy',
  [SdlcLifecycle.Maintenance]: 'Maintenance',
};
```

### TaskStatus

Task and ActionItem status states.

```typescript
/**
 * Status for Tasks and ActionItems.
 */
export enum TaskStatus {
  /** Not yet started */
  Pending = 'pending',

  /** Currently being executed */
  InProgress = 'in_progress',

  /** Successfully completed */
  Completed = 'completed',

  /** Blocked by dependency or error */
  Blocked = 'blocked',
}
```

### ArtifactType

Types of generated artifacts.

```typescript
/**
 * Types of documentation artifacts.
 */
export enum ArtifactType {
  /** Product Requirements Document */
  PRD = 'prd',

  /** Request for Comments / Technical Proposal */
  RFC = 'rfc',

  /** UI/UX or System Design */
  Design = 'design',

  /** Implementation Technical Details */
  TechPlan = 'tech_plan',

  /** Custom artifact type */
  Other = 'other',
}

/**
 * Artifact type display names.
 */
export const ARTIFACT_TYPE_NAMES: Record<ArtifactType, string> = {
  [ArtifactType.PRD]: 'Product Requirements Document',
  [ArtifactType.RFC]: 'Technical RFC',
  [ArtifactType.Design]: 'Design Document',
  [ArtifactType.TechPlan]: 'Technical Plan',
  [ArtifactType.Other]: 'Document',
};
```

## Domain Services

### LifecycleRules

Validates lifecycle transitions.

```typescript
/**
 * Domain service for lifecycle transition rules.
 */
export class LifecycleRules {
  /**
   * Check if transition is valid.
   * @param from - Current lifecycle
   * @param to - Target lifecycle
   */
  static canTransition(from: SdlcLifecycle, to: SdlcLifecycle): boolean;

  /**
   * Get all valid transitions from a state.
   * @param from - Current lifecycle
   */
  static getValidTransitions(from: SdlcLifecycle): SdlcLifecycle[];
}
```

### DependencyValidator

Validates dependency graphs.

```typescript
/**
 * Domain service for dependency validation.
 */
export class DependencyValidator {
  /**
   * Validate task dependencies.
   * @param tasks - Tasks to validate
   * @returns Validation result with errors if any
   */
  static validateTasks(tasks: Task[]): ValidationResult;

  /**
   * Validate action item dependencies within a task.
   * @param actionItems - ActionItems to validate
   */
  static validateActionItems(actionItems: ActionItem[]): ValidationResult;

  /**
   * Check for circular dependencies.
   * @param items - Items with dependsOn arrays
   */
  static hasCycles<T extends { id: string; dependsOn: string[] }>(items: T[]): boolean;

  /**
   * Topological sort of items by dependencies.
   * @param items - Items to sort
   * @returns Sorted items (dependencies first)
   * @throws CircularDependencyError if cycle exists
   */
  static topologicalSort<T extends { id: string; dependsOn: string[] }>(items: T[]): T[];
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  type: 'missing_dependency' | 'circular_dependency' | 'self_reference';
  itemId?: string;
  dependencyId?: string;
  message: string;
}
```

## Domain Errors

```typescript
/**
 * Base class for domain errors.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
}

export class InvalidLifecycleTransitionError extends DomainError {
  readonly code = 'INVALID_LIFECYCLE_TRANSITION';

  constructor(from: SdlcLifecycle, to: SdlcLifecycle) {
    super(`Cannot transition from ${from} to ${to}`);
  }
}

export class RequirementsLockedError extends DomainError {
  readonly code = 'REQUIREMENTS_LOCKED';

  constructor() {
    super('Cannot modify requirements after Plan phase');
  }
}

export class InvalidDependencyError extends DomainError {
  readonly code = 'INVALID_DEPENDENCY';

  constructor(itemId: string, dependencyId: string) {
    super(`Item ${itemId} has invalid dependency: ${dependencyId}`);
  }
}

export class CircularDependencyError extends DomainError {
  readonly code = 'CIRCULAR_DEPENDENCY';

  constructor() {
    super('Circular dependency detected in task graph');
  }
}

export class InvalidStatusTransitionError extends DomainError {
  readonly code = 'INVALID_STATUS_TRANSITION';

  constructor(from: TaskStatus, to: TaskStatus) {
    super(`Cannot transition from ${from} to ${to}`);
  }
}
```

---

## Maintaining This Document

**Update when:**

- Entity properties change
- New entities are added
- Value objects change
- Domain services evolve

**Related docs:**

- [repository-interfaces.md](./repository-interfaces.md) - Persistence
- [../concepts/](../concepts/) - Conceptual explanations
- [../architecture/clean-architecture.md](../architecture/clean-architecture.md) - Layer context
