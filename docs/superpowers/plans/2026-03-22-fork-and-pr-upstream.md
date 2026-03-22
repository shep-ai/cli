# Fork & PR to Upstream — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable shep to fork repos and create PRs to upstream repositories the user doesn't own, with per-feature toggles for fork-and-PR mode and spec storage location.

**Architecture:** Two new Feature flags (`forkAndPr`, `commitSpecs`) control behavior. A new `IGitForkService` handles fork operations via `gh` CLI. The merge node branches based on `forkAndPr` — fork flow creates an upstream PR and transitions to new `AwaitingUpstream` lifecycle state. `PrSyncWatcherService` is extended to poll upstream PR status.

**Tech Stack:** TypeSpec, TypeScript, tsyringe DI, LangGraph state, SQLite migrations, Next.js/React (shadcn), Storybook, Vitest

**Spec:** `docs/superpowers/specs/2026-03-22-fork-and-pr-upstream-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `packages/core/src/application/ports/output/services/git-fork-service.interface.ts` | `IGitForkService` interface + error types |
| `packages/core/src/infrastructure/services/git/git-fork.service.ts` | Fork service implementation |
| `tests/unit/infrastructure/services/git/git-fork.service.test.ts` | Fork service unit tests |
| `packages/core/src/application/use-cases/features/poll-upstream-pr.use-case.ts` | `PollUpstreamPrUseCase` |
| `tests/unit/application/use-cases/features/poll-upstream-pr.use-case.test.ts` | Poll use case tests |
| `packages/core/src/infrastructure/persistence/sqlite/migrations/045-add-fork-and-pr-fields.ts` | DB migration |

### Modified Files

| File | Changes |
|------|---------|
| `tsp/common/enums/lifecycle.tsp` | Add `AwaitingUpstream` enum member |
| `tsp/domain/entities/feature.tsp` | Add `forkAndPr`, `commitSpecs` fields |
| `tsp/domain/value-objects/pull-request.tsp` | Add upstream PR fields |
| `packages/core/src/infrastructure/persistence/sqlite/mappers/feature.mapper.ts` | Map new fields |
| `packages/core/src/infrastructure/services/agents/feature-agent/state.ts` | Add `forkAndPr`, `commitSpecs` channels |
| `packages/core/src/infrastructure/services/agents/feature-agent/feature-agent-worker.ts` | Pass new flags to graph state |
| `packages/core/src/infrastructure/services/agents/feature-agent/nodes/merge/merge.node.ts` | Fork-aware merge branch |
| `packages/core/src/application/use-cases/features/create/create-feature.use-case.ts` | SHEP_HOME spec path when `commitSpecs=false` |
| `packages/core/src/infrastructure/di/container.ts` | Register `IGitForkService` |
| `packages/core/src/infrastructure/services/pr-sync/pr-sync-watcher.service.ts` | Poll `AwaitingUpstream` features |
| `src/presentation/web/components/common/feature-node/feature-node-state-config.ts` | Add `AwaitingUpstream` phase config |
| `src/presentation/web/components/common/feature-node/derive-feature-state.ts` | Map `AwaitingUpstream` lifecycle |
| `src/presentation/web/components/common/feature-create-drawer/feature-create-drawer.tsx` | Add toggles |
| `src/presentation/web/app/actions/create-feature.ts` | Pass new flags |

---

## Task 1: TypeSpec Model Changes + Code Generation

**Files:**
- Modify: `tsp/common/enums/lifecycle.tsp`
- Modify: `tsp/domain/entities/feature.tsp`
- Modify: `tsp/domain/value-objects/pull-request.tsp`
- Generated: `packages/core/src/domain/generated/output.ts`

- [ ] **Step 1: Add `AwaitingUpstream` to SdlcLifecycle enum**

In `tsp/common/enums/lifecycle.tsp`, add after the `Archived` member:

```typespec
/**
 * Upstream PR submitted state. The feature's code has been pushed to a fork
 * and a PR has been created to the upstream repo. Shep polls the upstream PR
 * status and auto-transitions to Maintain when merged.
 * Only reachable when forkAndPr=true.
 */
@doc("Upstream PR submitted — waiting for external merge on upstream repo")
AwaitingUpstream,
```

- [ ] **Step 2: Add `forkAndPr` and `commitSpecs` to Feature entity**

In `tsp/domain/entities/feature.tsp`, add after the `openPr` field:

```typespec
/** Fork repo and create PR to upstream at merge time */
@doc("Fork repo and create PR to upstream at merge time")
forkAndPr: boolean;

/** Commit specs/evidences into the repo */
@doc("Commit specs/evidences into the repo (defaults false when forkAndPr is enabled)")
commitSpecs: boolean;
```

- [ ] **Step 3: Add upstream PR fields to PullRequest value object**

In `tsp/domain/value-objects/pull-request.tsp`, add after the `mergeable` field:

```typespec
/** URL of the PR created on the upstream repo (fork-and-PR flow only) */
upstreamPrUrl?: string;

/** PR number on the upstream repo */
upstreamPrNumber?: int32;

