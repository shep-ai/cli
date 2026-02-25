'use client';

import { useState, useTransition } from 'react';
import type { SystemConfig } from '@shepai/core/domain/generated/output';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

export interface SystemSectionProps {
  system: SystemConfig;
  onSave: (data: SystemConfig) => Promise<boolean>;
}

export function SystemSection({ system, onSave }: SystemSectionProps) {
  const [autoUpdate, setAutoUpdate] = useState(system.autoUpdate);
  const [logLevel, setLogLevel] = useState(system.logLevel);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await onSave({ autoUpdate, logLevel });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System</CardTitle>
        <CardDescription>General system configuration and logging preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-update">Auto Update</Label>
          <Switch id="auto-update" checked={autoUpdate} onCheckedChange={setAutoUpdate} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="log-level">Log Level</Label>
          <Select value={logLevel} onValueChange={setLogLevel}>
            <SelectTrigger id="log-level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOG_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
