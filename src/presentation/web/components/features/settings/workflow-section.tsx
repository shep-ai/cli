'use client';

import { useState, useTransition } from 'react';
import type { WorkflowConfig } from '@shepai/core/domain/generated/output';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

export interface WorkflowSectionProps {
  workflow: WorkflowConfig;
  onSave: (data: WorkflowConfig) => Promise<boolean>;
}

export function WorkflowSection({ workflow, onSave }: WorkflowSectionProps) {
  const [isPending, startTransition] = useTransition();

  const [openPrOnImplementationComplete, setOpenPrOnImplementationComplete] = useState(
    workflow.openPrOnImplementationComplete
  );
  const [allowPrd, setAllowPrd] = useState(workflow.approvalGateDefaults.allowPrd);
  const [allowPlan, setAllowPlan] = useState(workflow.approvalGateDefaults.allowPlan);
  const [allowMerge, setAllowMerge] = useState(workflow.approvalGateDefaults.allowMerge);
  const [pushOnImplementationComplete, setPushOnImplementationComplete] = useState(
    workflow.approvalGateDefaults.pushOnImplementationComplete
  );
  const [ciMaxFixAttempts, setCiMaxFixAttempts] = useState(workflow.ciMaxFixAttempts ?? 3);
  const [ciWatchTimeoutMinutes, setCiWatchTimeoutMinutes] = useState(
    (workflow.ciWatchTimeoutMs ?? 600000) / 60000
  );
  const [ciLogMaxChars, setCiLogMaxChars] = useState(workflow.ciLogMaxChars ?? 50000);

  function handleSave() {
    startTransition(async () => {
      await onSave({
        openPrOnImplementationComplete,
        approvalGateDefaults: {
          allowPrd,
          allowPlan,
          allowMerge,
          pushOnImplementationComplete,
        },
        ciMaxFixAttempts,
        ciWatchTimeoutMs: ciWatchTimeoutMinutes * 60000,
        ciLogMaxChars,
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* PR Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">PR Settings</h3>
          <div className="flex items-center justify-between">
            <Label htmlFor="openPr">Open PR on implementation complete</Label>
            <Switch
              id="openPr"
              checked={openPrOnImplementationComplete}
              onCheckedChange={setOpenPrOnImplementationComplete}
            />
          </div>
        </div>

        <Separator />

        {/* Approval Gates */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Approval Gates</h3>
          <div className="flex items-center justify-between">
            <Label htmlFor="allowPrd">Auto-approve requirements</Label>
            <Switch id="allowPrd" checked={allowPrd} onCheckedChange={setAllowPrd} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="allowPlan">Auto-approve planning</Label>
            <Switch id="allowPlan" checked={allowPlan} onCheckedChange={setAllowPlan} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="allowMerge">Auto-approve merge</Label>
            <Switch id="allowMerge" checked={allowMerge} onCheckedChange={setAllowMerge} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="pushOnImpl">Push on implementation complete</Label>
            <Switch
              id="pushOnImpl"
              checked={pushOnImplementationComplete}
              onCheckedChange={setPushOnImplementationComplete}
            />
          </div>
        </div>

        <Separator />

        {/* CI Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">CI Configuration</h3>
          <div className="space-y-2">
            <Label htmlFor="ciMaxFixAttempts">Max fix attempts</Label>
            <Input
              id="ciMaxFixAttempts"
              type="number"
              min={1}
              max={10}
              value={ciMaxFixAttempts}
              onChange={(e) => setCiMaxFixAttempts(Number(e.target.value))}
            />
            <p className="text-muted-foreground text-xs">
              Maximum CI fix/push/watch iterations before giving up
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ciWatchTimeout">CI watch timeout</Label>
            <div className="flex items-center gap-2">
              <Input
                id="ciWatchTimeout"
                type="number"
                min={1}
                value={ciWatchTimeoutMinutes}
                onChange={(e) => setCiWatchTimeoutMinutes(Number(e.target.value))}
              />
              <span className="text-muted-foreground text-sm">minutes</span>
            </div>
            <p className="text-muted-foreground text-xs">
              How long to wait for a CI run to complete
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ciLogMaxChars">CI log max chars</Label>
            <div className="flex items-center gap-2">
              <Input
                id="ciLogMaxChars"
                type="number"
                min={1000}
                value={ciLogMaxChars}
                onChange={(e) => setCiLogMaxChars(Number(e.target.value))}
              />
              <span className="text-muted-foreground text-sm">characters</span>
            </div>
            <p className="text-muted-foreground text-xs">
              Maximum characters of CI failure logs passed to the executor
            </p>
          </div>
        </div>

        <Separator />

        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
