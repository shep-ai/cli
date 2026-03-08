'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Terminal, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
  const [showSaved, setShowSaved] = useState(false);
  const prevPendingRef = useRef(false);

  useEffect(() => {
    if (prevPendingRef.current && !isPending) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
    prevPendingRef.current = isPending;
  }, [isPending]);

  function save(payload: { environment: Partial<EnvironmentConfig> }) {
    startTransition(async () => {
      const result = await updateSettingsAction(payload);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to save IDE & Terminal settings');
      }
    });
  }

  function handleEditorChange(value: string) {
    setEditor(value as EditorType);
    save({ environment: { defaultEditor: value as EditorType, shellPreference: shell } });
  }

  function handleShellChange(value: string) {
    setShell(value);
    save({ environment: { defaultEditor: editor, shellPreference: value } });
  }

  return (
    <Card id="environment" className="scroll-mt-6" data-testid="environment-settings-section">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="text-muted-foreground h-4 w-4" />
            <CardTitle>IDE & Terminal</CardTitle>
          </div>
          {isPending ? <span className="text-muted-foreground text-xs">Saving...</span> : null}
          {showSaved && !isPending ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" />
              Saved
            </span>
          ) : null}
        </div>
        <CardDescription>Configure your default editor and shell preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="default-editor">Default Editor</Label>
          <Select value={editor} onValueChange={handleEditorChange}>
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
          <Select value={shell} onValueChange={handleShellChange}>
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
      </CardContent>
    </Card>
  );
}
