'use client';

import { Settings as SettingsIcon } from 'lucide-react';
import { AgentSettingsSection } from './agent-settings-section';
import { EnvironmentSettingsSection } from './environment-settings-section';
import { WorkflowSettingsSection } from './workflow-settings-section';
import { NotificationSettingsSection } from './notification-settings-section';
import { FeatureFlagsSettingsSection } from './feature-flags-settings-section';
import { DatabaseSettingsSection } from './database-settings-section';
import type { Settings } from '@shepai/core/domain/generated/output';

export interface SettingsPageClientProps {
  settings: Settings;
  shepHome: string;
  dbFileSize: string;
}

export function SettingsPageClient({ settings, shepHome, dbFileSize }: SettingsPageClientProps) {
  const featureFlags = settings.featureFlags ?? { skills: false, envDeploy: false, debug: false };

  return (
    <div data-testid="settings-page-client" className="space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="text-muted-foreground h-4 w-4" />
        <h1 className="text-sm font-bold tracking-tight">Settings</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        <AgentSettingsSection agent={settings.agent} />
        <EnvironmentSettingsSection environment={settings.environment} />
        <WorkflowSettingsSection workflow={settings.workflow} />
        <NotificationSettingsSection notifications={settings.notifications} />
        <FeatureFlagsSettingsSection featureFlags={featureFlags} />
        <DatabaseSettingsSection shepHome={shepHome} dbFileSize={dbFileSize} />
      </div>
    </div>
  );
}
