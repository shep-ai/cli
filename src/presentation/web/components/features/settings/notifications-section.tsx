'use client';

import { useState, useTransition } from 'react';
import type { NotificationPreferences } from '@shepai/core/domain/generated/output';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

export interface NotificationsSectionProps {
  notifications: NotificationPreferences;
  onSave: (data: NotificationPreferences) => Promise<boolean>;
}

const CHANNEL_TOGGLES = [
  { key: 'inApp' as const, label: 'In-App' },
  { key: 'browser' as const, label: 'Browser' },
  { key: 'desktop' as const, label: 'Desktop' },
];

const EVENT_TOGGLES = [
  { key: 'agentStarted' as const, label: 'Agent Started' },
  { key: 'phaseCompleted' as const, label: 'Phase Completed' },
  { key: 'waitingApproval' as const, label: 'Waiting Approval' },
  { key: 'agentCompleted' as const, label: 'Agent Completed' },
  { key: 'agentFailed' as const, label: 'Agent Failed' },
  { key: 'prMerged' as const, label: 'PR Merged' },
  { key: 'prClosed' as const, label: 'PR Closed' },
  { key: 'prChecksPassed' as const, label: 'PR Checks Passed' },
  { key: 'prChecksFailed' as const, label: 'PR Checks Failed' },
];

export function NotificationsSection({ notifications, onSave }: NotificationsSectionProps) {
  const [channels, setChannels] = useState({
    inApp: notifications.inApp.enabled,
    browser: notifications.browser.enabled,
    desktop: notifications.desktop.enabled,
  });
  const [events, setEvents] = useState({ ...notifications.events });
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await onSave({
        inApp: { enabled: channels.inApp },
        browser: { enabled: channels.browser },
        desktop: { enabled: channels.desktop },
        events,
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {CHANNEL_TOGGLES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`channel-${key}`}>{label}</Label>
              <Switch
                id={`channel-${key}`}
                checked={channels[key]}
                onCheckedChange={(checked: boolean) =>
                  setChannels((prev) => ({ ...prev, [key]: checked }))
                }
              />
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Event Filters</h4>
          {EVENT_TOGGLES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`event-${key}`}>{label}</Label>
              <Switch
                id={`event-${key}`}
                checked={events[key]}
                onCheckedChange={(checked: boolean) =>
                  setEvents((prev) => ({ ...prev, [key]: checked }))
                }
              />
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardFooter>
    </Card>
  );
}
