import { resolve } from '@/lib/server-container';
import type { IRepositoryRepository } from '@shepai/core/application/ports/output/repositories/repository-repository.interface';
import { RepositoryDrawerClient } from '@/components/common/control-center-drawer/repository-drawer-client';
import { fetchRepoGitInfo } from '@/app/(dashboard)/get-graph-data';

/** Skip static pre-rendering since we need runtime DI container. */
export const dynamic = 'force-dynamic';

interface RepositoryDrawerPageProps {
  params: Promise<{ repositoryId: string }>;
}

export default async function RepositoryDrawerPage({ params }: RepositoryDrawerPageProps) {
  const { repositoryId } = await params;

  try {
    const repoRepository = resolve<IRepositoryRepository>('IRepositoryRepository');
    const repository = await repoRepository.findById(repositoryId);

    if (!repository) return null;

    const gitInfo = await fetchRepoGitInfo(repository);

    return (
      <RepositoryDrawerClient
        data={{
          name: repository.name,
          repositoryPath: repository.path,
          id: repository.id,
          createdAt: repository.createdAt ? new Date(repository.createdAt).getTime() : undefined,
          ...(gitInfo && {
            branch: gitInfo.branch,
            commitMessage: gitInfo.commitMessage,
            committer: gitInfo.committer,
            behindCount: gitInfo.behindCount,
          }),
        }}
      />
    );
  } catch {
    return null;
  }
}
