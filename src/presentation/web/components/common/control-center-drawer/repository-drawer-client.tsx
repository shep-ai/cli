'use client';

import { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Code2,
  Terminal,
  FolderOpen,
  GitBranch,
  GitCommitHorizontal,
  User,
  ArrowDown,
  Clock,
} from 'lucide-react';
import { BaseDrawer } from '@/components/common/base-drawer';
import { ActionButton } from '@/components/common/action-button';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useRepositoryActions } from '@/components/common/repository-node/use-repository-actions';
import { useFeatureFlags } from '@/hooks/feature-flags-context';
import type { RepositoryNodeData } from '@/components/common/repository-node';

export interface RepositoryDrawerClientProps {
  data: RepositoryNodeData;
}

function formatRelativeTime(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

export function RepositoryDrawerClient({ data }: RepositoryDrawerClientProps) {
  const featureFlags = useFeatureFlags();
  const router = useRouter();
  const pathname = usePathname();
  const isOpen = pathname.startsWith('/repository/');
  const repoActions = useRepositoryActions(
    data.repositoryPath ? { repositoryPath: data.repositoryPath } : null
  );

  const onClose = useCallback(() => {
    router.push('/');
  }, [router]);

  const repoDeployTarget = data.repositoryPath
    ? {
        targetId: data.repositoryPath,
        targetType: 'repository' as const,
        repositoryPath: data.repositoryPath,
      }
    : undefined;

  const header = (
    <div data-testid="repository-drawer-header">
      <DrawerTitle>{data.name}</DrawerTitle>
      {data.repositoryPath ? (
        <DrawerDescription className="truncate font-mono text-xs">
          {data.repositoryPath}
        </DrawerDescription>
      ) : null}
    </div>
  );

  const hasGitInfo = !!(data.branch ?? data.commitMessage);

  return (
    <BaseDrawer
      open={isOpen}
      onClose={onClose}
      size="md"
      modal={false}
      header={header}
      deployTarget={featureFlags.envDeploy ? repoDeployTarget : undefined}
      data-testid="repository-drawer"
    >
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Git Status Section */}
        {hasGitInfo ? (
          <>
            <Separator />
            <div className="flex flex-col gap-3 p-4" data-testid="repository-drawer-git-section">
              <div className="text-muted-foreground text-xs font-semibold tracking-wider">
                GIT STATUS
              </div>
              <div className="flex flex-col gap-2">
                {data.branch ? (
                  <div
                    className="flex items-center justify-between gap-2"
                    data-testid="repository-drawer-branch-row"
                  >
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <GitBranch className="h-4 w-4 shrink-0" />
                      <span className="text-foreground font-medium">Branch</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs"
                        data-testid="repository-drawer-branch"
                      >
                        {data.branch}
                      </Badge>
                      {data.behindCount != null && data.behindCount > 0 ? (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-50 text-xs text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                          data-testid="repository-drawer-behind"
                        >
                          <ArrowDown className="mr-1 h-3 w-3" />
                          {data.behindCount} behind
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {data.commitMessage ? (
                  <div
                    className="bg-muted/50 rounded-lg p-3"
                    data-testid="repository-drawer-commit-section"
                  >
                    <div className="flex items-start gap-2">
                      <GitCommitHorizontal className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-foreground text-sm leading-snug font-medium"
                          data-testid="repository-drawer-commit-message"
                        >
                          {data.commitMessage}
                        </p>
                        {data.committer ? (
                          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                            <User className="h-3 w-3 shrink-0" />
                            <span data-testid="repository-drawer-committer">{data.committer}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}

        {/* Open With Section */}
        {data.repositoryPath ? (
          <>
            <Separator />
            <div className="flex flex-col gap-3 p-4">
              <div className="text-muted-foreground text-xs font-semibold tracking-wider">
                OPEN WITH
              </div>
              <div className="flex flex-col gap-2">
                <ActionButton
                  label="Open in IDE"
                  onClick={repoActions.openInIde}
                  loading={repoActions.ideLoading}
                  error={!!repoActions.ideError}
                  icon={Code2}
                  variant="outline"
                  size="sm"
                />
                <ActionButton
                  label="Open in Shell"
                  onClick={repoActions.openInShell}
                  loading={repoActions.shellLoading}
                  error={!!repoActions.shellError}
                  icon={Terminal}
                  variant="outline"
                  size="sm"
                />
                <ActionButton
                  label="Open Folder"
                  onClick={repoActions.openFolder}
                  loading={repoActions.folderLoading}
                  error={!!repoActions.folderError}
                  icon={FolderOpen}
                  variant="outline"
                  size="sm"
                />
              </div>
            </div>
          </>
        ) : null}

        {/* Metadata Section */}
        {data.createdAt ? (
          <>
            <Separator />
            <div className="flex flex-col gap-3 p-4" data-testid="repository-drawer-metadata">
              <div className="text-muted-foreground text-xs font-semibold tracking-wider">INFO</div>
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Added</span>
                </div>
                <span
                  className="text-foreground text-xs"
                  title={new Date(data.createdAt).toLocaleString()}
                  data-testid="repository-drawer-created-at"
                >
                  {formatRelativeTime(data.createdAt)}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </BaseDrawer>
  );
}
