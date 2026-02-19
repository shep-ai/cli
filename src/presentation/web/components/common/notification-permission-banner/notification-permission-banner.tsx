'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISSED_KEY = 'shep:notification-banner-dismissed';

export function NotificationPermissionBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof globalThis.Notification === 'undefined') return;
    if (globalThis.Notification.permission !== 'default') return;
    if (localStorage.getItem(DISMISSED_KEY) === 'true') return;
    setVisible(true);
  }, []);

  const handleEnable = useCallback(async () => {
    if (typeof globalThis.Notification === 'undefined') return;
    const result = await globalThis.Notification.requestPermission();
    if (result === 'granted' || result === 'denied') {
      setVisible(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="bg-background absolute bottom-4 left-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border p-3 shadow-lg">
      <Bell className="text-muted-foreground size-5 shrink-0" />
      <p className="text-muted-foreground text-sm">
        Enable desktop notifications to stay updated on feature progress.
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" onClick={handleEnable}>
          Enable
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleDismiss}
          aria-label="Dismiss notification banner"
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
