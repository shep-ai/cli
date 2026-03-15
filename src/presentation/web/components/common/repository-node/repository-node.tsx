'use client';

import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Github, Plus, Code2, Terminal, FolderOpen, Trash2, Play, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionButton } from '@/components/common/action-button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DeploymentStatusBadge } from '@/components/common/deployment-status-badge';
import { useDeployAction } from '@/hooks/use-deploy-action';
import { useFeatureFlags } from '@/hooks/feature-flags-context';
import type { RepositoryNodeData } from './repository-node-config';
import { useRepositoryActions } from './use-repository-actions';
import { FeatureSessionsDropdown } from '@/components/common/feature-node/feature-sessions-dropdown';

export function RepositoryNode({ data }: { data: RepositoryNodeData; [key: string]: unknown }) {
  const featureFlags = useFeatureFlags();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const actions = useRepositoryActions(
    data.repositoryPath ? { repositoryPath: data.repositoryPath } : null
  );
  const deployAction = useDeployAction(
    data.repositoryPath
      ? {
          targetId: data.repositoryPath,
          targetType: 'repository',
          repositoryPath: data.repositoryPath,
        }
      : null
  );
  const isDeploymentActive = deployAction.status === 'Booting' || deployAction.status === 'Ready';

  return (
    <div className={cn('group relative', data.onDelete && data.id && 'pl-10')}>
      {data.showHandles ? (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          className="opacity-0!"
        />
      ) : null}

      {/* Delete button — visible on hover, positioned to the left */}
      {data.onDelete && data.id ? (
        <>
          <div className="absolute top-1/2 left-0 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Remove repository"
                    data-testid="repository-node-delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmOpen(true);
                    }}
                    className="bg-card text-muted-foreground hover:border-destructive hover:text-destructive flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border shadow-sm transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Remove repository</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="max-w-xs">
              <DialogHeader>
                <DialogTitle>Remove repository?</DialogTitle>
                <DialogDescription>
                  This will remove <strong>{data.name}</strong> and all its features from your
                  workspace. The repository files on disk won&apos;t be affected.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="grid grid-cols-2 gap-2 sm:flex-none">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setConfirmOpen(false);
                    data.onDelete?.(data.id!);
                  }}
                >
                  Remove
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}

      <div
        role="button"
        tabIndex={0}
        data-testid="repository-node-card"
        data-repo-name={data.name}
        onClick={(e) => {
          e.stopPropagation();
          data.onClick?.();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            data.onClick?.();
          }
        }}
        className="nodrag bg-card flex min-w-[18rem] cursor-pointer items-center gap-3 rounded-full border px-4 py-3 shadow-sm"
      >
        <Github className="text-muted-foreground h-5 w-5 shrink-0" />
        <span data-testid="repository-node-name" className="min-w-0 truncate text-sm font-medium">
          {data.name}
        </span>

        <div
          className={cn(
            'flex shrink-0 items-center gap-2',
            (data.repositoryPath ?? data.onAdd) && 'ml-auto'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {data.repositoryPath ? (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center">
                      <ActionButton
                        label="Open in IDE"
                        onClick={actions.openInIde}
                        loading={actions.ideLoading}
                        error={!!actions.ideError}
                        icon={Code2}
                        iconOnly
                        variant="ghost"
                        size="icon-xs"
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Open in IDE</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center">
                      <ActionButton
                        label="Open in Shell"
                        onClick={actions.openInShell}
                        loading={actions.shellLoading}
                        error={!!actions.shellError}
                        icon={Terminal}
                        iconOnly
                        variant="ghost"
                        size="icon-xs"
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Open in Shell</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center">
                      <ActionButton
                        label="Open Folder"
                        onClick={actions.openFolder}
                        loading={actions.folderLoading}
                        error={!!actions.folderError}
                        icon={FolderOpen}
                        iconOnly
                        variant="ghost"
                        size="icon-xs"
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Open Folder</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <FeatureSessionsDropdown repositoryPath={data.repositoryPath} />
              {featureFlags.envDeploy ? (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center">
                          <ActionButton
                            label={isDeploymentActive ? 'Stop Dev Server' : 'Start Dev Server'}
                            onClick={isDeploymentActive ? deployAction.stop : deployAction.deploy}
                            loading={deployAction.deployLoading || deployAction.stopLoading}
                            error={!!deployAction.deployError}
                            icon={isDeploymentActive ? Square : Play}
                            iconOnly
                            variant="ghost"
                            size="icon-xs"
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isDeploymentActive ? 'Stop Dev Server' : 'Start Dev Server'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {isDeploymentActive ? (
                    <DeploymentStatusBadge
                      status={deployAction.status}
                      url={deployAction.url}
                      targetId={data.repositoryPath}
                    />
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          {data.onAdd ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Add feature"
                    data-testid="repository-node-add-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onAdd?.();
                    }}
                    className={cn(
                      'text-muted-foreground hover:bg-accent dark:hover:bg-accent/50 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:text-blue-500',
                      data.pulseAdd &&
                        'animate-pulse-cta bg-blue-100 text-blue-500 dark:bg-blue-900/40'
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Add feature</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </div>

      {/* Source handle — invisible, for edge connections */}
      {data.onAdd || data.showHandles ? (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={!data.showHandles}
          className="opacity-0!"
        />
      ) : null}
    </div>
  );
}
