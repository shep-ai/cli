'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { updateSettingsAction } from '@/app/actions/update-settings';
import type { FeatureFlags } from '@shepai/core/domain/generated/output';

const FLAG_DESCRIPTIONS: Record<keyof FeatureFlags, string> = {
  skills: 'Enable Skills navigation and functionality in the web UI',
  envDeploy: 'Enable environment deployment features in the web UI',
  debug: 'Enable debug UI elements and verbose client-side logging',
};

const FLAG_LABELS: Record<keyof FeatureFlags, string> = {
  skills: 'Skills',
  envDeploy: 'Deployments',
  debug: 'Debug',
};

const FLAG_KEYS: (keyof FeatureFlags)[] = ['skills', 'envDeploy', 'debug'];

export interface FeatureFlagsSettingsSectionProps {
  featureFlags: FeatureFlags;
}

export function FeatureFlagsSettingsSection({ featureFlags }: FeatureFlagsSettingsSectionProps) {
  const [flags, setFlags] = useState<FeatureFlags>({ ...featureFlags });
  const [isPending, startTransition] = useTransition();

  const isDirty = FLAG_KEYS.some((key) => flags[key] !== featureFlags[key]);

  function setFlag(key: keyof FeatureFlags, value: boolean) {
    setFlags((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateSettingsAction({ featureFlags: flags });
      if (result.success) {
        toast.success('Feature flags saved');
      } else {
        toast.error(result.error ?? 'Failed to save feature flags');
      }
    });
  }

  return (
    <Card data-testid="feature-flags-settings-section">
      <CardHeader>
        <CardTitle>Feature Flags</CardTitle>
        <CardDescription>
          Toggle experimental and optional features. Changes take effect after page navigation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {FLAG_KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor={`flag-${key}`}>{FLAG_LABELS[key]}</Label>
              <p className="text-muted-foreground text-xs">{FLAG_DESCRIPTIONS[key]}</p>
            </div>
            <Switch
              id={`flag-${key}`}
              data-testid={`switch-flag-${key}`}
              checked={flags[key]}
              onCheckedChange={(v) => setFlag(key, v)}
            />
          </div>
        ))}

        <Button
          onClick={handleSave}
          disabled={!isDirty || isPending}
          data-testid="feature-flags-save-button"
        >
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}
