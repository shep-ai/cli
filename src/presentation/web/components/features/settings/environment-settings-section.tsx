'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateSettingsAction } from '@/app/actions/update-settings';
import { EditorType } from '@shepai/core/domain/generated/output';
import type { EnvironmentConfig } from '@shepai/core/domain/generated/output';

const EDITOR_OPTIONS = [
  { value: EditorType.VsCode, label: 'VS Code' },
  { value: EditorType.Cursor, label: 'Cursor' },
  { value: EditorType.Windsurf, label: 'Windsurf' },
  { value: EditorType.Zed, label: 'Zed' },
  { value: EditorType.Antigravity, label: 'Antigravity' },
];

const SHELL_OPTIONS = [
  { value: 'bash', label: 'Bash' },
  { value: 'zsh', label: 'Zsh' },
  { value: 'fish', label: 'Fish' },
];

export interface EnvironmentSettingsSectionProps {
  environment: EnvironmentConfig;
}

export function EnvironmentSettingsSection({ environment }: EnvironmentSettingsSectionProps) {
  const [editor, setEditor] = useState(environment.defaultEditor);
  const [shell, setShell] = useState(environment.shellPreference);
  const [isPending, startTransition] = useTransition();

  const isDirty = editor !== environment.defaultEditor || shell !== environment.shellPreference;

  function handleSave() {
    startTransition(async () => {
      const result = await updateSettingsAction({
        environment: { defaultEditor: editor, shellPreference: shell },
      });
      if (result.success) {
        toast.success('IDE & Terminal settings saved');
      } else {
        toast.error(result.error ?? 'Failed to save IDE & Terminal settings');
      }
    });
  }

  return (
    <Card data-testid="environment-settings-section">
      <CardHeader>
        <CardTitle>IDE & Terminal</CardTitle>
        <CardDescription>Configure your default editor and shell preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="default-editor">Default Editor</Label>
          <Select value={editor} onValueChange={(v) => setEditor(v as EditorType)}>
            <SelectTrigger id="default-editor" data-testid="editor-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDITOR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="shell-preference">Shell Preference</Label>
          <Select value={shell} onValueChange={setShell}>
            <SelectTrigger id="shell-preference" data-testid="shell-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHELL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSave}
          disabled={!isDirty || isPending}
          data-testid="environment-save-button"
        >
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}
