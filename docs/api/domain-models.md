# Domain Models

Complete reference for domain entities, value objects, and enums. All definitions are derived from the TypeSpec source of truth (`tsp/`).

## Base Entity

All domain entities extend `BaseEntity`, which provides identity and timestamp fields.

```typescript
export type BaseEntity = {
  /** Unique identifier (UUID v4) */
  id: UUID;
  /** Timestamp when created (read-only, set by system) */
  createdAt: utcDateTime;
  /** Timestamp when last updated (read-only, set by system) */
  updatedAt: utcDateTime;
};
```

## Entities

### Feature

The central aggregate root representing a piece of work progressing through the SDLC lifecycle. Feature encapsulates all related entities (Messages, Plan, Artifacts) and serves as the boundary for transactional consistency.

```typescript
/**
 * Feature aggregate root.
 * Tracks a piece of work through the SDLC lifecycle.
 *
 * @example
 * const feature: Feature = {
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   name: "User Authentication",
 *   slug: "user-authentication",
 *   description: "Implement OAuth 2.0 authentication flow",
 *   repositoryPath: "/home/user/my-project",
 *   branch: "feature/user-authentication",
 *   lifecycle: SdlcLifecycle.Requirements,
 *   messages: [],
 *   relatedArtifacts: [],
 *   createdAt: "2024-01-15T10:30:00Z",
 *   updatedAt: "2024-01-15T10:30:00Z"
 * };
 */
export type Feature = BaseEntity & {
  /** Human-readable name identifying this feature */
  name: string;

  /** URL-friendly identifier derived from name (unique within repository) */
  slug: string;

  /** Detailed description explaining the feature's purpose and scope */
  description: string;

  /** Absolute file system path to the repository */
  repositoryPath: string;

  /** Git branch name where this feature's work is performed */
  branch: string;

  /** Current stage in the SDLC lifecycle */
  lifecycle: SdlcLifecycle;

  /** Conversation history with the AI assistant */
  messages: Message[];

  /** Implementation plan containing tasks, artifacts, and requirements (optional) */
  plan?: Plan;

  /** Generated documents and artifacts attached to this feature */
  relatedArtifacts: Artifact[];
};
```

### Plan

Implementation plan for a feature containing tasks, artifacts, requirements, and optional scheduling data.

```typescript
/**
 * Plan entity representing a structured implementation plan.
 * Created during the Research phase and executed during Implementation.
 */
export type Plan = BaseEntity & {
  /** High-level overview describing the implementation approach */
  overview: string;

  /** User and inferred requirements that this plan addresses */
  requirements: Requirement[];

  /** Documents and artifacts to be produced as part of this plan */
  artifacts: Artifact[];

  /** Work items (tasks) that comprise this implementation plan */
  tasks: Task[];

  /** Current state of the plan execution lifecycle */
  state: PlanState;

  /** Optional Gantt chart visualization data for work scheduling */
  workPlan?: GanttViewData;
};
```

### Task

Discrete unit of work within a Plan. Tasks can depend on other tasks and contain action items for granular work tracking. Each task is associated with a Git branch for code isolation.

```typescript
/**
 * Task entity representing a unit of work.
 * Contains ActionItems and can depend on other Tasks.
 *
 * @example
 * {
 *   "id": "task-550e8400",
 *   "title": "Implement OAuth callback handler",
 *   "description": "Create the OAuth callback endpoint",
 *   "dependsOn": [],
 *   "actionItems": [...],
 *   "baseBranch": "main",
 *   "state": "WIP",
 *   "branch": "feature/oauth-callback"
 * }
 */
export type Task = BaseEntity & {
  /** Optional human-readable title for the task */
  title?: string;

  /** Optional detailed description of what the task entails */
  description?: string;

  /** Tasks that must be completed before this task can begin */
  dependsOn: Task[];

  /** Granular action items that comprise this task */
  actionItems: ActionItem[];

  /** The base branch from which this task's working branch was created */
  baseBranch: string;

  /** Current state of task execution (Todo, WIP, Review, Done) */
  state: TaskState;

  /** Git branch where work for this task is performed */
  branch: string;
};
```

### ActionItem

Granular, atomic step within a Task. Action items break down complex tasks into manageable pieces that can be worked on independently (subject to dependency constraints) and verified via acceptance criteria.

