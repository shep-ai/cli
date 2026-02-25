import { resolve } from '@/lib/server-container';
import type { ListToolsUseCase } from '@shepai/core/application/use-cases/tools/list-tools.use-case';
import { ToolsPageClient } from '@/components/features/tools/tools-page-client';

/** Skip static pre-rendering since we need runtime DI container and server context. */
export const dynamic = 'force-dynamic';

export default async function ToolsPage() {
  const useCase = resolve<ListToolsUseCase>('ListToolsUseCase');
  const tools = await useCase.execute();

  return (
    <div className="flex h-full flex-col p-6">
      <ToolsPageClient tools={tools} />
    </div>
  );
}