/** Status of the upstream PR (Open, Merged, Closed) */
upstreamPrStatus?: PrStatus;
```

- [ ] **Step 4: Compile TypeSpec and verify**

Run: `pnpm tsp:compile`
Expected: Compilation succeeds, `packages/core/src/domain/generated/output.ts` updated with new types.

- [ ] **Step 5: Commit**

```bash
git add tsp/ packages/core/src/domain/generated/
git commit -m "feat(tsp): add fork-and-pr model fields and awaiting-upstream lifecycle"
```

---

## Task 2: Database Migration + Mapper Updates

**Files:**
- Create: `packages/core/src/infrastructure/persistence/sqlite/migrations/045-add-fork-and-pr-fields.ts`
- Modify: `packages/core/src/infrastructure/persistence/sqlite/mappers/feature.mapper.ts`

- [ ] **Step 1: Create migration file**

Create `packages/core/src/infrastructure/persistence/sqlite/migrations/045-add-fork-and-pr-fields.ts`:

```typescript
/**
 * Migration 045: Add fork-and-PR fields
 *
 * Adds forkAndPr and commitSpecs workflow flags to features table,
 * plus upstream PR tracking columns (url, number, status).
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(features)') as { name: string }[];
  const has = (name: string) => columns.some((c) => c.name === name);

  if (!has('fork_and_pr')) {
    db.exec('ALTER TABLE features ADD COLUMN fork_and_pr INTEGER NOT NULL DEFAULT 0');
  }
  if (!has('commit_specs')) {
    db.exec('ALTER TABLE features ADD COLUMN commit_specs INTEGER NOT NULL DEFAULT 1');
  }
  if (!has('upstream_pr_url')) {
    db.exec('ALTER TABLE features ADD COLUMN upstream_pr_url TEXT');
  }
  if (!has('upstream_pr_number')) {
    db.exec('ALTER TABLE features ADD COLUMN upstream_pr_number INTEGER');
  }
  if (!has('upstream_pr_status')) {
    db.exec('ALTER TABLE features ADD COLUMN upstream_pr_status TEXT');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
```

- [ ] **Step 2: Update FeatureRow interface in feature.mapper.ts**

Add to the `FeatureRow` interface after `open_pr: number;`:

```typescript
fork_and_pr: number;
commit_specs: number;
```

Add after `pr_mergeable: number | null;`:

```typescript
upstream_pr_url: string | null;
upstream_pr_number: number | null;
upstream_pr_status: string | null;
```

- [ ] **Step 3: Update `toDatabase()` in feature.mapper.ts**

Add after `open_pr: feature.openPr ? 1 : 0,`:

```typescript
fork_and_pr: feature.forkAndPr ? 1 : 0,
commit_specs: feature.commitSpecs ? 1 : 0,
```

Add after `pr_mergeable: feature.pr?.mergeable !== undefined ? (feature.pr.mergeable ? 1 : 0) : null,`:

```typescript
upstream_pr_url: feature.pr?.upstreamPrUrl ?? null,
upstream_pr_number: feature.pr?.upstreamPrNumber ?? null,
upstream_pr_status: feature.pr?.upstreamPrStatus ?? null,
```

- [ ] **Step 4: Update `fromDatabase()` in feature.mapper.ts**

Add after `openPr: row.open_pr === 1,`:

```typescript
forkAndPr: row.fork_and_pr === 1,
commitSpecs: row.commit_specs === 1,
```

Inside the `pr` reconstruction block (after `...(row.pr_mergeable != null && { mergeable: row.pr_mergeable === 1 }),`), add:

```typescript
...(row.upstream_pr_url != null && { upstreamPrUrl: row.upstream_pr_url }),
...(row.upstream_pr_number != null && { upstreamPrNumber: row.upstream_pr_number }),
...(row.upstream_pr_status != null && { upstreamPrStatus: row.upstream_pr_status as PrStatus }),
```

- [ ] **Step 5: Run tests to verify mapper**

Run: `pnpm test:unit -- --grep "feature.mapper"`
Expected: Existing mapper tests still pass. (New fields have defaults so existing test data works.)

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/infrastructure/persistence/sqlite/migrations/045-add-fork-and-pr-fields.ts packages/core/src/infrastructure/persistence/sqlite/mappers/feature.mapper.ts
git commit -m "feat(domain): add fork-and-pr database migration and mapper fields"
```

---

## Task 3: IGitForkService Interface

**Files:**
- Create: `packages/core/src/application/ports/output/services/git-fork-service.interface.ts`

- [ ] **Step 1: Create the interface file**

```typescript
/**
 * Git Fork Service Interface
 *
 * Output port for GitHub fork operations.
 * Manages forking repos, pushing to forks, and creating upstream PRs.
 */

export enum GitForkErrorCode {
  AUTH_FAILURE = 'AUTH_FAILURE',
  FORK_FAILED = 'FORK_FAILED',
  PUSH_FAILED = 'PUSH_FAILED',
  UPSTREAM_PR_FAILED = 'UPSTREAM_PR_FAILED',
  UPSTREAM_PR_NOT_FOUND = 'UPSTREAM_PR_NOT_FOUND',
}

export class GitForkError extends Error {
  constructor(
    message: string,
    public readonly code: GitForkErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'GitForkError';
  }
}

export interface UpstreamPrStatus {
  state: 'open' | 'merged' | 'closed';
  url: string;
  number: number;
}

export interface IGitForkService {
  /**
   * Fork the repository to the authenticated user's GitHub account.
   * Remaps remotes: origin -> fork, upstream -> original.
   * Idempotent: if already forked, returns existing fork.
   *
   * @param cwd - Working directory (worktree path)
   * @throws GitForkError with AUTH_FAILURE if not authenticated
   * @throws GitForkError with FORK_FAILED on API/network error
   */
  forkRepository(cwd: string): Promise<void>;

  /**
   * Push branch to origin (the fork).
   *
   * @param cwd - Working directory
   * @param branch - Branch name to push
   * @throws GitForkError with PUSH_FAILED on failure
   */
  pushToFork(cwd: string, branch: string): Promise<void>;