```typescript
/**
 * ActionItem entity representing a single atomic step.
 * Can depend on other ActionItems and has acceptance criteria.
 *
 * @example
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "name": "Add User Model",
 *   "description": "Create the User entity with email, password hash, and profile fields",
 *   "branch": "feature/user-auth/add-user-model",
 *   "dependsOn": [],
 *   "acceptanceCriteria": [
 *     { "description": "User model has email and passwordHash fields", "verified": false }
 *   ]
 * }
 */
export type ActionItem = BaseEntity & {
  /** Short name describing the action (verb-noun pattern recommended) */
  name: string;

  /** Detailed description of the work to be performed */
  description: string;

  /** Git branch name where this action item's work is performed */
  branch: string;

  /** Action items that must complete before this one can start */
  dependsOn: ActionItem[];

  /** Acceptance criteria for verifying completion of this action item */
  acceptanceCriteria: AcceptanceCriteria[];
};
```

### AcceptanceCriteria

Specific, testable condition that must be satisfied for an action item to be considered complete.

```typescript
/**
 * AcceptanceCriteria entity for validating action item completion.
 */
export type AcceptanceCriteria = BaseEntity & {
  /** Description of what must be true for this criterion to be satisfied */
  description: string;

  /** Whether this criterion has been verified as complete */
  verified: boolean;
};
```

### Artifact

Generated document or file attached to a Feature. Artifacts are produced by the AI system during various SDLC phases.

```typescript
/**
 * Artifact entity representing generated documentation.
 *
 * @example
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "name": "User Authentication PRD",
 *   "type": "documentation",
 *   "category": "PRD",
 *   "format": "md",
 *   "summary": "Product requirements for user authentication",
 *   "path": "docs/prd/user-authentication.md",
 *   "state": "Done"
 * }
 */
export type Artifact = BaseEntity & {
  /** Human-readable name identifying this artifact */
  name: string;

  /** Type description providing additional context (e.g., 'documentation', 'api-spec') */
  type: string;

  /** Category classification (PRD, API, Design, or Other) */
  category: ArtifactCategory;

  /** File format for the artifact content */
  format: ArtifactFormat;

  /** Brief summary of the artifact's content and purpose */
  summary: string;

  /** Relative file path where the artifact is stored */
  path: string;

  /** Current state in the artifact generation lifecycle */
  state: ArtifactState;
};
```

### Requirement

User or inferred requirement attached to a feature. Requirements are gathered during the requirements phase and form the basis for planning.

```typescript
/**
 * Requirement entity representing a gathered requirement.
 *
 * @example
 * {
 *   "id": "req-550e8400",
 *   "slug": "oauth-authentication",
 *   "userQuery": "I need users to be able to log in with Google",
 *   "type": "Functional",
 *   "researches": [
 *     { "topic": "Google OAuth 2.0 patterns", "state": "Finished", "summary": "..." }
 *   ]
 * }
 */
export type Requirement = BaseEntity & {
  /** URL-friendly short identifier for the requirement */
  slug: string;

  /** The original user query that generated this requirement */
  userQuery: string;

  /** Classification type of the requirement (Functional or NonFunctional) */
  type: RequirementType;

  /** Research activities conducted to clarify or validate this requirement */
  researches: Research[];
};
```

### Research

Research topic exploration for gathering technical information needed for requirement clarification or technical decisions.

```typescript
/**
 * Research entity for technical investigation activities.
 */
export type Research = BaseEntity & {
  /** The topic or subject being researched */
  topic: string;

  /** Current state of the research activity (NotStarted, Running, Finished) */
  state: ResearchState;

  /** Summary of research findings and recommendations */
  summary: string;

  /** Artifacts produced during the research activity */
  artifacts: Artifact[];
};
```

### Message

A message in a conversation thread between the user and the AI assistant.

```typescript
/**
 * Message entity for conversational interactions.
 */
export type Message = BaseEntity & {
  /** Role of the message sender (User or Assistant) */
  role: MessageRole;

  /** The text content of the message */
  content: string;

  /** Optional choices presented to the user for selection */
  options?: string[];

  /** Optional user's freeform text answer */
  answer?: string;

  /** Optional index of the selected option from the options array (0-based) */
  selectedOption?: number;
};
```

### Settings

Global Shep platform settings stored as a singleton. Contains all user preferences, model configurations, and system parameters.

```typescript
/**
 * Settings entity (singleton).
 * Only one instance exists per Shep installation.
 *
 * @example
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "models": {
 *     "analyze": "claude-sonnet-4-5",
 *     "requirements": "claude-sonnet-4-5",
 *     "plan": "claude-sonnet-4-5",
 *     "implement": "claude-opus-4-5"
 *   },
 *   "user": { "name": "Jane Doe", "email": "jane@example.com" },
 *   "environment": { "defaultEditor": "vscode", "shellPreference": "bash" },
 *   "system": { "autoUpdate": true, "logLevel": "info" },
 *   "agent": { "type": "claude-code", "authMethod": "session" }
 * }
 */
export type Settings = BaseEntity & {
  /** AI model configuration for different agents */
  models: ModelConfiguration;

  /** User profile information */
  user: UserProfile;

  /** Environment and tooling preferences */
  environment: EnvironmentConfig;

  /** System-level parameters */
  system: SystemConfig;

  /** AI coding agent selection and authentication */
  agent: AgentConfig;
};
```

