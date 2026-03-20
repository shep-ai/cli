# Git Rebase Sync — Design Spec

## Overview

Add branch sync status visibility and one-click agentic rebase to the feature drawer's Overview tab. Users can immediately see if a feature branch is behind main, trigger a rebase with automatic conflict resolution, and track the rebase as a phase in the Activity timeline.

## Requirements

1. **Sync status detection**: Show how many commits a feature branch is ahead/behind main
2. **Visible in Overview tab**: A prominent section near the top of the drawer, always visible
3. **One-click rebase**: Trigger rebase from the sync status section with agent-powered conflict resolution
4. **Activity timeline integration**: Rebase appears as a `rebase` phase in the Activity tab with live progress
5. **Non-blocking**: Rebase runs in the background; user can navigate freely
6. **Smart caching**: Sync status is cached client-side with 30s TTL to avoid excessive requests

## Approach

**Approach B (selected)**: New top-level `BranchSyncStatus` section in the Overview tab. The rebase button moves from the existing `FeatureGitOperations` section into this new section.

### Alternatives considered

- **A: Enhance existing `FeatureGitOperations`** — Too buried at the bottom of the tab, not prominent enough
- **C: Standalone `BranchHealthCard` component** — Over-engineered for current needs (YAGNI)

## Design

### 1. Backend — `getBranchSyncStatus`

**New method on `IGitPrService`**:

```typescript
getBranchSyncStatus(
  cwd: string,
  featureBranch: string,
  baseBranch: string
): Promise<{ ahead: number; behind: number }>
```

Implementation:
- `git rev-list --count origin/<baseBranch>..<featureBranch>` → ahead
- `git rev-list --count <featureBranch>..origin/<baseBranch>` → behind

**New use case**: `GetBranchSyncStatusUseCase`

```
Input:  featureId: string
Output: { ahead: number, behind: number, baseBranch: string }
```

Flow: resolve feature → determine cwd (worktree or repo root) → fetch remote tracking ref via `syncMain()` → run `getBranchSyncStatus()`.

**New server action**: `get-branch-sync-status.ts`

```typescript
export async function getBranchSyncStatus(
  featureId: string
): Promise<{
  success: boolean;
  data?: { ahead: number; behind: number; baseBranch: string; checkedAt: string };
  error?: string;
}>
```

### 2. Activity tab — `rebase` phase timing

**`agentRunId` strategy**: The rebase use case runs outside the agent worker context and has no `agentRunId`. To record the rebase in the activity timeline, we create a **standalone agent run** for the feature before recording the timing:

1. Create a new `AgentRun` record with the feature's ID and a descriptive label (e.g., `rebase`)
2. Record the `PhaseTiming` entry under that `agentRunId` with `phase: 'rebase'`, `startedAt: now`
3. Complete the timing with `completedAt`, `exitCode: 'success' | 'error'` when done
4. On conflict resolution via agent, the timing stays open until the agent finishes resolving

This approach works because `findByFeatureId` joins through `agent_runs` — the standalone run links the timing to the feature. The existing `IAgentRunRepository` and `IPhaseTimingRepository` are reused with no schema changes.

Activity tab changes:
- Add `rebase: 'Rebasing'` to the `NODE_TO_PHASE` map in `activity-tab.tsx`
- The existing SSE pipeline picks up the new timing automatically via the `agentRunId` → feature join

### 3. Overview tab UI — `BranchSyncStatus` section

**Placement**: Immediately after `FeatureDetails` and before `FeatureSettings`, replacing the current `FeatureGitOperations` section. This puts it in the same visual area where git operations already live, but with enhanced sync status information.

The current `overview-tab.tsx` render order is:
1. Status/Progress (lines 51-96)
2. `FeatureInfo` — includes branch name display (line 97)
3. PR Info (lines 98-105)
4. `FeatureDetails` (line 106)
5. ~~`FeatureGitOperations`~~ → **`BranchSyncStatus`** (replaces, lines 107-113)
6. `FeatureSettings` (line 114)

Rendered only when the feature has a branch. When no branch exists, the section is not shown and the hook is not called.

**`useBranchSyncStatus` hook**:
- Auto-fetches on mount if cache is stale (>30s TTL)
- Exposes `refresh()` for manual re-check
- Returns `{ data, loading, error, refresh }`
- Auto-refreshes after successful rebase
- **Cache location**: Module-level `Map<featureId, { data, timestamp }>` outside the hook, so cache survives drawer close/reopen and component remounts within the same browser session

**Visual states**:

| State | Icon | Text | Actions |
|-------|------|------|---------|
| Loading (first fetch) | Spinner | "Checking..." | — |
| Up to date (behind=0) | Green check | "Up to date with `main`" | Refresh button |
| Behind (behind>0) | Orange warning | "N commits behind `main`" | Refresh + Rebase buttons |
| Ahead info (ahead>0) | — | "· N ahead" (secondary) | — |
| Rebasing | Spinner | "Rebasing on main..." | Disabled buttons |
| Rebase success | Green check | "Rebased successfully" | Auto-refreshes status |
| Rebase error | Red error | Error message | Retry button |
| Fetch error | Red error | "Failed to check sync status" | Retry button |

**Props changes**:

`OverviewTabProps`:
- Add `syncStatus`, `syncLoading`, `syncError`, `onRefreshSync`
- Keep existing `onRebaseOnMain`, `rebaseLoading`, `rebaseError` (now used by `BranchSyncStatus` instead of `FeatureGitOperations`)
- Remove `FeatureGitOperations` section entirely

`FeatureDrawerTabsProps`:
- Add `syncStatus`, `syncLoading`, `syncError`, `onRefreshSync` — threaded through to `OverviewTab`
- Existing `onRebaseOnMain`, `rebaseLoading`, `rebaseError` remain unchanged

### 4. Non-blocking rebase with reactive updates

1. User clicks "Rebase" → Overview shows "Rebasing on main..." immediately
2. `rebaseFeature` server action fires in background (existing action)
3. Activity tab gets live `rebase` phase timing via existing SSE pipeline
4. On completion: server action promise resolves → Overview updates → auto-refreshes sync status
5. On error: error displayed in Overview, phase timing shows `exitCode: 'error'`
6. User can navigate freely during rebase; returning to Overview re-fetches status (respecting TTL)

### 5. Testing strategy

**Unit tests**:
- `getBranchSyncStatus` on `IGitPrService` — mock git commands, verify ahead/behind parsing, handle errors
- `GetBranchSyncStatusUseCase` — mock service, verify flow (resolve feature → cwd → sync → status)
- `useBranchSyncStatus` hook — TTL caching (module-level cache), loading states, error handling, auto-refresh after rebase
- `BranchSyncStatus` component — all visual states, button interactions
- Activity tab with `phase: 'rebase'` — verify timeline entry renders with "Rebasing" label

**Integration tests**:
- `GetBranchSyncStatusUseCase` with real git repo — verify ahead/behind counts match actual divergence
- `RebaseFeatureOnMainUseCase` with phase timing — verify standalone agent run + timing recorded correctly

**Storybook stories**:
- `BranchSyncStatus` component: up-to-date, behind, rebasing, error states
- Updated Overview tab stories including sync status section

## Files to create/modify

### New files
- `packages/core/src/application/use-cases/features/get-branch-sync-status.use-case.ts`
- `src/presentation/web/app/actions/get-branch-sync-status.ts`
- `src/presentation/web/hooks/use-branch-sync-status.ts`
- `src/presentation/web/components/common/feature-drawer-tabs/branch-sync-status.tsx`
- `src/presentation/web/components/common/feature-drawer-tabs/branch-sync-status.stories.tsx`
- `.storybook/mocks/app/actions/get-branch-sync-status.ts`
- `tests/unit/presentation/web/components/common/feature-drawer-tabs/branch-sync-status.test.tsx`
- `tests/unit/presentation/web/hooks/use-branch-sync-status.test.ts`
- `tests/unit/core/application/use-cases/features/get-branch-sync-status.use-case.test.ts`
- `tests/unit/core/infrastructure/services/git/get-branch-sync-status.test.ts`

### Modified files
- `packages/core/src/application/ports/output/services/git-pr-service.interface.ts` — add `getBranchSyncStatus` method
- `packages/core/src/infrastructure/services/git/git-pr.service.ts` — implement `getBranchSyncStatus`
- `packages/core/src/application/use-cases/features/rebase-feature-on-main.use-case.ts` — add standalone agent run + phase timing recording
- `packages/core/src/infrastructure/di/container.ts` — register new use case
- `src/presentation/web/components/common/feature-drawer-tabs/overview-tab.tsx` — replace `FeatureGitOperations` with `BranchSyncStatus`, update props
- `src/presentation/web/components/common/feature-drawer-tabs/overview-tab.stories.tsx` — update stories (remove git operations stories, add sync status)
- `src/presentation/web/components/common/feature-drawer-tabs/feature-drawer-tabs.tsx` — thread new sync props through to OverviewTab
- `src/presentation/web/components/common/feature-drawer-client.tsx` — call `useBranchSyncStatus` hook and wire props to drawer tabs
- `tests/unit/presentation/web/components/common/feature-drawer-tabs/overview-tab.test.tsx` — update tests (remove git operations assertions, add sync status)
- `src/presentation/web/components/common/feature-drawer-tabs/activity-tab.tsx` — add `rebase` to `NODE_TO_PHASE`