  /**
   * Create a PR from the fork to the upstream repository.
   *
   * @param cwd - Working directory
   * @param title - PR title
   * @param body - PR body
   * @param head - Head branch (on the fork)
   * @param base - Base branch on upstream
   * @returns Object with url and number of the created PR
   * @throws GitForkError with UPSTREAM_PR_FAILED on failure
   */
  createUpstreamPr(
    cwd: string,
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<{ url: string; number: number }>;

  /**
   * Get the status of an upstream PR.
   *
   * @param upstreamRepo - Upstream repo in "owner/repo" format
   * @param prNumber - PR number
   * @returns Status object with state, url, number
   * @throws GitForkError with UPSTREAM_PR_NOT_FOUND if PR doesn't exist
   */
  getUpstreamPrStatus(upstreamRepo: string, prNumber: number): Promise<UpstreamPrStatus>;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/application/ports/output/services/git-fork-service.interface.ts
git commit -m "feat(domain): add git fork service interface"
```

---

## Task 4: GitForkService Implementation + Tests (TDD)

**Files:**
- Create: `packages/core/src/infrastructure/services/git/git-fork.service.ts`
- Create: `tests/unit/infrastructure/services/git/git-fork.service.test.ts`

- [ ] **Step 1: Write failing tests for `forkRepository`**

Create `tests/unit/infrastructure/services/git/git-fork.service.test.ts`:

```typescript
import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitForkService } from '@/infrastructure/services/git/git-fork.service';
import { GitForkError, GitForkErrorCode } from '@/application/ports/output/services/git-fork-service.interface';
import type { ExecFunction } from '@/infrastructure/services/git/worktree.service';

describe('GitForkService', () => {
  let mockExec: ExecFunction;
  let service: GitForkService;

  beforeEach(() => {
    mockExec = vi.fn();
    service = new GitForkService(mockExec);
  });

  describe('forkRepository', () => {
    it('should fork and remap remotes', async () => {
      vi.mocked(mockExec).mockResolvedValueOnce({
        stdout: 'Created fork user/repo\n',
        stderr: '',
      });

      await service.forkRepository('/repo');

      expect(mockExec).toHaveBeenCalledWith(
        'gh',
        ['repo', 'fork', '--remote', '--remote-name', 'origin'],
        expect.objectContaining({ cwd: '/repo' })
      );
    });

    it('should handle already-forked repo (idempotent)', async () => {
      vi.mocked(mockExec).mockResolvedValueOnce({
        stdout: '',
        stderr: 'already exists',
      });

      await expect(service.forkRepository('/repo')).resolves.not.toThrow();
    });

    it('should detect origin is already a fork and ensure upstream remote', async () => {
      // First call: gh repo view detects fork
      vi.mocked(mockExec)
        .mockResolvedValueOnce({
          stdout: JSON.stringify({ isFork: true, parent: { owner: { login: 'upstream-owner' }, name: 'repo' } }),
          stderr: '',
        })
        // Second call: git remote get-url upstream — fails (doesn't exist)
        .mockRejectedValueOnce(new Error('No such remote'))
        // Third call: git remote add upstream
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      await service.forkRepository('/repo');

      // Verify upstream remote was added
      expect(mockExec).toHaveBeenCalledWith(
        'git',
        ['remote', 'add', 'upstream', 'https://github.com/upstream-owner/repo.git'],
        expect.objectContaining({ cwd: '/repo' })
      );
    });

    it('should throw AUTH_FAILURE when not authenticated', async () => {
      vi.mocked(mockExec).mockRejectedValueOnce(
        new Error('authentication required')
      );

      await expect(service.forkRepository('/repo')).rejects.toMatchObject({
        code: GitForkErrorCode.AUTH_FAILURE,
      });
    });
  });

  describe('pushToFork', () => {
    it('should push branch to origin', async () => {
      vi.mocked(mockExec).mockResolvedValueOnce({ stdout: '', stderr: '' });

      await service.pushToFork('/repo', 'feature/my-branch');

      expect(mockExec).toHaveBeenCalledWith(
        'git',
        ['push', '-u', 'origin', 'feature/my-branch'],
        expect.objectContaining({ cwd: '/repo' })
      );
    });
  });

  describe('createUpstreamPr', () => {
    it('should create PR to upstream repo', async () => {
      vi.mocked(mockExec).mockResolvedValueOnce({
        stdout: 'https://github.com/upstream/repo/pull/42\n',
        stderr: '',
      });

      const result = await service.createUpstreamPr(
        '/repo', 'feat: add thing', 'Description', 'feature/branch', 'main'
      );

      expect(result).toEqual({ url: 'https://github.com/upstream/repo/pull/42', number: 42 });
    });
  });

  describe('getUpstreamPrStatus', () => {
    it('should return merged status', async () => {
      vi.mocked(mockExec).mockResolvedValueOnce({
        stdout: JSON.stringify({ state: 'MERGED', url: 'https://github.com/o/r/pull/1', number: 1 }),
        stderr: '',
      });

      const result = await service.getUpstreamPrStatus('owner/repo', 1);
      expect(result.state).toBe('merged');
    });

    it('should return open status', async () => {
      vi.mocked(mockExec).mockResolvedValueOnce({
        stdout: JSON.stringify({ state: 'OPEN', url: 'https://github.com/o/r/pull/1', number: 1 }),
        stderr: '',
      });

      const result = await service.getUpstreamPrStatus('owner/repo', 1);
      expect(result.state).toBe('open');
    });

    it('should return closed status', async () => {
      vi.mocked(mockExec).mockResolvedValueOnce({
        stdout: JSON.stringify({ state: 'CLOSED', url: 'https://github.com/o/r/pull/1', number: 1 }),
        stderr: '',
      });

      const result = await service.getUpstreamPrStatus('owner/repo', 1);
      expect(result.state).toBe('closed');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail (RED)**

Run: `pnpm test:unit -- tests/unit/infrastructure/services/git/git-fork.service.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement GitForkService (GREEN)**

Create `packages/core/src/infrastructure/services/git/git-fork.service.ts`:

```typescript
/**
 * Git Fork Service
 *
 * Manages GitHub fork operations using the gh CLI.
 * Handles forking, pushing to forks, and creating upstream PRs.
 */

import { injectable, inject } from 'tsyringe';
import type { IGitForkService, UpstreamPrStatus } from '../../../application/ports/output/services/git-fork-service.interface.js';
import { GitForkError, GitForkErrorCode } from '../../../application/ports/output/services/git-fork-service.interface.js';
import type { ExecFunction } from './worktree.service.js';

@injectable()
export class GitForkService implements IGitForkService {
  constructor(
    @inject('ExecFunction') private readonly execFile: ExecFunction
  ) {}

  async forkRepository(cwd: string): Promise<void> {
    // First check if origin is already a fork
    try {
      const { stdout } = await this.execFile(
        'gh', ['repo', 'view', '--json', 'isFork,parent'],
        { cwd }
      );
      const repoInfo = JSON.parse(stdout.trim());
      if (repoInfo.isFork) {
        // Origin is already a fork — ensure upstream remote exists
        const parentOwner = repoInfo.parent?.owner?.login;
        const parentName = repoInfo.parent?.name;
        if (parentOwner && parentName) {
          try {
            await this.execFile('git', ['remote', 'get-url', 'upstream'], { cwd });
          } catch {
            // upstream remote doesn't exist, add it
            await this.execFile(
              'git',
              ['remote', 'add', 'upstream', `https://github.com/${parentOwner}/${parentName}.git`],
              { cwd }
            );
          }
        }
        return;
      }
    } catch {
      // gh repo view failed — not a GitHub repo or no auth, continue to fork
    }

    try {
      await this.execFile(
        'gh',
        ['repo', 'fork', '--remote', '--remote-name', 'origin'],
        { cwd }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('already exists')) {
        return; // Idempotent
      }
      const code = message.includes('auth')
        ? GitForkErrorCode.AUTH_FAILURE
        : GitForkErrorCode.FORK_FAILED;
      throw new GitForkError(
        `Failed to fork repository: ${message}`,
        code,
        error instanceof Error ? error : undefined
      );
    }
  }

  async pushToFork(cwd: string, branch: string): Promise<void> {
    try {
      await this.execFile('git', ['push', '-u', 'origin', branch], { cwd });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new GitForkError(
        `Failed to push to fork: ${message}`,
        GitForkErrorCode.PUSH_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  async createUpstreamPr(
    cwd: string,
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<{ url: string; number: number }> {
    try {
      const { stdout } = await this.execFile(
        'gh',
        ['pr', 'create', '--repo', await this.getUpstreamRepo(cwd), '--title', title, '--body', body, '--head', head, '--base', base],
        { cwd }
      );
      const url = stdout.trim();
      const match = url.match(/\/pull\/(\d+)/);
      const number = match ? parseInt(match[1], 10) : 0;
      return { url, number };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new GitForkError(
        `Failed to create upstream PR: ${message}`,
        GitForkErrorCode.UPSTREAM_PR_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  async getUpstreamPrStatus(upstreamRepo: string, prNumber: number): Promise<UpstreamPrStatus> {
    try {
      const { stdout } = await this.execFile(
        'gh',
        ['pr', 'view', String(prNumber), '--repo', upstreamRepo, '--json', 'state,url,number'],
        {}
      );
      const data = JSON.parse(stdout.trim());
      return {
        state: data.state.toLowerCase() as 'open' | 'merged' | 'closed',
        url: data.url,
        number: data.number,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new GitForkError(
        `Failed to get upstream PR status: ${message}`,
        GitForkErrorCode.UPSTREAM_PR_NOT_FOUND,
        error instanceof Error ? error : undefined
      );
    }
  }

  private async getUpstreamRepo(cwd: string): Promise<string> {
    // Try parsing the upstream remote URL directly (fastest, no API call)
    try {
      const { stdout: remoteUrl } = await this.execFile(
        'git', ['remote', 'get-url', 'upstream'],
        { cwd }
      );
      const match = remoteUrl.trim().match(/github\.com[/:]([^/]+)\/([^/.]+)/);
      if (match) return `${match[1]}/${match[2]}`;
    } catch {
      // upstream remote doesn't exist, fall through
    }

    // Fallback: use gh CLI to get upstream repo info
    const { stdout } = await this.execFile(
      'gh', ['repo', 'view', '--json', 'parent'],
      { cwd }
    );
    const data = JSON.parse(stdout.trim());
    if (data.parent?.owner?.login && data.parent?.name) {
      return `${data.parent.owner.login}/${data.parent.name}`;
    }

    throw new GitForkError(
      'Could not determine upstream repository',
      GitForkErrorCode.FORK_FAILED
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass (GREEN)**

Run: `pnpm test:unit -- tests/unit/infrastructure/services/git/git-fork.service.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/application/ports/output/services/git-fork-service.interface.ts packages/core/src/infrastructure/services/git/git-fork.service.ts tests/unit/infrastructure/services/git/git-fork.service.test.ts
git commit -m "feat(agents): add git fork service with tests"
```

---

## Task 5: Feature Agent State Channels + Worker Args

**Files:**
- Modify: `packages/core/src/infrastructure/services/agents/feature-agent/state.ts`
- Modify: `packages/core/src/infrastructure/services/agents/feature-agent/feature-agent-worker.ts`

- [ ] **Step 1: Add `forkAndPr` and `commitSpecs` state channels**

In `state.ts`, add after the `openPr` channel (line 83):

```typescript
forkAndPr: Annotation<boolean>({
  reducer: (_prev, next) => next,
  default: () => false,
}),
commitSpecs: Annotation<boolean>({
  reducer: (_prev, next) => next,
  default: () => true,
}),
```

- [ ] **Step 2: Add to WorkerArgs interface**

In `feature-agent-worker.ts`, add after `openPr?: boolean;` (line 51):

```typescript
forkAndPr?: boolean;
commitSpecs?: boolean;
```

- [ ] **Step 3: Pass flags to graph state invocation**

In the graph invocation blocks (both resume and fresh start), add after `openPr: args.openPr ?? false,`:

```typescript
forkAndPr: args.forkAndPr ?? false,
commitSpecs: args.commitSpecs ?? true,
```

- [ ] **Step 4: Update `parseWorkerArgs`**

Find the `parseWorkerArgs` function and add parsing for `--fork-and-pr` and `--commit-specs` flags following the same pattern as `--push` and `--open-pr`.

- [ ] **Step 5: Run tests**

Run: `pnpm test:unit -- --grep "worker"`
Expected: Existing worker tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/infrastructure/services/agents/feature-agent/state.ts packages/core/src/infrastructure/services/agents/feature-agent/feature-agent-worker.ts
git commit -m "feat(agents): add fork-and-pr state channels and worker args"
```

---

## Task 6: Merge Node Fork Branch

**Files:**
- Modify: `packages/core/src/infrastructure/services/agents/feature-agent/nodes/merge/merge.node.ts`

- [ ] **Step 1: Add IGitForkService to MergeNodeDeps**

Add import:

```typescript
import type { IGitForkService } from '@/application/ports/output/services/git-fork-service.interface.js';
```

Add to `MergeNodeDeps` interface:

```typescript
gitForkService: IGitForkService;
```

- [ ] **Step 2: Add fork branch after CI watch/fix loop and before persisting lifecycle**

After the CI watch/fix loop block (around line 241), and before the "Persist lifecycle + PR data before approval gate" block (line 243), add the fork-and-PR branch:

```typescript
// --- Fork-and-PR flow ---
if (state.forkAndPr) {
  // Persist lifecycle=Review + PR data before fork approval gate
  if (feature) {
    await deps.featureRepository.update({
      ...feature,
      lifecycle: SdlcLifecycle.Review,
      ...(commitHash ? { pr: { ...feature.pr, commitHash } as any } : {}),
      updatedAt: new Date(),
    });
  }

  // Fork approval gate
  if (shouldInterrupt('merge', state.approvalGates)) {
    log.info('Interrupting for fork-and-PR approval');
    await recordPhaseEnd(mergeTimingId, Date.now() - startTime, {
      inputTokens: totalInputTokens || undefined,
      outputTokens: totalOutputTokens || undefined,
      exitCode: 'success',
    });
    await recordApprovalWaitStart(mergeTimingId);
    const diffSummary = await deps.getDiffSummary(cwd, baseBranch);
    interrupt({
      node: 'merge',
      message: 'Ready to fork and create upstream PR. Review the changes and approve to continue.',
      diffSummary,
      evidence: state.evidence ?? [],
    });
  }
}
```

- [ ] **Step 3: Replace the merge section with fork-aware logic**

Modify the "Merge" section (around line 305-338). Wrap the existing merge logic in `if (!state.forkAndPr)` and add the fork flow in an `else`:

```typescript
let merged = false;
const userApprovedMerge = isResumeAfterInterrupt && state._approvalAction !== 'rejected';

if (state.forkAndPr) {
  // Fork flow: fork repo, push to fork, create upstream PR
  if (state.approvalGates?.allowMerge || userApprovedMerge) {
    log.info('Forking repository and creating upstream PR');
    await deps.gitForkService.forkRepository(cwd);
    await deps.gitForkService.pushToFork(cwd, branch);

    const prTitle = `feat: ${feature?.name ?? branch}`;
    const prBody = feature?.description ?? '';
    const upstreamPr = await deps.gitForkService.createUpstreamPr(
      cwd, prTitle, prBody, branch, baseBranch
    );

    // Store upstream PR data and transition to AwaitingUpstream
    if (feature) {
      await deps.featureRepository.update({
        ...feature,
        lifecycle: SdlcLifecycle.AwaitingUpstream,
        pr: {
          ...(feature.pr ?? { url: '', number: 0, status: PrStatus.Open }),
          upstreamPrUrl: upstreamPr.url,
          upstreamPrNumber: upstreamPr.number,
          upstreamPrStatus: PrStatus.Open,
        },
        updatedAt: new Date(),
      });
    }
    messages.push(`[merge] Upstream PR created: ${upstreamPr.url}`);
    messages.push(`[merge] Feature lifecycle → AwaitingUpstream`);
  }
} else {
  // Existing merge flow (unchanged)
  if (state.approvalGates?.allowMerge || userApprovedMerge) {
    // ... existing merge code stays here ...
  }
}
```

- [ ] **Step 4: Update the lifecycle update section**

The lifecycle update at line 341 needs to account for `forkAndPr`. When `forkAndPr=true`, lifecycle was already set to `AwaitingUpstream` in the fork branch. For the existing flow, keep the current logic:

```typescript
// --- Update feature lifecycle (non-fork flow only) ---
if (!state.forkAndPr) {
  const newLifecycle = merged ? SdlcLifecycle.Maintain : SdlcLifecycle.Review;
  // ... existing lifecycle update code ...
}
```

- [ ] **Step 5: Run existing merge node tests**

Run: `pnpm test:unit -- --grep "merge"`
Expected: Existing tests pass (they don't set `forkAndPr` so they follow the existing path).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/infrastructure/services/agents/feature-agent/nodes/merge/merge.node.ts
git commit -m "feat(agents): add fork-and-pr branch to merge node"
```

---

## Task 7: Create Feature Use Case — SHEP_HOME Spec Path (TDD)

**Files:**
- Modify: `packages/core/src/application/use-cases/features/create/create-feature.use-case.ts`
- Modify: tests for create-feature use case

- [ ] **Step 1: Write failing tests for commitSpecs spec path logic (RED)**

Add tests to the create-feature use case test file:

```typescript
describe('commitSpecs spec path', () => {
  it('should use SHEP_HOME spec path when commitSpecs is false', async () => {
    const result = await useCase.initializeAndSpawn(feature, {
      ...baseInput,
      commitSpecs: false,
    }, true);

    // specInitializer.initialize should be called with SHEP_HOME-based path
    expect(mockSpecInitializer.initialize).toHaveBeenCalledWith(
      expect.stringContaining('.shep/specs/'),
      expect.any(String),
      expect.any(Number),
      expect.any(String),
      undefined
    );
  });

  it('should use worktree spec path when commitSpecs is true', async () => {
    const result = await useCase.initializeAndSpawn(feature, {
      ...baseInput,
      commitSpecs: true,
    }, true);

    // specInitializer.initialize should be called with worktree path (existing behavior)
    expect(mockSpecInitializer.initialize).toHaveBeenCalledWith(
      expect.not.stringContaining('.shep/specs/'),
      expect.any(String),
      expect.any(Number),
      expect.any(String),
      undefined
    );
  });

  it('should default commitSpecs to true when not specified', async () => {
    const result = await useCase.initializeAndSpawn(feature, baseInput, true);

    // Should use worktree path (default behavior)
    expect(mockSpecInitializer.initialize).toHaveBeenCalledWith(
      expect.not.stringContaining('.shep/specs/'),
      expect.any(String),
      expect.any(Number),
      expect.any(String),
      undefined
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail (RED)**

Run: `pnpm test:unit -- --grep "commitSpecs spec path"`
Expected: FAIL — commitSpecs not handled yet

- [ ] **Step 3: Implement SHEP_HOME spec path logic (GREEN)**

In the `initializeAndSpawn` method, before the spec initialization call (search for `specInitializer.initialize`), add:

```typescript
// Determine spec base path: SHEP_HOME when commitSpecs=false, worktree when true
const commitSpecs = input.commitSpecs ?? true;
let specBasePath: string;
if (commitSpecs) {
  specBasePath = worktreePath;
} else {
  const { getShepHomeDir } = await import('@/infrastructure/services/filesystem/shep-directory.service.js');
  const { join } = await import('node:path');
  const { mkdir } = await import('node:fs/promises');
  specBasePath = join(getShepHomeDir(), 'specs', feature.id);
  await mkdir(specBasePath, { recursive: true, mode: 0o700 });
}
```

Then update the `specInitializer.initialize()` call to use `specBasePath` instead of `worktreePath`:

```typescript
const { specDir } = await this.specInitializer.initialize(
  specBasePath,  // was: worktreePath
  slug,
  featureNumber,
  input.userInput,
  input.fast ? 'fast' : undefined
);
```

- [ ] **Step 4: Run tests (GREEN)**

Run: `pnpm test:unit -- --grep "commitSpecs spec path"`
Expected: All PASS

- [ ] **Step 5: Pass `forkAndPr` and `commitSpecs` to feature record in `createRecord`**

In the feature record creation within `createRecord()`, add:

```typescript
forkAndPr: input.forkAndPr ?? false,
commitSpecs: input.commitSpecs ?? true,
```

- [ ] **Step 6: Pass flags to agent spawn**

In the agent spawn call, pass the new flags so they reach the worker:

```typescript
forkAndPr: input.forkAndPr ?? false,
commitSpecs: input.commitSpecs ?? true,
```

- [ ] **Step 7: Run full create-feature tests**

Run: `pnpm test:unit -- --grep "create-feature"`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/application/use-cases/features/create/create-feature.use-case.ts tests/
git commit -m "feat(domain): support shep-home spec path when commit-specs is false"
```

---

## Task 8: DI Container Registration

**Files:**
- Modify: `packages/core/src/infrastructure/di/container.ts`

- [ ] **Step 1: Import and register GitForkService**

Add import:

```typescript
import { GitForkService } from '../services/git/git-fork.service.js';
import type { IGitForkService } from '../../application/ports/output/services/git-fork-service.interface.js';
```

Add registration near other service registrations:

```typescript
container.registerSingleton<IGitForkService>('IGitForkService', GitForkService);
```

- [ ] **Step 2: Wire GitForkService into merge node deps**

Find where `MergeNodeDeps` is constructed (in the graph factory) and add:

```typescript
gitForkService: container.resolve<IGitForkService>('IGitForkService'),
```

- [ ] **Step 3: Run build to verify DI wiring**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/infrastructure/di/container.ts
git commit -m "feat(config): register git fork service in di container"
```

---

## Task 9: PollUpstreamPrUseCase + Tests (TDD)

**Files:**
- Create: `packages/core/src/application/use-cases/features/poll-upstream-pr.use-case.ts`
- Create: `tests/unit/application/use-cases/features/poll-upstream-pr.use-case.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/application/use-cases/features/poll-upstream-pr.use-case.test.ts`:

```typescript
import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PollUpstreamPrUseCase } from '@/application/use-cases/features/poll-upstream-pr.use-case';
import { SdlcLifecycle, PrStatus } from '@/domain/generated/output';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface';
import type { IGitForkService } from '@/application/ports/output/services/git-fork-service.interface';

describe('PollUpstreamPrUseCase', () => {
  let mockFeatureRepo: Pick<IFeatureRepository, 'findById' | 'update'>;
  let mockForkService: Pick<IGitForkService, 'getUpstreamPrStatus'>;
  let useCase: PollUpstreamPrUseCase;

  const baseFeature = {
    id: 'feat-1',
    lifecycle: SdlcLifecycle.AwaitingUpstream,
    pr: {
      url: 'https://github.com/fork/repo/pull/1',
      number: 1,
      status: PrStatus.Open,
      upstreamPrUrl: 'https://github.com/upstream/repo/pull/42',
      upstreamPrNumber: 42,
      upstreamPrStatus: PrStatus.Open,
    },
  };

  beforeEach(() => {
    mockFeatureRepo = {
      findById: vi.fn().mockResolvedValue(baseFeature),
      update: vi.fn().mockResolvedValue(undefined),
    };
    mockForkService = {
      getUpstreamPrStatus: vi.fn(),
    };
    useCase = new PollUpstreamPrUseCase(
      mockFeatureRepo as any,
      mockForkService as any
    );
  });

  it('should transition to Maintain when upstream PR is merged', async () => {
    vi.mocked(mockForkService.getUpstreamPrStatus).mockResolvedValueOnce({
      state: 'merged',
      url: 'https://github.com/upstream/repo/pull/42',
      number: 42,
    });

    const result = await useCase.execute({ featureId: 'feat-1' });

    expect(result.status).toBe('merged');
    expect(result.transitioned).toBe(true);
    expect(mockFeatureRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: SdlcLifecycle.Maintain })
    );
  });

  it('should update status when upstream PR is closed', async () => {
    vi.mocked(mockForkService.getUpstreamPrStatus).mockResolvedValueOnce({
      state: 'closed',
      url: 'https://github.com/upstream/repo/pull/42',
      number: 42,
    });

    const result = await useCase.execute({ featureId: 'feat-1' });

    expect(result.status).toBe('closed');
    expect(result.transitioned).toBe(false);
  });

  it('should no-op when upstream PR is still open', async () => {
    vi.mocked(mockForkService.getUpstreamPrStatus).mockResolvedValueOnce({
      state: 'open',
      url: 'https://github.com/upstream/repo/pull/42',
      number: 42,
    });

    const result = await useCase.execute({ featureId: 'feat-1' });

    expect(result.status).toBe('open');
    expect(result.transitioned).toBe(false);
    expect(mockFeatureRepo.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests (RED)**

Run: `pnpm test:unit -- tests/unit/application/use-cases/features/poll-upstream-pr.use-case.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement PollUpstreamPrUseCase (GREEN)**

Create `packages/core/src/application/use-cases/features/poll-upstream-pr.use-case.ts`:

```typescript
/**
 * Poll Upstream PR Use Case
 *
 * Checks the status of a PR on the upstream repository and
 * transitions the feature to Maintain when merged.
 */

import { injectable, inject } from 'tsyringe';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IGitForkService } from '../../ports/output/services/git-fork-service.interface.js';
import { SdlcLifecycle, PrStatus } from '../../../domain/generated/output.js';

export interface PollUpstreamPrInput {
  featureId: string;
}

export interface PollUpstreamPrOutput {
  status: 'open' | 'merged' | 'closed';
  transitioned: boolean;
}

@injectable()
export class PollUpstreamPrUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepo: Pick<IFeatureRepository, 'findById' | 'update'>,
    @inject('IGitForkService')
    private readonly forkService: Pick<IGitForkService, 'getUpstreamPrStatus'>
  ) {}

  async execute(input: PollUpstreamPrInput): Promise<PollUpstreamPrOutput> {
    const feature = await this.featureRepo.findById(input.featureId);
    if (!feature || feature.lifecycle !== SdlcLifecycle.AwaitingUpstream) {
      return { status: 'open', transitioned: false };
    }

    const pr = feature.pr;
    if (!pr?.upstreamPrUrl || !pr?.upstreamPrNumber) {
      return { status: 'open', transitioned: false };
    }

    // Extract owner/repo from upstream PR URL
    const match = pr.upstreamPrUrl.match(/github\.com\/([^/]+\/[^/]+)\/pull/);
    if (!match) {
      return { status: 'open', transitioned: false };
    }
    const upstreamRepo = match[1];

    const upstreamStatus = await this.forkService.getUpstreamPrStatus(
      upstreamRepo, pr.upstreamPrNumber
    );

    if (upstreamStatus.state === 'merged') {
      await this.featureRepo.update({
        ...feature,
        lifecycle: SdlcLifecycle.Maintain,
        pr: {
          ...pr,
          upstreamPrStatus: PrStatus.Merged,
        },
        updatedAt: new Date(),
      });
      return { status: 'merged', transitioned: true };
    }

    if (upstreamStatus.state === 'closed') {
      await this.featureRepo.update({
        ...feature,
        pr: {
          ...pr,
          upstreamPrStatus: PrStatus.Closed,
        },
        updatedAt: new Date(),
      });
      return { status: 'closed', transitioned: false };
    }

    return { status: 'open', transitioned: false };
  }
}
```

- [ ] **Step 4: Run tests (GREEN)**

Run: `pnpm test:unit -- tests/unit/application/use-cases/features/poll-upstream-pr.use-case.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/application/use-cases/features/poll-upstream-pr.use-case.ts tests/unit/application/use-cases/features/poll-upstream-pr.use-case.test.ts
git commit -m "feat(domain): add poll upstream pr use case with tests"
```

---

## Task 9b: Enforce `commitSpecs` Immutability (TDD)

**Files:**
- Modify: the feature update use case or feature repository update path
- Add: test for immutability constraint

- [ ] **Step 1: Write failing test (RED)**

Add a test that verifies `commitSpecs` cannot be changed after feature creation:

```typescript
it('should reject changes to commitSpecs after creation', async () => {
  const feature = await createFeatureWithCommitSpecs(true);

  await expect(
    updateFeature({ ...feature, commitSpecs: false })
  ).rejects.toThrow(/commitSpecs cannot be changed/);
});
```

- [ ] **Step 2: Run test (RED)**

Run the test, verify it fails because there's no guard yet.

- [ ] **Step 3: Implement immutability guard (GREEN)**

In the feature update path (either the update use case or the repository's `update` method), add a check:

```typescript
// Enforce commitSpecs immutability
const existing = await this.featureRepo.findById(feature.id);
if (existing && existing.commitSpecs !== feature.commitSpecs) {
  throw new Error('commitSpecs cannot be changed after feature creation');
}
```

- [ ] **Step 4: Run test (GREEN)**

Expected: Test passes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(domain): enforce commit-specs immutability after creation"
```

---

## Task 10: Extend PrSyncWatcherService

**Files:**
- Modify: `packages/core/src/infrastructure/services/pr-sync/pr-sync-watcher.service.ts`

- [ ] **Step 1: Add AwaitingUpstream to the poll query**

Find where the watcher queries features by lifecycle. Extend the query to also include `SdlcLifecycle.AwaitingUpstream`.

- [ ] **Step 2: Add fork-aware polling logic**

In the poll processing loop, add a branch: when a feature is in `AwaitingUpstream` lifecycle, call `PollUpstreamPrUseCase.execute()` instead of the normal PR status check.

- [ ] **Step 3: Run existing watcher tests**

Run: `pnpm test:unit -- --grep "pr-sync"`
Expected: Existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/infrastructure/services/pr-sync/pr-sync-watcher.service.ts
git commit -m "feat(agents): extend pr-sync-watcher to poll awaiting-upstream features"
```

---

## Task 11: Web UI — Lifecycle Config for AwaitingUpstream

**Files:**
- Modify: `src/presentation/web/components/common/feature-node/feature-node-state-config.ts`
- Modify: `src/presentation/web/components/common/feature-node/derive-feature-state.ts`

- [ ] **Step 1: Add `awaitingUpstream` to `FeatureLifecyclePhase` type**

In `feature-node-state-config.ts`, add `'awaitingUpstream'` to the `FeatureLifecyclePhase` union type.

- [ ] **Step 2: Add display label, border color, accent color, running verb**

```typescript
// In lifecycleDisplayLabels:
awaitingUpstream: 'AWAITING UPSTREAM',

// In lifecycleBorderColors:
awaitingUpstream: 'border-l-purple-500',

// In lifecycleAccentColors:
awaitingUpstream: 'bg-purple-500',

// In lifecycleRunningVerbs:
awaitingUpstream: 'Awaiting upstream',
```

- [ ] **Step 3: Add phase badge config**

```typescript
awaitingUpstream: {
  letter: 'U',
  bg: 'bg-purple-100 dark:bg-purple-900/40',
  text: 'text-purple-600 dark:text-purple-300',
  dot: 'bg-purple-500',
  tooltip: 'Awaiting Upstream',
  description: 'PR submitted to upstream — waiting for the maintainers to merge your contribution.',
},
```

- [ ] **Step 4: Update derive-feature-state.ts mappings**

In `sdlcLifecycleMap`:
```typescript
AwaitingUpstream: 'awaitingUpstream',
```

In `phaseNameToLifecycle`:
```typescript
awaitingUpstream: 'awaitingUpstream',
```

In `deriveNodeState`, add before the `Maintain` check:
```typescript
if (feature.lifecycle === SdlcLifecycle.AwaitingUpstream) {
  return 'done'; // Show as completed (PR is out, nothing more to do locally)
}
```

In `deriveProgress`, add:
```typescript
if (feature.lifecycle === SdlcLifecycle.AwaitingUpstream) {
  return 100;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/presentation/web/components/common/feature-node/feature-node-state-config.ts src/presentation/web/components/common/feature-node/derive-feature-state.ts
git commit -m "feat(web): add awaiting-upstream lifecycle visual config"
```

---

## Task 12: Web UI — Feature Create Drawer Toggles

**Files:**
- Modify: `src/presentation/web/components/common/feature-create-drawer/feature-create-drawer.tsx`
- Modify: `src/presentation/web/app/actions/create-feature.ts`

- [ ] **Step 1: Add state for new toggles**

In the feature create drawer component, add state:

```typescript
const [forkAndPr, setForkAndPr] = useState(false);
const [commitSpecs, setCommitSpecs] = useState(true);
```

- [ ] **Step 2: Add toggle dependency logic**

When `forkAndPr` is toggled on, auto-set `commitSpecs=false`, `push=true`, `openPr=true`:

```typescript
// In the forkAndPr onCheckedChange handler:
onCheckedChange={(v) => {
  setForkAndPr(v);
  if (v) {
    setCommitSpecs(false);
    setPush(true);
    setOpenPr(true);
  }
}}
```

- [ ] **Step 3: Render toggles in GIT section**

After the existing Watch toggle, add Fork & PR toggle. Add a separate row for the Commit Specs toggle:

```jsx
{/* Fork & PR toggle */}
<Switch
  id="fork-and-pr"
  checked={forkAndPr}
  onCheckedChange={(v) => {
    setForkAndPr(v);
    if (v) {
      setCommitSpecs(false);
      setPush(true);
      setOpenPr(true);
    }
  }}
/>
<Label htmlFor="fork-and-pr">Fork</Label>
<Tooltip><TooltipContent>Fork repo and create PR to upstream.</TooltipContent></Tooltip>
```

For push/openPr toggles, disable them when `forkAndPr` is true:

```jsx
<Switch id="push" checked={push || openPr || forkAndPr} disabled={forkAndPr} ... />
<Switch id="open-pr" checked={openPr || forkAndPr} disabled={forkAndPr} ... />
```

Add a "Commit Specs" toggle in a new SPECS row:

```jsx
<div className="border-input flex items-center gap-4 rounded-md border px-3 py-2.5">
  <span className="text-muted-foreground w-16 shrink-0 text-xs font-semibold">SPECS</span>
  <div className="flex flex-1 items-center gap-4">
    <Switch
      id="commit-specs"
      checked={commitSpecs}
      onCheckedChange={setCommitSpecs}
    />
    <Label htmlFor="commit-specs">Commit</Label>
    <Tooltip><TooltipContent>Commit specs and artifacts to the repository.</TooltipContent></Tooltip>
  </div>
</div>
```

- [ ] **Step 4: Pass flags to payload**

In the submit handler, include the new flags:

```typescript
forkAndPr,
commitSpecs,
```

- [ ] **Step 5: Update create-feature server action**

In `src/presentation/web/app/actions/create-feature.ts`, add `forkAndPr` and `commitSpecs` to the `CreateFeatureInput` interface and pass them through to the use case.

- [ ] **Step 6: Run dev server and verify**

Run: `pnpm dev:web`
Verify: New toggles appear in the feature creation drawer, dependencies work correctly.

- [ ] **Step 7: Commit**

```bash
git add src/presentation/web/components/common/feature-create-drawer/feature-create-drawer.tsx src/presentation/web/app/actions/create-feature.ts
git commit -m "feat(web): add fork-and-pr and commit-specs toggles to feature creation"
```

---

## Task 13: Storybook Stories

**Files:**
- Modify: `src/presentation/web/components/common/feature-create-drawer/feature-create-drawer.stories.tsx`
- Modify: `src/presentation/web/components/common/feature-node/feature-node.stories.tsx`

- [ ] **Step 1: Add create drawer stories for new toggles**

In `feature-create-drawer.stories.tsx`, add stories that use Storybook `play` functions to toggle the new switches (since the component manages state internally via `useState`, not via props):

```typescript
export const ForkAndPrEnabled: Story = {
  args: { ...baseProps },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Click the Fork toggle to enable it
    const forkToggle = canvas.getByLabelText('Fork');
    await userEvent.click(forkToggle);
  },
};

export const CommitSpecsDisabled: Story = {
  args: { ...baseProps },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The Commit Specs toggle defaults to on — click to disable
    const commitToggle = canvas.getByLabelText('Commit');
    await userEvent.click(commitToggle);
  },
};
```

Note: Import `within` from `@storybook/test` and `userEvent` from `@storybook/test` at the top of the stories file if not already imported.

- [ ] **Step 2: Add feature node story for AwaitingUpstream**

In `feature-node.stories.tsx`, add an `AwaitingUpstream` variant to the `AllLifecycles` story or as a standalone:

```typescript
export const AwaitingUpstream: Story = {
  args: {
    data: {
      ...baseData,
      lifecycle: 'awaitingUpstream',
      state: 'done',
      progress: 100,
      name: 'Fix login bug',
      pr: {
        url: 'https://github.com/upstream/repo/pull/42',
        number: 42,
        status: 'Open',
        upstreamPrUrl: 'https://github.com/upstream/repo/pull/42',
      },
    },
  },
};
```

- [ ] **Step 3: Run Storybook build**

Run: `pnpm storybook:build` (or the project's storybook build command)
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/web/components/common/feature-create-drawer/feature-create-drawer.stories.tsx src/presentation/web/components/common/feature-node/feature-node.stories.tsx
git commit -m "feat(web): add storybook stories for fork-and-pr features"
```

---

## Task 14: Build + Lint + Full Test Suite

- [ ] **Step 1: Run lint**

Run: `pnpm lint:fix`
Expected: No errors.

- [ ] **Step 2: Run full validation**

Run: `pnpm validate`
Expected: All checks pass (lint, format, typecheck, tsp).

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 4: Fix any failures**

If any tests fail, investigate and fix. Do not proceed until green.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(domain): resolve lint and test issues for fork-and-pr feature"
```