#### ModelConfiguration

```typescript
export type ModelConfiguration = {
  /** Model for codebase analysis agent */
  analyze: string; // default: "claude-sonnet-4-5"

  /** Model for requirements gathering agent */
  requirements: string; // default: "claude-sonnet-4-5"

  /** Model for planning agent */
  plan: string; // default: "claude-sonnet-4-5"

  /** Model for implementation agent */
  implement: string; // default: "claude-sonnet-4-5"
};
```

#### UserProfile

```typescript
export type UserProfile = {
  /** User's display name (optional) */
  name?: string;

  /** User's email address (optional) */
  email?: string;

  /** GitHub username (optional, for PR attribution) */
  githubUsername?: string;
};
```

#### EnvironmentConfig

```typescript
export type EnvironmentConfig = {
  /** Preferred code editor */
  defaultEditor: string; // default: "vscode"

  /** Preferred shell */
  shellPreference: string; // default: "bash"
};
```

#### SystemConfig

```typescript
export type SystemConfig = {
  /** CLI auto-update preference */
  autoUpdate: boolean; // default: true

  /** Log level for CLI output */
  logLevel: string; // default: "info"
};
```

#### AgentConfig

```typescript
export type AgentConfig = {
  /** Selected AI coding agent */
  type: AgentType; // default: AgentType.ClaudeCode

  /** Authentication method for the agent */
  authMethod: AgentAuthMethod; // default: AgentAuthMethod.Session

  /** API token for token-based auth (optional) */
  token?: string;
};
```

## Value Objects

### VersionInfo

Package version metadata shared across presentation layers (CLI and Web UI).

```typescript
export interface VersionInfo {
  /** Package version (e.g., "1.6.1") */
  version: string;

  /** Package name (e.g., "@shepai/cli") */
  name: string;

  /** Package description */
  description: string;
}

/** Default version info when package.json cannot be read */
export const DEFAULT_VERSION_INFO: VersionInfo = {
  version: 'unknown',
  name: '@shepai/cli',
  description: 'Autonomous AI Native SDLC Platform',
};
```

### GanttViewData

Container for Gantt chart visualization data including tasks and time bounds.

```typescript
export type GanttViewData = {
  /** Collection of tasks to display in the Gantt chart */
  tasks: GanttTask[];

  /** Start date of the overall work plan (left boundary of the chart) */
  startDate: utcDateTime;

  /** End date of the overall work plan (right boundary of the chart) */
  endDate: utcDateTime;
};

export type GanttTask = {
  /** Unique identifier for the Gantt task */
  id: UUID;

  /** Display name of the task shown in the Gantt chart */
  name: string;

  /** Scheduled start time for the task */
  start: utcDateTime;

  /** Scheduled end time for the task */
  end: utcDateTime;

  /** IDs of tasks that this task depends on */
  dependencies: UUID[];

  /** Completion progress as a fraction (0.0 = not started, 1.0 = complete) */
  progress: number;
};
```

## Enums

### SdlcLifecycle

Software Development Lifecycle stages for feature progression.

```typescript
enum SdlcLifecycle {
  /** Gathering and documenting user requirements */
  Requirements = 'Requirements',

  /** Analyzing codebase and researching implementation approaches */
  Research = 'Research',

  /** Executing code changes based on the approved plan */
  Implementation = 'Implementation',

  /** Reviewing implemented changes for quality and correctness */
  Review = 'Review',

  /** Deploying changes and performing quality assurance */
  DeployAndQA = 'Deploy & QA',

  /** Ongoing maintenance and support of deployed features */
  Maintain = 'Maintain',
}
```

**Transition flow:**

```
Requirements --> Research --> Implementation --> Review --> Deploy & QA --> Maintain
```

### TaskState

States for task entities during execution.

```typescript
enum TaskState {
  /** Task created but not yet started */
  Todo = 'Todo',

  /** Task is currently being worked on */
  WIP = 'Work in Progress',

  /** Task work has been completed */
  Done = 'Done',

  /** Task is being reviewed for quality and correctness */
  Review = 'Review',
}
```

**Transition flow:**

```
Todo --> WIP --> Done
          |       |
          v       v
       Review <---+
          |
          v
    (back to WIP if issues found)
```

