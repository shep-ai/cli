import { resolve } from '@/lib/server-container';
import type { ListFeaturesUseCase } from '@shepai/core/application/use-cases/features/list-features.use-case';
import { getWorkflowDefaults } from '@/app/actions/get-workflow-defaults';
import { CreateDrawerClient } from '@/components/common/control-center-drawer/create-drawer-client';

/** Skip static pre-rendering since we need runtime DI container. */
export const dynamic = 'force-dynamic';

interface CreateDrawerPageProps {
  searchParams: Promise<{ repo?: string; parent?: string }>;
}

export default async function CreateDrawerPage({ searchParams }: CreateDrawerPageProps) {
  const { repo, parent } = await searchParams;

  const listFeatures = resolve<ListFeaturesUseCase>('ListFeaturesUseCase');

  const [features, workflowDefaults] = await Promise.all([
    listFeatures.execute(),
    getWorkflowDefaults().catch(() => undefined),
  ]);

  const featureOptions = features
    .map((f) => ({ id: f.id, name: f.name }))
    .filter((f) => f.id && !f.id.startsWith('#'));

  return (
    <CreateDrawerClient
      repositoryPath={repo ?? ''}
      initialParentId={parent}
      features={featureOptions}
      workflowDefaults={workflowDefaults}
    />
  );
}
