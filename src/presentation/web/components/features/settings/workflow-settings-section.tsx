'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { updateSettingsAction } from '@/app/actions/update-settings';
import type { WorkflowConfig } from '@shepai/core/domain/generated/output';

export interface WorkflowSettingsSectionProps {
  workflow: WorkflowConfig;
}

export function WorkflowSettingsSection({ workflow }: WorkflowSettingsSectionProps) {
  const [openPr, setOpenPr] = useState(workflow.openPrOnImplementationComplete);
  const [pushOnComplete, setPushOnComplete] = useState(
    workflow.approvalGateDefaults.pushOnImplementationComplete
  );
  const [allowPrd, setAllowPrd] = useState(workflow.approvalGateDefaults.allowPrd);
  const [allowPlan, setAllowPlan] = useState(workflow.approvalGateDefaults.allowPlan);
  const [allowMerge, setAllowMerge] = useState(workflow.approvalGateDefaults.allowMerge);
  const [ciMaxFix, setCiMaxFix] = useState(
    workflow.ciMaxFixAttempts != null ? String(workflow.ciMaxFixAttempts) : ''
  );
  const [ciTimeout, setCiTimeout] = useState(
    workflow.ciWatchTimeoutMs != null ? String(workflow.ciWatchTimeoutMs) : ''
  );
  const [ciLogMax, setCiLogMax] = useState(
    workflow.ciLogMaxChars != null ? String(workflow.ciLogMaxChars) : ''
  );
  const [isPending, startTransition] = useTransition();

  const isDirty =
    openPr !== workflow.openPrOnImplementationComplete ||
    pushOnComplete !== workflow.approvalGateDefaults.pushOnImplementationComplete ||
    allowPrd !== workflow.approvalGateDefaults.allowPrd ||
    allowPlan !== workflow.approvalGateDefaults.allowPlan ||
    allowMerge !== workflow.approvalGateDefaults.allowMerge ||
    ciMaxFix !== (workflow.ciMaxFixAttempts != null ? String(workflow.ciMaxFixAttempts) : '') ||
    ciTimeout !== (workflow.ciWatchTimeoutMs != null ? String(workflow.ciWatchTimeoutMs) : '') ||
    ciLogMax !== (workflow.ciLogMaxChars != null ? String(workflow.ciLogMaxChars) : '');

  function parseOptionalInt(value: string): number | undefined {
    if (value === '') return undefined;
    const n = parseInt(value, 10);
    return Number.isNaN(n) || n <= 0 ? undefined : n;
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateSettingsAction({
        workflow: {
          openPrOnImplementationComplete: openPr,
          approvalGateDefaults: {
            pushOnImplementationComplete: pushOnComplete,
            allowPrd,
            allowPlan,
            allowMerge,
          },
          ciMaxFixAttempts: parseOptionalInt(ciMaxFix),
          ciWatchTimeoutMs: parseOptionalInt(ciTimeout),
          ciLogMaxChars: parseOptionalInt(ciLogMax),
        },
      });
      if (result.success) {
        toast.success('Workflow settings saved');
      } else {
        toast.error(result.error ?? 'Failed to save workflow settings');
      }
    });
  }

  return (
    <Card data-testid="workflow-settings-section">
      <CardHeader>
        <CardTitle>Workflow</CardTitle>
        <CardDescription>Configure PR behavior, approval gates, and CI settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="open-pr">Open PR on implementation complete</Label>
            <Switch
              id="open-pr"
              data-testid="switch-open-pr"
              checked={openPr}
              onCheckedChange={setOpenPr}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="push-on-complete">Push on implementation complete</Label>
            <Switch
              id="push-on-complete"
              data-testid="switch-push-on-complete"
              checked={pushOnComplete}
              onCheckedChange={setPushOnComplete}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-muted-foreground text-sm font-medium">Approval Gates</p>
          <div className="flex items-center justify-between">
            <Label htmlFor="allow-prd">Allow PRD auto-approval</Label>
            <Switch
              id="allow-prd"
              data-testid="switch-allow-prd"
              checked={allowPrd}
              onCheckedChange={setAllowPrd}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="allow-plan">Allow Plan auto-approval</Label>
            <Switch
              id="allow-plan"
              data-testid="switch-allow-plan"
              checked={allowPlan}
              onCheckedChange={setAllowPlan}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="allow-merge">Allow Merge auto-approval</Label>
            <Switch
              id="allow-merge"
              data-testid="switch-allow-merge"
              checked={allowMerge}
              onCheckedChange={setAllowMerge}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-muted-foreground text-sm font-medium">CI Settings</p>
          <div className="space-y-2">
            <Label htmlFor="ci-max-fix">Max fix attempts</Label>
            <Input
              id="ci-max-fix"
              data-testid="ci-max-fix-input"
              type="number"
              min="1"
              placeholder="Unset"
              value={ciMaxFix}
              onChange={(e) => setCiMaxFix(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ci-timeout">Watch timeout (ms)</Label>
            <Input
              id="ci-timeout"
              data-testid="ci-timeout-input"
              type="number"
              min="1"
              placeholder="Unset"
              value={ciTimeout}
              onChange={(e) => setCiTimeout(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ci-log-max">Log max chars</Label>
            <Input
              id="ci-log-max"
              data-testid="ci-log-max-input"
              type="number"
              min="1"
              placeholder="Unset"
              value={ciLogMax}
              onChange={(e) => setCiLogMax(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!isDirty || isPending}
          data-testid="workflow-save-button"
        >
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}
