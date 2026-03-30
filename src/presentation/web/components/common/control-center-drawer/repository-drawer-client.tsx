'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Code2,
  Terminal,
  FolderOpen,
  RefreshCw,
  Play,
  Square,
  Copy,
  Check,
  Loader2,
  LayoutDashboard,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BaseDrawer } from '@/components/common/base-drawer';
import { DeploymentStatusBadge } from '@/components/common/deployment-status-badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useRepositoryActions } from '@/components/common/repository-node/use-repository-actions';
import { useDeployAction } from '@/hooks/use-deploy-action';
import { useFeatureFlags } from '@/hooks/feature-flags-context';
import type { RepositoryNodeData } from '@/components/common/repository-node';
import { ChatTab } from '@/components/features/chat/ChatTab';

const COPY_FEEDBACK_DELAY = 2000;

const tbBtn =
  'text-muted-foreground hover:bg-foreground/8 hover:text-foreground inline-flex size-8 items-center justify-center rounded-[3px] disabled:opacity-40';
const tbSep = 'bg-border/60 mx-1.5 h-5 w-px shrink-0';

export interface RepositoryDrawerClientProps {
  data: RepositoryNodeData;
  /** Initial tab key from URL (e.g. 'chat'). */
  initialTab?: 'overview' | 'chat';
}

