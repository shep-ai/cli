'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { DevEnvironmentAnalysis, DevCommand } from '@shepai/core/domain/generated/output';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface DevEnvAnalysisEditorProps {
  analysis: DevEnvironmentAnalysis;
  onSave: (updated: DevEnvironmentAnalysis) => void;
  onCancel: () => void;
}

interface KeyedCommand extends DevCommand {
  _key: number;
}

interface KeyedPort {
  _key: number;
  value: number;
}

interface KeyedPrerequisite {
  _key: number;
  value: string;
}

interface KeyedEnvVar {
  _key: number;
  key: string;
  value: string;
}

export function DevEnvAnalysisEditor({ analysis, onSave, onCancel }: DevEnvAnalysisEditorProps) {
  const nextKey = useRef(0);
  const genKey = () => nextKey.current++;

  const [canStart, setCanStart] = useState(analysis.canStart);
  const [reason, setReason] = useState(analysis.reason ?? '');
  const [commands, setCommands] = useState<KeyedCommand[]>(() =>
    (analysis.commands ?? []).map((c) => ({ ...c, _key: genKey() }))
  );
  const [ports, setPorts] = useState<KeyedPort[]>(() =>
    (analysis.ports ?? []).map((p) => ({ _key: genKey(), value: p }))
  );
  const [prerequisites, setPrerequisites] = useState<KeyedPrerequisite[]>(() =>
    (analysis.prerequisites ?? []).map((p) => ({ _key: genKey(), value: p }))
  );
  const [envVars, setEnvVars] = useState<KeyedEnvVar[]>(() =>
    Object.entries(analysis.environmentVariables ?? {}).map(([k, v]) => ({
      _key: genKey(),
      key: k,
      value: v,
    }))
  );
  const [language, setLanguage] = useState(analysis.language);
  const [framework, setFramework] = useState(analysis.framework ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const envObj: Record<string, string> = {};
    for (const ev of envVars) {
      if (ev.key) envObj[ev.key] = ev.value;
    }
    onSave({
      ...analysis,
      canStart,
      reason: reason || undefined,
      commands: commands.map(({ _key: _, ...rest }) => rest),
      ports: ports.length > 0 ? ports.map((p) => p.value) : undefined,
      prerequisites: prerequisites.length > 0 ? prerequisites.map((p) => p.value) : undefined,
      environmentVariables: Object.keys(envObj).length > 0 ? envObj : undefined,
      language,
      framework: framework || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="dev-env-analysis-editor"
      className="flex flex-col gap-4 p-4"
    >
      {/* canStart toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="canStart">Can start dev server</Label>
        <Switch id="canStart" checked={canStart} onCheckedChange={setCanStart} />
      </div>

      {/* Reason (shown when canStart is false) */}
      {!canStart ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reason">Reason</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why this repo cannot start a dev server"
          />
        </div>
      ) : null}

      {/* Language */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="language">Language</Label>
        <Input
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder="e.g., TypeScript, Python, Go"
        />
      </div>

      {/* Framework */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="framework">Framework</Label>
        <Input
          id="framework"
          value={framework}
          onChange={(e) => setFramework(e.target.value)}
          placeholder="e.g., Next.js, Django, Express"
        />
      </div>

      {/* Commands */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Commands</legend>
        {commands.map((cmd, idx) => (
          <div key={cmd._key} className="bg-muted/50 flex flex-col gap-1.5 rounded-md border p-2">
            <div className="flex items-center gap-1">
              <GripVertical className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <Input
                value={cmd.command}
                onChange={(e) => {
                  const updated = [...commands];
                  updated[idx] = { ...cmd, command: e.target.value };
                  setCommands(updated);
                }}
                placeholder="Shell command"
                aria-label={`Command ${idx + 1}`}
                className="h-7 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setCommands(commands.filter((c) => c._key !== cmd._key))}
                aria-label={`Remove command ${idx + 1}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <Input
              value={cmd.description}
              onChange={(e) => {
                const updated = [...commands];
                updated[idx] = { ...cmd, description: e.target.value };
                setCommands(updated);
              }}
              placeholder="Description"
              aria-label={`Command ${idx + 1} description`}
              className="h-7 text-xs"
            />
            <Input
              value={cmd.workingDirectory ?? ''}
              onChange={(e) => {
                const updated = [...commands];
                updated[idx] = {
                  ...cmd,
                  workingDirectory: e.target.value || undefined,
                };
                setCommands(updated);
              }}
              placeholder="Working directory (optional)"
              aria-label={`Command ${idx + 1} working directory`}
              className="h-7 text-xs"
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() =>
            setCommands([...commands, { command: '', description: '', _key: genKey() }])
          }
          aria-label="Add command"
        >
          <Plus className="h-3 w-3" />
          Add command
        </Button>
      </fieldset>

      {/* Ports */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Ports</legend>
        <div className="flex flex-wrap gap-1.5">
          {ports.map((port, idx) => (
            <div key={port._key} className="flex items-center gap-1">
              <Input
                type="number"
                value={port.value}
                onChange={(e) => {
                  const updated = [...ports];
                  updated[idx] = {
                    ...port,
                    value: parseInt(e.target.value, 10) || 0,
                  };
                  setPorts(updated);
                }}
                aria-label={`Port ${idx + 1}`}
                className="h-7 w-20 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setPorts(ports.filter((p) => p._key !== port._key))}
                aria-label={`Remove port ${idx + 1}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setPorts([...ports, { _key: genKey(), value: 3000 }])}
          aria-label="Add port"
        >
          <Plus className="h-3 w-3" />
          Add port
        </Button>
      </fieldset>

      {/* Prerequisites */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Prerequisites</legend>
        {prerequisites.map((prereq, idx) => (
          <div key={prereq._key} className="flex items-center gap-1">
            <Input
              value={prereq.value}
              onChange={(e) => {
                const updated = [...prerequisites];
                updated[idx] = { ...prereq, value: e.target.value };
                setPrerequisites(updated);
              }}
              aria-label={`Prerequisite ${idx + 1}`}
              placeholder="e.g., Docker, Node.js 18+"
              className="h-7 text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setPrerequisites(prerequisites.filter((p) => p._key !== prereq._key))}
              aria-label={`Remove prerequisite ${idx + 1}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setPrerequisites([...prerequisites, { _key: genKey(), value: '' }])}
          aria-label="Add prerequisite"
        >
          <Plus className="h-3 w-3" />
          Add prerequisite
        </Button>
      </fieldset>

      {/* Environment Variables */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Environment Variables</legend>
        {envVars.map((ev, idx) => (
          <div key={ev._key} className="flex items-center gap-1">
            <Input
              value={ev.key}
              onChange={(e) => {
                const updated = [...envVars];
                updated[idx] = { ...ev, key: e.target.value };
                setEnvVars(updated);
              }}
              placeholder="KEY"
              aria-label={`Env var ${idx + 1} key`}
              className="h-7 text-xs"
            />
            <span className="text-muted-foreground text-xs">=</span>
            <Input
              value={ev.value}
              onChange={(e) => {
                const updated = [...envVars];
                updated[idx] = { ...ev, value: e.target.value };
                setEnvVars(updated);
              }}
              placeholder="value"
              aria-label={`Env var ${idx + 1} value`}
              className="h-7 text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setEnvVars(envVars.filter((v) => v._key !== ev._key))}
              aria-label={`Remove env var ${idx + 1}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setEnvVars([...envVars, { _key: genKey(), key: '', value: '' }])}
          aria-label="Add environment variable"
        >
          <Plus className="h-3 w-3" />
          Add variable
        </Button>
      </fieldset>

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Save
        </Button>
      </div>
    </form>
  );
}
