'use client';

import { useCallback } from 'react';
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
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ActionButton } from '@/components/common/action-button';
import type { RepositoryNodeData } from './repository-node-config';
import { useRepositoryActions } from './use-repository-actions';

export interface RepositoryDrawerProps {
  data: RepositoryNodeData | null;
  onClose: () => void;
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

export function RepositoryDrawer({ data, onClose }: RepositoryDrawerProps) {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const actions = useRepositoryActions(
    data?.repositoryPath ? { repositoryPath: data.repositoryPath } : null
  );

  const hasGitInfo = !!(data?.branch ?? data?.commitMessage);

  return (
    <BaseDrawer
      open={data !== null}
      onClose={handleClose}
      size="md"
      modal={false}
      data-testid="repository-drawer"
      deployTarget={
        data?.repositoryPath
          ? {
              targetId: data.repositoryPath,
              targetType: 'repository',
              repositoryPath: data.repositoryPath,
            }
          : undefined
      }
      header={
        data ? (
          <div data-testid="repository-drawer-header">
            <DrawerTitle>{data.name}</DrawerTitle>
            {data.repositoryPath ? (
              <DrawerDescription className="truncate font-mono text-xs">
                {data.repositoryPath}
              </DrawerDescription>
            ) : null}
          </div>
        ) : undefined
      }
    >
      {data ? (
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
                              <span data-testid="repository-drawer-committer">
                                {data.committer}
                              </span>
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
                    onClick={actions.openInIde}
                    loading={actions.ideLoading}
                    error={!!actions.ideError}
                    icon={Code2}
                    variant="outline"
                    size="sm"
                  />
                  <ActionButton
                    label="Open in Shell"
                    onClick={actions.openInShell}
                    loading={actions.shellLoading}
                    error={!!actions.shellError}
                    icon={Terminal}
                    variant="outline"
                    size="sm"
                  />
                  <ActionButton
                    label="Open Folder"
                    onClick={actions.openFolder}
                    loading={actions.folderLoading}
                    error={!!actions.folderError}
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
                <div className="text-muted-foreground text-xs font-semibold tracking-wider">
                  INFO
                </div>
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
      ) : null}
    </BaseDrawer>
  );
}
