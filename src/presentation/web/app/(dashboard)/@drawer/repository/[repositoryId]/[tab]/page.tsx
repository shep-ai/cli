import { resolve } from '@/lib/server-container';
import type { IRepositoryRepository } from '@shepai/core/application/ports/output/repositories/repository-repository.interface';
import { RepositoryDrawerClient } from '@/components/common/control-center-drawer/repository-drawer-client';

/** Skip static pre-rendering since we need runtime DI container. */
export const dynamic = 'force-dynamic';

interface RepositoryTabPageProps {
  params: Promise<{ repositoryId: string; tab: string }>;
}

export default async function RepositoryTabPage({ params }: RepositoryTabPageProps) {
  const { repositoryId, tab } = await params;

  try {
    const repoRepository = resolve<IRepositoryRepository>('IRepositoryRepository');
    const repository = await repoRepository.findById(repositoryId);

    if (!repository) return null;

    return (
      <RepositoryDrawerClient
        data={{ name: repository.name, repositoryPath: repository.path, id: repository.id }}
        initialTab={tab === 'chat' ? 'chat' : 'overview'}
      />
    );
  } catch {
    return null;
  }
}
