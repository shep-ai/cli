'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Code2, Terminal, FolderOpen, RefreshCw, Play, Square } from 'lucide-react';
import { BaseDrawer } from '@/components/common/base-drawer';
import { ActionButton } from '@/components/common/action-button';
import { DeploymentStatusBadge } from '@/components/common/deployment-status-badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useRepositoryActions } from '@/components/common/repository-node/use-repository-actions';
import { useDeployAction } from '@/hooks/use-deploy-action';
import { useFeatureFlags } from '@/hooks/feature-flags-context';
import type { RepositoryNodeData } from '@/components/common/repository-node';
import { ChatTab } from '@/components/features/chat/ChatTab';
import { CommitHistoryTree } from '@/components/common/commit-history-tree/commit-history-tree';
import { useCommitHistory } from '@/components/common/commit-history-tree/use-commit-history';

export interface RepositoryDrawerClientProps {
  data: RepositoryNodeData;
  /** Initial tab key from URL (e.g. 'chat'). */
  initialTab?: 'overview' | 'chat' | 'commits';
}

export function RepositoryDrawerClient({ data, initialTab }: RepositoryDrawerClientProps) {
  const featureFlags = useFeatureFlags();
  const router = useRouter();
  const pathname = usePathname();
  const isOpen = pathname.startsWith('/repository/');
  const [activeTab, setActiveTab] = useState<string>(initialTab ?? 'overview');
  const [commitBranch, setCommitBranch] = useState<string | undefined>(undefined);
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

  // Session ID for repo chat — deterministic per repo
  const repoSessionId = data.id ? `repo-${data.id}` : `repo-${data.name}`;

  const commitHistory = useCommitHistory({
    repositoryPath: data.repositoryPath,
    branch: commitBranch,
    enabled: activeTab === 'commits' && !!data.repositoryPath,
  });

  return (
    <BaseDrawer
      open={isOpen}
      onClose={onClose}
      size="lg"
      modal={false}
      data-testid="repository-drawer"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        {/* Header with inline tabs */}
        <div className="shrink-0 px-4 pt-4 pb-3" data-testid="repository-drawer-header">
          <div className="flex items-baseline gap-4 pr-6">
            <h2 className="text-foreground min-w-0 shrink truncate text-base font-semibold tracking-tight">
              {data.name}
            </h2>
            <TabsList className="h-auto shrink-0 gap-0.5 rounded-none border-0 bg-transparent p-0">
              <TabsTrigger
                value="overview"
                className="text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:border-primary h-auto rounded-none border-b-2 border-transparent bg-transparent px-2 py-0.5 text-[12px] font-medium shadow-none transition-colors data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:border-primary h-auto rounded-none border-b-2 border-transparent bg-transparent px-2 py-0.5 text-[12px] font-medium shadow-none transition-colors data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Chat
              </TabsTrigger>
              {data.repositoryPath ? (
                <TabsTrigger
                  value="commits"
                  className="text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:border-primary h-auto rounded-none border-b-2 border-transparent bg-transparent px-2 py-0.5 text-[12px] font-medium shadow-none transition-colors data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Commits
                </TabsTrigger>
              ) : null}
            </TabsList>
          </div>
          <div className="mt-1 flex items-center gap-2">
            {data.repositoryPath ? (
              <p className="text-muted-foreground min-w-0 truncate font-mono text-xs">
                {data.repositoryPath}
              </p>
            ) : null}
            {featureFlags.envDeploy && data.repositoryPath ? (
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <ActionButton
                          label={isDeployActive ? 'Stop Dev Server' : 'Start Dev Server'}
                          onClick={isDeployActive ? deployAction.stop : deployAction.deploy}
                          loading={deployAction.deployLoading || deployAction.stopLoading}
                          error={!!deployAction.deployError}
                          icon={isDeployActive ? Square : Play}
                          iconOnly
                          variant="outline"
                          size="icon-sm"
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isDeployActive ? 'Stop Dev Server' : 'Start Dev Server'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {isDeployActive ? (
                  <DeploymentStatusBadge
                    status={deployAction.status}
                    url={deployAction.url}
                    targetId={data.repositoryPath}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <Separator />

        {/* Overview tab */}
        <TabsContent value="overview" className="mt-0 flex-1 overflow-y-auto">
          {data.repositoryPath ? (
            <div className="flex-1 overflow-y-auto">
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
              {data.id && featureFlags.gitRebaseSync ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-3 p-4">
                    <div className="text-muted-foreground text-xs font-semibold tracking-wider">
                      GIT OPERATIONS
                    </div>
                    <div className="flex flex-col gap-2">
                      <ActionButton
                        label="Sync Main"
                        onClick={repoActions.syncMain}
                        loading={repoActions.syncLoading}
                        error={!!repoActions.syncError}
                        icon={RefreshCw}
                        variant="outline"
                        size="sm"
                      />
                      {repoActions.syncError ? (
                        <p className="text-destructive text-xs">{repoActions.syncError}</p>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </TabsContent>

        {/* Chat tab */}
        <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <ChatTab featureId={repoSessionId} worktreePath={data.repositoryPath} />
        </TabsContent>

        {/* Commits tab */}
        <TabsContent value="commits" className="mt-0 flex-1 overflow-y-auto">
          <CommitHistoryTree
            commits={commitHistory.data?.commits ?? null}
            loading={commitHistory.loading}
            error={commitHistory.error}
            currentBranch={commitHistory.data?.currentBranch ?? ''}
            defaultBranch={commitHistory.data?.defaultBranch ?? ''}
            activeBranch={commitBranch ?? commitHistory.data?.currentBranch ?? ''}
            onBranchChange={(branch) => {
              setCommitBranch(branch);
            }}
          />
        </TabsContent>
      </Tabs>
    </BaseDrawer>
  );
}
