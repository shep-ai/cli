'use client';

import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, GitMerge, RefreshCw } from 'lucide-react';
import { CometSpinner } from '@/components/ui/comet-spinner';
import { ActionButton } from '@/components/common/action-button';
import { Separator } from '@/components/ui/separator';
import type { BranchSyncData } from '@/hooks/use-branch-sync-status';

export interface BranchSyncStatusProps {
  syncStatus: BranchSyncData | null;
  syncLoading: boolean;
  syncError: string | null;
  onRefreshSync: () => void;
  onRebaseOnMain: () => void;
  rebaseLoading: boolean;
  rebaseError: string | null;
}

export function BranchSyncStatus({
  syncStatus,
  syncLoading,
  syncError,
  onRefreshSync,
  onRebaseOnMain,
  rebaseLoading,
  rebaseError,
}: BranchSyncStatusProps) {
  const { t } = useTranslation('web');
  const isRebasing = rebaseLoading;
  const isBehind = syncStatus != null && syncStatus.behind > 0;
  const isUpToDate = syncStatus?.behind === 0;
  const baseBranch = syncStatus?.baseBranch ?? 'main';

  return (
    <>
      <Separator />
      <div data-testid="branch-sync-status" className="flex flex-col gap-3 p-4">
        <div className="text-muted-foreground text-xs font-semibold tracking-wider">
          BRANCH SYNC
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Status indicator */}
            {syncLoading && !syncStatus ? (
              <>
                <CometSpinner size="sm" className="shrink-0" />
                <span className="text-muted-foreground text-sm">Checking...</span>
              </>
            ) : syncError ? (
              <>
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                <span className="text-sm text-red-600">{syncError}</span>
              </>
            ) : isRebasing ? (
              <>
                <CometSpinner size="sm" className="shrink-0" />
                <span className="text-sm">
                  Rebasing on{' '}
                  <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
                    {baseBranch}
                  </code>
                  ...
                </span>
              </>
            ) : isBehind ? (
              <>
                <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
                <span className="text-sm">
                  {syncStatus.behind} commit{syncStatus.behind === 1 ? '' : 's'} behind{' '}
                  <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
                    {baseBranch}
                  </code>
                  {syncStatus.ahead > 0 ? (
                    <span className="text-muted-foreground ms-1">· {syncStatus.ahead} ahead</span>
                  ) : null}
                </span>
              </>
            ) : isUpToDate ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                <span className="text-sm">
                  Up to date with{' '}
                  <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
                    {baseBranch}
                  </code>
                  {syncStatus.ahead > 0 ? (
                    <span className="text-muted-foreground ms-1">· {syncStatus.ahead} ahead</span>
                  ) : null}
                </span>
              </>
            ) : null}
          </div>

          {/* Refresh button — shown when not doing initial load */}
          {(syncStatus || syncError) && !isRebasing ? (
            <button
              data-testid="sync-refresh-button"
              onClick={onRefreshSync}
              disabled={syncLoading}
              className="text-muted-foreground hover:text-foreground inline-flex items-center rounded p-1 transition-colors disabled:opacity-50"
              aria-label={t('branchSyncStatus.refreshSyncStatus')}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
            </button>
          ) : null}
        </div>

        {/* Rebase button — shown when behind */}
        {isBehind && !isRebasing ? (
          <ActionButton
            label={t('branchSyncStatus.rebaseOnMain')}
            onClick={onRebaseOnMain}
            loading={false}
            error={!!rebaseError}
            icon={GitMerge}
            variant="outline"
            size="sm"
          />
        ) : null}

        {rebaseError ? <p className="text-destructive text-xs">{rebaseError}</p> : null}
      </div>
    </>
  );
}
