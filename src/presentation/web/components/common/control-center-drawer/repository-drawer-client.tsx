'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Code2, Terminal, FolderOpen } from 'lucide-react';
import { BaseDrawer } from '@/components/common/base-drawer';
import { ActionButton } from '@/components/common/action-button';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { useRepositoryActions } from '@/components/common/repository-node/use-repository-actions';
import { featureFlags } from '@/lib/feature-flags';
import type { RepositoryNodeData } from '@/components/common/repository-node';

export interface RepositoryDrawerClientProps {
  data: RepositoryNodeData;
}

export function RepositoryDrawerClient({ data }: RepositoryDrawerClientProps) {
  const router = useRouter();
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

  return (
    <BaseDrawer
      open
      onClose={onClose}
      size="md"
      modal={false}
      header={header}
      deployTarget={featureFlags.envDeploy ? repoDeployTarget : undefined}
      data-testid="repository-drawer"
    >
      {data.repositoryPath ? (
        <div className="flex-1 overflow-y-auto">
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
        </div>
      ) : null}
    </BaseDrawer>
  );
}