### PlanState

States for plan entities during the planning phase.

```typescript
enum PlanState {
  /** Plan is being created from requirements */
  Requirements = 'Requirements',

  /** Additional user clarification needed before proceeding */
  ClarificationRequired = 'ClarificationRequired',

  /** Plan is complete and ready for execution */
  Ready = 'Ready',
}
```

### ArtifactCategory

Categories for classifying artifact types by purpose.

```typescript
enum ArtifactCategory {
  /** Product Requirements Document */
  PRD = 'PRD',

  /** API specification and integration documentation */
  API = 'API',

  /** Architecture and technical design documentation */
  Design = 'Design',

  /** Artifacts that do not fit predefined categories */
  Other = 'Other',
}
```

### ArtifactFormat

File formats for artifact content storage.

```typescript
enum ArtifactFormat {
  /** Markdown format for rich text content */
  Markdown = 'md',

  /** Plain text format without markup */
  Text = 'txt',

  /** YAML format for structured data */
  Yaml = 'yaml',

  /** Formats that do not fit predefined types */
  Other = 'Other',
}
```

### ArtifactState

States for artifact entities during generation.

```typescript
enum ArtifactState {
  /** Artifact identified but not yet generated */
  Todo = 'Todo',

  /** Artifact content is being generated */
  Elaborating = 'Elaborating',

  /** Artifact generation is complete */
  Done = 'Done',
}
```

### RequirementType

Types of requirements based on their nature.

```typescript
enum RequirementType {
  /** Requirements describing system behaviors and features */
  Functional = 'Functional',

  /** Requirements describing quality attributes and constraints */
  NonFunctional = 'NonFunctional',
}
```

### ResearchState

States for research activities during analysis.

```typescript
enum ResearchState {
  /** Research queued but not yet started */
  NotStarted = 'NotStarted',

  /** Research analysis is in progress */
  Running = 'Running',

  /** Research analysis has been completed */
  Finished = 'Finished',
}
```

### MessageRole

Roles for message senders in conversations.

```typescript
enum MessageRole {
  /** AI assistant */
  Assistant = 'assistant',

  /** Human user */
  User = 'user',
}
```

### AgentType

AI coding agent tool selection.

```typescript
enum AgentType {
  /** Claude Code CLI by Anthropic */
  ClaudeCode = 'claude-code',

  /** Gemini CLI by Google (coming soon) */
  GeminiCli = 'gemini-cli',

  /** Aider AI coding assistant (coming soon) */
  Aider = 'aider',

  /** Continue IDE extension (coming soon) */
  Continue = 'continue',

  /** Cursor AI IDE (coming soon) */
  Cursor = 'cursor',
}
```

### AgentAuthMethod

Authentication method for the AI agent.

```typescript
enum AgentAuthMethod {
  /** Use agent's existing auth session */
  Session = 'session',

  /** Use API token stored in settings */
  Token = 'token',
}
```

### AgentStatus

Operational states for AI agents tracking their lifecycle.

```typescript
enum AgentStatus {
  /** Agent is ready but not currently executing tasks */
  Idle = 'Idle',

  /** Agent is actively executing tasks */
  Running = 'Running',

  /** Agent execution temporarily suspended */
  Paused = 'Paused',

  /** Agent has been stopped and requires restart */
  Stopped = 'Stopped',
}
```

### FeatureAgentState

States for the feature agent orchestrating the SDLC workflow.

```typescript
enum FeatureAgentState {
  /** Agent is collecting requirements from the user */
  GatheringRequirements = 'GatheringRequirements',

  /** Agent needs clarification from the user */
  ClarificationsRequired = 'ClarificationsRequired',

  /** Agent is analyzing codebase and researching approaches */
  DoingResearch = 'DoingResearch',

  /** Agent is waiting for user review of the plan */
  AwaitingReview = 'AwaitingReview',

  /** Agent is executing the approved work plan */
  ExecutingWorkPlan = 'ExecutingWorkPlan',

  /** Agent has completed all work for the feature */
  Ready = 'Ready',
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
```

---

## Maintaining This Document

**Update when:**

- Entity properties change in TypeSpec definitions (`tsp/`)
- New entities are added
- Value objects change
- Enums are added or modified

**Source of truth:** TypeSpec files in `tsp/` directory. Generated TypeScript types in `src/domain/generated/output.ts`.

**Related docs:**

- [repository-interfaces.md](./repository-interfaces.md) - Persistence
- [../concepts/](../concepts/) - Conceptual explanations
- [../architecture/clean-architecture.md](../architecture/clean-architecture.md) - Layer context
