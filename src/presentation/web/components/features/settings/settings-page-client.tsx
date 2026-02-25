'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Settings } from '@shepai/core/domain/generated/output';
import { PageHeader } from '@/components/common/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { updateSettings } from '@/app/actions/update-settings';
import { ModelSettingsSection } from './model-settings-section';
import { AgentSection } from './agent-section';
import { WorkflowSection } from './workflow-section';
import { UserProfileSection } from './user-profile-section';
import { EnvironmentSection } from './environment-section';
import { NotificationsSection } from './notifications-section';
import { SystemSection } from './system-section';

export interface SettingsPageClientProps {
  settings: Settings;
}

export const SETTINGS_TABS = [
  { value: 'models', label: 'Models' },
  { value: 'agent', label: 'Agent' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'user', label: 'User Profile' },
  { value: 'environment', label: 'Environment' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'system', label: 'System' },
] as const;

export type SettingsSection = (typeof SETTINGS_TABS)[number]['value'];

export function SettingsPageClient({ settings }: SettingsPageClientProps) {
  const handleSave = useCallback(
    (section: SettingsSection) =>
      async (data: Record<string, unknown>): Promise<boolean> => {
        const result = await updateSettings({ section, data });
        if (result.error) {
          toast.error('Failed to save settings', { description: result.error });
          return false;
        }
        toast.success('Settings saved');
        return true;
      },
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure your platform preferences" />
      <Tabs defaultValue="models">
        <TabsList>
          {SETTINGS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="models">
          <ModelSettingsSection models={settings.models} onSave={handleSave('models')} />
        </TabsContent>
        <TabsContent value="agent">
          <AgentSection agent={settings.agent} onSave={handleSave('agent')} />
        </TabsContent>
        <TabsContent value="workflow">
          <WorkflowSection workflow={settings.workflow} onSave={handleSave('workflow')} />
        </TabsContent>
        <TabsContent value="user">
          <UserProfileSection data={settings.user} onSave={handleSave('user')} />
        </TabsContent>
        <TabsContent value="environment">
          <EnvironmentSection data={settings.environment} onSave={handleSave('environment')} />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsSection
            notifications={settings.notifications}
            onSave={handleSave('notifications')}
          />
        </TabsContent>
        <TabsContent value="system">
          <SystemSection system={settings.system} onSave={handleSave('system')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
