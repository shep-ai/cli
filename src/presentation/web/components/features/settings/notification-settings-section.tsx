'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { updateSettingsAction } from '@/app/actions/update-settings';
import type { NotificationPreferences } from '@shepai/core/domain/generated/output';

const EVENT_TOGGLES = [
  { key: 'agentStarted', label: 'Agent Started' },
  { key: 'phaseCompleted', label: 'Phase Completed' },
  { key: 'waitingApproval', label: 'Waiting Approval' },
  { key: 'agentCompleted', label: 'Agent Completed' },
  { key: 'agentFailed', label: 'Agent Failed' },
  { key: 'prMerged', label: 'PR Merged' },
  { key: 'prClosed', label: 'PR Closed' },
  { key: 'prChecksPassed', label: 'PR Checks Passed' },
  { key: 'prChecksFailed', label: 'PR Checks Failed' },
] as const;

export interface NotificationSettingsSectionProps {
  notifications: NotificationPreferences;
}

export function NotificationSettingsSection({ notifications }: NotificationSettingsSectionProps) {
  const [inApp, setInApp] = useState(notifications.inApp.enabled);
  const [browser, setBrowser] = useState(notifications.browser.enabled);
  const [desktop, setDesktop] = useState(notifications.desktop.enabled);
  const [events, setEvents] = useState({ ...notifications.events });
  const [isPending, startTransition] = useTransition();

  const isDirty =
    inApp !== notifications.inApp.enabled ||
    browser !== notifications.browser.enabled ||
    desktop !== notifications.desktop.enabled ||
    EVENT_TOGGLES.some(({ key }) => events[key] !== notifications.events[key]);

  function setEvent(key: string, value: boolean) {
    setEvents((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateSettingsAction({
        notifications: {
          inApp: { enabled: inApp },
          browser: { enabled: browser },
          desktop: { enabled: desktop },
          events,
        },
      });
      if (result.success) {
        toast.success('Notification settings saved');
      } else {
        toast.error(result.error ?? 'Failed to save notification settings');
      }
    });
  }

  return (
    <Card data-testid="notification-settings-section">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Configure notification channels and event preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm font-medium">Channels</p>
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-in-app">In-App</Label>
            <Switch
              id="notif-in-app"
              data-testid="switch-in-app"
              checked={inApp}
              onCheckedChange={setInApp}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-browser">Browser</Label>
            <Switch
              id="notif-browser"
              data-testid="switch-browser"
              checked={browser}
              onCheckedChange={setBrowser}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-desktop">Desktop</Label>
            <Switch
              id="notif-desktop"
              data-testid="switch-desktop"
              checked={desktop}
              onCheckedChange={setDesktop}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-muted-foreground text-sm font-medium">Events</p>
          {EVENT_TOGGLES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`notif-event-${key}`}>{label}</Label>
              <Switch
                id={`notif-event-${key}`}
                data-testid={`switch-event-${key}`}
                checked={events[key]}
                onCheckedChange={(v) => setEvent(key, v)}
              />
            </div>
          ))}
        </div>

        <Button
          onClick={handleSave}
          disabled={!isDirty || isPending}
          data-testid="notification-save-button"
        >
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}
