# Feature Model

The Feature is the central aggregate root in Shep, representing a piece of work progressing through the SDLC lifecycle.

## Entity Definition

From `packages/core/src/domain/generated/output.ts` (TypeSpec-generated):

```typescript
export type Feature = BaseEntity & {
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
  repositoryId?: UUID;
  fast: boolean;
  push: boolean;
  openPr: boolean;
  approvalGates: ApprovalGates;
  worktreePath?: string;
  pr?: PullRequest;
  parentId?: UUID;
  attachments?: Attachment[];
};
```

## Properties

### Identity

| Property         | Type     | Description                           |
| ---------------- | -------- | ------------------------------------- |
| `id`             | `UUID`   | Unique identifier (UUID v4)           |
| `repositoryPath` | `string` | Absolute path to repository           |
| `repositoryId`   | `UUID?`  | ID of the Repository entity           |
| `slug`           | `string` | URL-friendly identifier (unique/repo) |
| `createdAt`      | `any`    | Creation timestamp                    |
| `updatedAt`      | `any`    | Last update timestamp                 |

### Core

| Property       | Type            | Description                                          |
| -------------- | --------------- | ---------------------------------------------------- |
| `name`         | `string`        | Human-readable feature name                          |
| `userQuery`    | `string`        | Original user query/request (preserved verbatim)     |
| `description`  | `string`        | Detailed feature description                         |
| `branch`       | `string`        | Git branch for the feature                           |
| `lifecycle`    | `SdlcLifecycle` | Current lifecycle phase                              |
| `fast`         | `boolean`       | Whether SDLC phases were skipped (fast mode)         |
| `push`         | `boolean`       | Push branch to remote after implementation           |
| `openPr`       | `boolean`       | Create PR after implementation                       |
| `agentRunId`   | `string?`       | Agent execution run ID (optional)                    |
| `specPath`     | `string?`       | Absolute path to feature spec directory (optional)   |
| `worktreePath` | `string?`       | Absolute path to git worktree (optional)             |
| `parentId`     | `UUID?`         | Parent feature ID for dependency tracking (optional) |

### Relationships

| Property           | Type            | Description                                     |
| ------------------ | --------------- | ----------------------------------------------- |
| `messages`         | `Message[]`     | Conversation history with AI assistant          |
| `plan`             | `Plan?`         | Implementation plan (tasks, artifacts, reqs)    |
| `relatedArtifacts` | `Artifact[]`    | Generated documents attached to this feature    |
| `approvalGates`    | `ApprovalGates` | Human-in-the-loop approval gate configuration   |
| `pr`               | `PullRequest?`  | Pull request tracking data (null until created) |
| `attachments`      | `Attachment[]?` | Files attached by user when creating/messaging  |

### ApprovalGates

```typescript
export type ApprovalGates = {
  allowPrd: boolean; // Skip human review after requirements phase
  allowPlan: boolean; // Skip human review after plan phase
  allowMerge: boolean; // Skip human review after merge phase
};
```

### PullRequest

```typescript
export type PullRequest = {
  url: string;
  number: number;
  status: PrStatus; // Open, Merged, Closed
  commitHash?: string;
  ciStatus?: CiStatus; // Pending, Success, Failure
  ciFixAttempts?: number;
  ciFixHistory?: CiFixRecord[];
};
```

### Attachment

```typescript
export type Attachment = {
  id: UUID;
  name: string;
  size: bigint;
  mimeType: string;
  path: string;
  createdAt: any;
};
```

## Relationships Diagram

```
                    +-------------------------+
                    |        Feature          |
                    |                         |
                    |  id, name, slug         |
                    |  userQuery, description |
                    |  repositoryPath, branch |
                    |  lifecycle, fast        |
                    |  push, openPr           |
                    |  approvalGates          |
                    +----------+--------------+
                               |
          +--------------------+------------------+
          |                    |                  |
          v                    v                  v
+-----------------+  +-----------------+  +------------------+
|    Message[]    |  |   Plan? --------+--| relatedArtifacts |
|                 |  |                 |  |   Artifact[]     |
|  conversation   |  |  requirements[] |  +------------------+
|  messages       |  |  tasks[]        |
+-----------------+  |  artifacts[]    |
                     +--------+--------+
                              |
               +--------------+--------------+
               |              |              |
               v              v              v
     +--------------+ +------------+ +------------+
     | Requirement  | |    Task    | |  Artifact  |
     |              | |            | |            |
     | id, slug     | | id         | | id, name   |
     | userQuery    | | title?     | | type       |
     | type         | | state      | | category   |
     | researches[] | | baseBranch | | format     |
     +--------------+ | branch     | | summary    |
                      | dependsOn[]| | path       |
                      | actions[] -+ | state      |
                      +--------+---+ +------------+
                               |
                               v
                     +----------------------+
                     |     ActionItem       |
                     |                      |
                     |  id, name            |
                     |  description, branch |
                     |  dependsOn[]         |
                     |  acceptanceCriteria[]|
                     +----------------------+
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
| Blocked        | Await resolution            |

## Aggregate Rules

As an aggregate root, Feature enforces these invariants:

1. **Lifecycle Consistency**: Plan (with tasks/requirements) only exists after Planning phase
2. **Requirement Lock**: Requirements immutable after Planning phase
3. **Dependency Integrity**: Task dependencies reference valid tasks within the plan
4. **Artifact Ownership**: Artifacts belong to exactly one feature (via plan or relatedArtifacts)

## Persistence

Features are persisted via `IFeatureRepository` (in `packages/core/src/application/ports/output/repositories/feature-repository.interface.ts`):

```typescript
interface IFeatureRepository {
  create(feature: Feature): Promise<void>;
  findById(id: string): Promise<Feature | null>;
  findByIdPrefix(prefix: string): Promise<Feature | null>;
  findBySlug(slug: string, repositoryPath: string): Promise<Feature | null>;
  list(filters?: FeatureListFilters): Promise<Feature[]>;
  update(feature: Feature): Promise<void>;
  findByParentId(parentId: string): Promise<Feature[]>;
  delete(id: string): Promise<void>;
}
```

---

## Maintaining This Document

**Update when:**

- Feature entity properties change (check `packages/core/src/domain/generated/output.ts`)
- New domain methods are added
- Aggregate rules evolve
- Relationship structure changes

**Related docs:**

- [sdlc-lifecycle.md](./sdlc-lifecycle.md) - Lifecycle details
- [task-model.md](./task-model.md) - Task entity
- [artifacts.md](./artifacts.md) - Artifact entity
- [../api/domain-models.md](../api/domain-models.md) - Full type definitions
