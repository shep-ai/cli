import { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { useSound } from './use-sound';

/** Mirrors NotificationSeverity enum values (inlined to avoid @shepai/core import in Storybook). */
type Severity = 'info' | 'warning' | 'success' | 'error';

const SEVERITY_SOUNDS: Record<Severity, string> = {
  success: 'celebration',
  error: 'caution',
  warning: 'notification',
  info: 'button',
};

interface DemoEvent {
  eventType: string;
  severity: Severity;
  featureName: string;
  message: string;
  phaseName?: string;
}

function NotificationDemo() {
  const successSound = useSound('celebration', { volume: 0.5 });
  const errorSound = useSound('caution', { volume: 0.5 });
  const warningSound = useSound('notification', { volume: 0.5 });
  const infoSound = useSound('button', { volume: 0.5 });

  const soundsByName: Record<string, { play: () => void }> = {
    celebration: successSound,
    caution: errorSound,
    notification: warningSound,
    button: infoSound,
  };

  const simulateNotification = useCallback(
    (event: DemoEvent) => {
      const method = event.severity ?? 'info';
      toast[method](event.featureName, { description: event.message });

      if (globalThis.Notification?.permission === 'granted') {
        new Notification(event.featureName, { body: event.message });
      }

      const soundName = SEVERITY_SOUNDS[event.severity];
      soundsByName[soundName]?.play();
    },
    [soundsByName]
  );

  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof globalThis.Notification !== 'undefined' ? globalThis.Notification.permission : 'default'
  );

  const requestPermission = async () => {
    if (typeof globalThis.Notification === 'undefined') return;
    const result = await globalThis.Notification.requestPermission();
    setBrowserPermission(result);
  };

  return (
    <div className="flex w-[420px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Browser Notification Permission</h3>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            Status: <code className="bg-muted rounded px-1.5 py-0.5">{browserPermission}</code>
          </span>
          <Button size="sm" variant="outline" onClick={requestPermission}>
            Request Permission
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Simulate Notification Events</h3>
        <p className="text-muted-foreground text-xs">
          Click a button to fire a toast, browser notification, and sound.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              simulateNotification({
                eventType: 'agent_started',
                severity: 'info',
                featureName: 'Auth Module',
                message: 'Agent started running',
              })
            }
          >
            Agent Started
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              simulateNotification({
                eventType: 'phase_completed',
                severity: 'info',
                featureName: 'Auth Module',
                message: 'Completed analyze phase',
                phaseName: 'analyze',
              })
            }
          >
            Phase Completed
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              simulateNotification({
                eventType: 'waiting_approval',
                severity: 'warning',
                featureName: 'Auth Module',
                message: 'Waiting for user approval',
              })
            }
          >
            Waiting Approval
          </Button>

          <Button
            size="sm"
            onClick={() =>
              simulateNotification({
                eventType: 'agent_completed',
                severity: 'success',
                featureName: 'Auth Module',
                message: 'Agent completed successfully',
              })
            }
          >
            Agent Completed
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={() =>
              simulateNotification({
                eventType: 'agent_failed',
                severity: 'error',
                featureName: 'Auth Module',
                message: 'Agent failed: token refresh error',
              })
            }
          >
            Agent Failed
          </Button>
        </div>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: 'Hooks/useNotifications',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
  ],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <NotificationDemo />,
};
