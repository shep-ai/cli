'use client';

import { useState, useTransition } from 'react';
import type { EnvironmentConfig } from '@shepai/core/domain/generated/output';
import { EditorType } from '@shepai/core/domain/generated/output';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface EnvironmentSectionProps {
  data: EnvironmentConfig;
  onSave: (data: EnvironmentConfig) => Promise<boolean>;
}

const EDITOR_OPTIONS = [
  { value: EditorType.VsCode, label: 'VS Code' },
  { value: EditorType.Cursor, label: 'Cursor' },
  { value: EditorType.Windsurf, label: 'Windsurf' },
  { value: EditorType.Zed, label: 'Zed' },
  { value: EditorType.Antigravity, label: 'Antigravity' },
] as const;

export function EnvironmentSection({ data, onSave }: EnvironmentSectionProps) {
  const [formData, setFormData] = useState<EnvironmentConfig>({ ...data });
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await onSave(formData);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment</CardTitle>
        <CardDescription>Configure your development environment preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="default-editor">Default Editor</Label>
          <Select
            value={formData.defaultEditor}
            onValueChange={(value: EditorType) =>
              setFormData((prev) => ({ ...prev, defaultEditor: value }))
            }
          >
            <SelectTrigger id="default-editor">
              <SelectValue placeholder="Select editor" />
            </SelectTrigger>
            <SelectContent>
              {EDITOR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="shell-preference">Shell Preference</Label>
          <Input
            id="shell-preference"
            value={formData.shellPreference}
            onChange={(e) => setFormData((prev) => ({ ...prev, shellPreference: e.target.value }))}
            placeholder="e.g. /bin/zsh"
          />
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
