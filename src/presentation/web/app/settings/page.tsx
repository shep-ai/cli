import { loadSettings } from '@/app/actions/load-settings';
import { SettingsPageClient } from '@/components/features/settings/settings-page-client';

/** Skip static pre-rendering since we need runtime DI container and server context. */
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { settings, shepHome, dbFileSize, error } = await loadSettings();

  if (error || !settings) {
    return (
      <div className="flex h-full flex-col p-6">
        <p className="text-destructive text-sm">Failed to load settings: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col px-6 pb-6">
      <SettingsPageClient
        settings={settings}
        shepHome={shepHome ?? ''}
        dbFileSize={dbFileSize ?? 'Unknown'}
      />
    </div>
  );
}
