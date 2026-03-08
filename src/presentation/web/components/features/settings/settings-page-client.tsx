'use client';

import { Bot, Terminal, GitBranch, Bell, Flag, Database } from 'lucide-react';
import { AgentSettingsSection } from './agent-settings-section';
import { EnvironmentSettingsSection } from './environment-settings-section';
import { WorkflowSettingsSection } from './workflow-settings-section';
import { NotificationSettingsSection } from './notification-settings-section';
import { FeatureFlagsSettingsSection } from './feature-flags-settings-section';
import { DatabaseSettingsSection } from './database-settings-section';
import type { Settings } from '@shepai/core/domain/generated/output';

const SECTIONS = [
  { id: 'agent', label: 'Agent', icon: Bot },
  { id: 'environment', label: 'IDE & Terminal', icon: Terminal },
  { id: 'workflow', label: 'Workflow', icon: GitBranch },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'feature-flags', label: 'Feature Flags', icon: Flag },
  { id: 'database', label: 'Database', icon: Database },
] as const;

export interface SettingsPageClientProps {
  settings: Settings;
  shepHome: string;
  dbFileSize: string;
}

export function SettingsPageClient({ settings, shepHome, dbFileSize }: SettingsPageClientProps) {
  const featureFlags = settings.featureFlags ?? { skills: false, envDeploy: false, debug: false };

  return (
    <div data-testid="settings-page-client" className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your preferences and configuration</p>
      </div>

      <nav className="flex flex-wrap gap-1" aria-label="Settings sections">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Icon className="h-3 w-3" />
            {label}
          </a>
        ))}
      </nav>

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