export function RepositoryDrawerClient({ data, initialTab }: RepositoryDrawerClientProps) {
  const featureFlags = useFeatureFlags();
  const router = useRouter();
  const pathname = usePathname();
  const isOpen = pathname.startsWith('/repository/');
  const [activeTab, setActiveTab] = useState<string>(initialTab ?? 'overview');
  const [pathCopied, setPathCopied] = useState(false);
  const repoActions = useRepositoryActions(
    data.repositoryPath ? { repositoryId: data.id, repositoryPath: data.repositoryPath } : null
  );

  const onClose = useCallback(() => {
    router.push('/');
  }, [router]);

  const deployAction = useDeployAction(
    data.repositoryPath
      ? {
          targetId: data.repositoryPath,
          targetType: 'repository' as const,
          repositoryPath: data.repositoryPath,
        }
      : null
  );
  const isDeployActive = deployAction.status === 'Booting' || deployAction.status === 'Ready';

  const handleCopyPath = useCallback(() => {
    if (!data.repositoryPath) return;
    void navigator.clipboard.writeText(data.repositoryPath);
    setPathCopied(true);
    setTimeout(() => setPathCopied(false), COPY_FEEDBACK_DELAY);
  }, [data.repositoryPath]);

  // Session ID for repo chat — deterministic per repo
  const repoSessionId = data.id ? `repo-${data.id}` : `repo-${data.name}`;

  return (
    <BaseDrawer
      open={isOpen}
      onClose={onClose}
      size="lg"
      modal={false}
      data-testid="repository-drawer"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        {/* VS Code-style tab bar */}
        <TabsList className="bg-muted/50 h-auto w-full shrink-0 justify-start gap-0 rounded-none border-b p-0">
          <TabsTrigger
            value="overview"
            className="text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-t-primary [&:not([data-state=active])]:border-r-border relative h-auto rounded-none border-t-2 border-r border-t-transparent border-r-transparent bg-transparent px-3.5 py-2.5 text-[13px] font-normal shadow-none transition-none last:border-r-transparent data-[state=active]:shadow-none"
          >
            <LayoutDashboard className="mr-1.5 size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-t-primary [&:not([data-state=active])]:border-r-border relative h-auto rounded-none border-t-2 border-r border-t-transparent border-r-transparent bg-transparent px-3.5 py-2.5 text-[13px] font-normal shadow-none transition-none last:border-r-transparent data-[state=active]:shadow-none"
          >
            <MessageSquare className="mr-1.5 size-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        {/* Persistent header — contrasting background */}
        <div className="bg-muted/40 shrink-0 border-b">
          {/* Repo title + path breadcrumb */}
          <div
            className="flex items-center gap-2 px-4 pe-10 pt-2.5 pb-2"
            data-testid="repository-drawer-header"
          >
            <h2 className="text-foreground min-w-0 truncate text-base font-semibold tracking-tight">
              {data.name}
            </h2>
            {data.repositoryPath ? (
              <>
                <span className="text-muted-foreground/40 text-xs">/</span>
                <span className="text-muted-foreground min-w-0 truncate font-mono text-[11px]">
                  {data.repositoryPath}
                </span>
              </>
            ) : null}
          </div>

          {/* IDE toolbar */}
          {data.repositoryPath ? (
            <div data-testid="repository-drawer-toolbar">
              <div className="flex h-9 items-center px-1.5">
                {/* Left: Open actions */}
                <TooltipProvider delayDuration={300}>
                  <div className="flex items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={tbBtn}
                          onClick={repoActions.openInIde}
                          disabled={repoActions.ideLoading}
                          aria-label="Open in IDE"
                        >
                          {repoActions.ideLoading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Code2 className="size-4" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        Open in IDE
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={tbBtn}
                          onClick={repoActions.openInShell}
                          disabled={repoActions.shellLoading}
                          aria-label="Open terminal"
                        >
                          {repoActions.shellLoading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Terminal className="size-4" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        Open terminal
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={tbBtn}
                          onClick={repoActions.openFolder}
                          disabled={repoActions.folderLoading}
                          aria-label="Open folder"
                        >
                          {repoActions.folderLoading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <FolderOpen className="size-4" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        Open folder
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={tbBtn}
                          onClick={handleCopyPath}
                          aria-label="Copy path"
                        >
                          {pathCopied ? (
                            <Check className="size-3.5 text-green-500" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        {pathCopied ? 'Copied!' : 'Copy path'}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Git sync */}
                  {data.id && featureFlags.gitRebaseSync ? (
                    <>
                      <div className={tbSep} />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={tbBtn}
                            onClick={repoActions.syncMain}
                            disabled={repoActions.syncLoading}
                            aria-label="Sync main"
                          >
                            {repoActions.syncLoading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="size-4" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          Sync main
                        </TooltipContent>
                      </Tooltip>
                    </>
                  ) : null}

                  {/* Deploy */}
                  {featureFlags.envDeploy ? (
                    <>
                      <div className={tbSep} />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            disabled={deployAction.deployLoading || deployAction.stopLoading}
                            onClick={isDeployActive ? deployAction.stop : deployAction.deploy}
                            className={cn(
                              'inline-flex size-7 items-center justify-center rounded-[3px] disabled:opacity-40',
                              isDeployActive
                                ? 'text-red-500 hover:bg-red-500/10 hover:text-red-400'
                                : 'text-green-500 hover:bg-green-500/10 hover:text-green-400'
                            )}
                            aria-label={isDeployActive ? 'Stop dev server' : 'Start dev server'}
                          >
                            {deployAction.deployLoading || deployAction.stopLoading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : isDeployActive ? (
                              <Square className="size-4" />
                            ) : (
                              <Play className="size-4" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {isDeployActive ? 'Stop dev server' : 'Start dev server'}
                        </TooltipContent>
                      </Tooltip>
                      {isDeployActive ? (
                        <DeploymentStatusBadge
                          status={deployAction.status}
                          url={deployAction.url}
                          targetId={data.repositoryPath}
                        />
                      ) : null}
                    </>
                  ) : null}
                </TooltipProvider>

                <div className="flex-1" />
              </div>
            </div>
          ) : null}
        </div>

        {/* Overview tab */}
        <TabsContent value="overview" className="mt-0 flex-1 overflow-y-auto">
          {data.repositoryPath ? (
            <div className="flex-1 overflow-y-auto">
              {repoActions.syncError ? (
                <div className="px-4 pt-3">
                  <p className="text-destructive text-xs">{repoActions.syncError}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </TabsContent>

        {/* Chat tab */}
        <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <ChatTab featureId={repoSessionId} worktreePath={data.repositoryPath} />
        </TabsContent>
      </Tabs>
    </BaseDrawer>
  );
}
