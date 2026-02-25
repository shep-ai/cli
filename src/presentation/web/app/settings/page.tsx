import { notFound } from 'next/navigation';
import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shepai/core/application/use-cases/settings/load-settings.use-case';
import { SettingsPageClient } from '@/components/features/settings';
import { featureFlags } from '@/lib/feature-flags';

/** Skip static pre-rendering since we need runtime DI container and server context. */
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  if (!featureFlags.settings) notFound();

  const useCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
  const settings = await useCase.execute();

  return (
    <div className="flex h-full flex-col p-6">
      <SettingsPageClient settings={settings} />
    </div>
  );
}
