'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { GitBranch, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
    workflow.ciWatchTimeoutMs != null ? String(Math.round(workflow.ciWatchTimeoutMs / 1000)) : ''
  );
  const [ciLogMax, setCiLogMax] = useState(
    workflow.ciLogMaxChars != null ? String(workflow.ciLogMaxChars) : ''
  );
  // Per-stage timeout states (seconds for display)
  const st = workflow.stageTimeouts;
  const [analyzeTimeout, setAnalyzeTimeout] = useState(
    st?.analyzeMs != null ? String(Math.round(st.analyzeMs / 1000)) : ''
  );
  const [requirementsTimeout, setRequirementsTimeout] = useState(
    st?.requirementsMs != null ? String(Math.round(st.requirementsMs / 1000)) : ''
  );
  const [researchTimeout, setResearchTimeout] = useState(
    st?.researchMs != null ? String(Math.round(st.researchMs / 1000)) : ''
  );
  const [planTimeout, setPlanTimeout] = useState(
    st?.planMs != null ? String(Math.round(st.planMs / 1000)) : ''
  );
  const [implementTimeout, setImplementTimeout] = useState(
    st?.implementMs != null ? String(Math.round(st.implementMs / 1000)) : ''
  );
  const [mergeTimeout, setMergeTimeout] = useState(
    st?.mergeMs != null ? String(Math.round(st.mergeMs / 1000)) : ''
  );
  // Analyze-repo agent timeout state
  const art = workflow.analyzeRepoTimeouts;
  const [analyzeRepoTimeout, setAnalyzeRepoTimeout] = useState(
    art?.analyzeMs != null ? String(Math.round(art.analyzeMs / 1000)) : ''
  );
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

  function parseOptionalInt(value: string): number | undefined {
    if (value === '') return undefined;
    const n = parseInt(value, 10);
    return Number.isNaN(n) || n <= 0 ? undefined : n;
  }

  function secondsToMs(val: string): number | undefined {
    const n = parseOptionalInt(val);
    return n != null ? n * 1000 : undefined;
  }

  function buildPayload(
    overrides: {
      openPr?: boolean;
      pushOnComplete?: boolean;
      allowPrd?: boolean;
      allowPlan?: boolean;
      allowMerge?: boolean;
      ciMaxFix?: string;
      ciTimeout?: string;
      ciLogMax?: string;
      analyzeTimeout?: string;
      requirementsTimeout?: string;
      researchTimeout?: string;
      planTimeout?: string;
      implementTimeout?: string;
      mergeTimeout?: string;
      analyzeRepoTimeout?: string;
    } = {}
  ) {
    const timeoutSeconds = parseOptionalInt(overrides.ciTimeout ?? ciTimeout);
    return {
      workflow: {
        openPrOnImplementationComplete: overrides.openPr ?? openPr,
        approvalGateDefaults: {
          pushOnImplementationComplete: overrides.pushOnComplete ?? pushOnComplete,
          allowPrd: overrides.allowPrd ?? allowPrd,
          allowPlan: overrides.allowPlan ?? allowPlan,
          allowMerge: overrides.allowMerge ?? allowMerge,
        },
        ciMaxFixAttempts: parseOptionalInt(overrides.ciMaxFix ?? ciMaxFix),
        ciWatchTimeoutMs: timeoutSeconds != null ? timeoutSeconds * 1000 : undefined,
        ciLogMaxChars: parseOptionalInt(overrides.ciLogMax ?? ciLogMax),
        stageTimeouts: {
          analyzeMs: secondsToMs(overrides.analyzeTimeout ?? analyzeTimeout),
          requirementsMs: secondsToMs(overrides.requirementsTimeout ?? requirementsTimeout),
          researchMs: secondsToMs(overrides.researchTimeout ?? researchTimeout),
          planMs: secondsToMs(overrides.planTimeout ?? planTimeout),
          implementMs: secondsToMs(overrides.implementTimeout ?? implementTimeout),
          mergeMs: secondsToMs(overrides.mergeTimeout ?? mergeTimeout),
        },
        analyzeRepoTimeouts: {
          analyzeMs: secondsToMs(overrides.analyzeRepoTimeout ?? analyzeRepoTimeout),
        },
      },
    };
  }

  function save(overrides: Parameters<typeof buildPayload>[0] = {}) {
    startTransition(async () => {
      const result = await updateSettingsAction(buildPayload(overrides));
      if (!result.success) {
        toast.error(result.error ?? 'Failed to save workflow settings');
      }
    });
  }

  function handleSwitchChange(
    key: 'openPr' | 'pushOnComplete' | 'allowPrd' | 'allowPlan' | 'allowMerge',
    setter: (v: boolean) => void,
    value: boolean
  ) {
    setter(value);
    save({ [key]: value });
  }

  type BlurKey =
    | 'ciMaxFix'
    | 'ciTimeout'
    | 'ciLogMax'
    | 'analyzeTimeout'
    | 'requirementsTimeout'
    | 'researchTimeout'
    | 'planTimeout'
    | 'implementTimeout'
    | 'mergeTimeout'
    | 'analyzeRepoTimeout';

  function handleFieldBlur(key: BlurKey, currentValue: string, originalValue: string) {
    if (currentValue !== originalValue) {
      save({ [key]: currentValue });
    }
  }

  const originalCiMaxFix =
    workflow.ciMaxFixAttempts != null ? String(workflow.ciMaxFixAttempts) : '';
  const originalCiTimeout =
    workflow.ciWatchTimeoutMs != null ? String(Math.round(workflow.ciWatchTimeoutMs / 1000)) : '';
  const originalCiLogMax = workflow.ciLogMaxChars != null ? String(workflow.ciLogMaxChars) : '';
  const originalAnalyzeTimeout =
    st?.analyzeMs != null ? String(Math.round(st.analyzeMs / 1000)) : '';
  const originalRequirementsTimeout =
    st?.requirementsMs != null ? String(Math.round(st.requirementsMs / 1000)) : '';
  const originalResearchTimeout =
    st?.researchMs != null ? String(Math.round(st.researchMs / 1000)) : '';
  const originalPlanTimeout = st?.planMs != null ? String(Math.round(st.planMs / 1000)) : '';
  const originalImplementTimeout =
    st?.implementMs != null ? String(Math.round(st.implementMs / 1000)) : '';
  const originalMergeTimeout = st?.mergeMs != null ? String(Math.round(st.mergeMs / 1000)) : '';
  const originalAnalyzeRepoTimeout =
    art?.analyzeMs != null ? String(Math.round(art.analyzeMs / 1000)) : '';

  const FEATURE_AGENT_FIELDS = [
    {
      key: 'analyzeTimeout' as const,
      label: 'Analyze',
      state: analyzeTimeout,
      setter: setAnalyzeTimeout,
      original: originalAnalyzeTimeout,
    },
    {
      key: 'requirementsTimeout' as const,
      label: 'Requirements',
      state: requirementsTimeout,
      setter: setRequirementsTimeout,
      original: originalRequirementsTimeout,
    },
    {
      key: 'researchTimeout' as const,
      label: 'Research',
      state: researchTimeout,
      setter: setResearchTimeout,
      original: originalResearchTimeout,
    },
    {
      key: 'planTimeout' as const,
      label: 'Plan',
      state: planTimeout,
      setter: setPlanTimeout,
      original: originalPlanTimeout,
    },
    {
      key: 'implementTimeout' as const,
      label: 'Implement',
      state: implementTimeout,
      setter: setImplementTimeout,
      original: originalImplementTimeout,
    },
    {
      key: 'mergeTimeout' as const,
      label: 'Merge',
      state: mergeTimeout,
      setter: setMergeTimeout,
      original: originalMergeTimeout,
    },
  ];

  const ANALYZE_REPO_FIELDS = [
    {
      key: 'analyzeRepoTimeout' as const,
      label: 'Analyze',
      state: analyzeRepoTimeout,
      setter: setAnalyzeRepoTimeout,
      original: originalAnalyzeRepoTimeout,
    },
  ];

  return (
    <Card id="workflow" className="scroll-mt-6" data-testid="workflow-settings-section">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="text-muted-foreground h-4 w-4" />
            <CardTitle>Workflow</CardTitle>
          </div>
          {isPending ? <span className="text-muted-foreground text-xs">Saving...</span> : null}
          {showSaved && !isPending ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" />
              Saved
            </span>
          ) : null}
        </div>
        <CardDescription>Configure PR behavior, approval gates, and CI settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="open-pr">Open PR on implementation complete</Label>
              <p className="text-muted-foreground text-xs">
                Automatically create a pull request when the agent finishes
              </p>
            </div>
            <Switch
              id="open-pr"
              data-testid="switch-open-pr"
              checked={openPr}
              onCheckedChange={(v) => handleSwitchChange('openPr', setOpenPr, v)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="push-on-complete">Push on implementation complete</Label>
              <p className="text-muted-foreground text-xs">
                Push the branch to remote when implementation is done
              </p>
            </div>
            <Switch
              id="push-on-complete"
              data-testid="switch-push-on-complete"
              checked={pushOnComplete}
              onCheckedChange={(v) => handleSwitchChange('pushOnComplete', setPushOnComplete, v)}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Approval Gates</h3>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="allow-prd">PRD auto-approval</Label>
              <p className="text-muted-foreground text-xs">
                Skip manual approval for product requirement documents
              </p>
            </div>
            <Switch
              id="allow-prd"
              data-testid="switch-allow-prd"
              checked={allowPrd}
              onCheckedChange={(v) => handleSwitchChange('allowPrd', setAllowPrd, v)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="allow-plan">Plan auto-approval</Label>
              <p className="text-muted-foreground text-xs">
                Skip manual approval for implementation plans
              </p>
            </div>
            <Switch
              id="allow-plan"
              data-testid="switch-allow-plan"
              checked={allowPlan}
              onCheckedChange={(v) => handleSwitchChange('allowPlan', setAllowPlan, v)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="allow-merge">Merge auto-approval</Label>
              <p className="text-muted-foreground text-xs">Skip manual approval for PR merges</p>
            </div>
            <Switch
              id="allow-merge"
              data-testid="switch-allow-merge"
              checked={allowMerge}
              onCheckedChange={(v) => handleSwitchChange('allowMerge', setAllowMerge, v)}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">CI Settings</h3>
          <div className="space-y-1.5">
            <Label htmlFor="ci-max-fix">Max fix attempts</Label>
            <Input
              id="ci-max-fix"
              data-testid="ci-max-fix-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              min={1}
              max={10}
              placeholder="e.g., 3"
              value={ciMaxFix}
              onChange={(e) => setCiMaxFix(e.target.value)}
              onBlur={() => handleFieldBlur('ciMaxFix', ciMaxFix, originalCiMaxFix)}
            />
            <p className="text-muted-foreground text-xs">
              How many times the agent retries fixing CI failures
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci-timeout">Watch timeout (seconds)</Label>
            <Input
              id="ci-timeout"
              data-testid="ci-timeout-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="e.g., 300"
              value={ciTimeout}
              onChange={(e) => setCiTimeout(e.target.value)}
              onBlur={() => handleFieldBlur('ciTimeout', ciTimeout, originalCiTimeout)}
            />
            <p className="text-muted-foreground text-xs">
              How long to wait for CI to complete before timing out
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci-log-max">Max log characters</Label>
            <Input
              id="ci-log-max"
              data-testid="ci-log-max-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="e.g., 50000"
              value={ciLogMax}
              onChange={(e) => setCiLogMax(e.target.value)}
              onBlur={() => handleFieldBlur('ciLogMax', ciLogMax, originalCiLogMax)}
            />
            <p className="text-muted-foreground text-xs">
              Maximum characters to capture from CI logs
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Stage Timeouts</h3>
          <p className="text-muted-foreground text-xs">
            Maximum execution time per agent stage (default: 600 seconds)
          </p>
          <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Feature Agent
          </h4>
          {FEATURE_AGENT_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`stage-timeout-${field.key}`}>{field.label} (seconds)</Label>
              <Input
                id={`stage-timeout-${field.key}`}
                data-testid={`stage-timeout-${field.key}-input`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="600"
                value={field.state}
                onChange={(e) => field.setter(e.target.value)}
                onBlur={() => handleFieldBlur(field.key, field.state, field.original)}
              />
            </div>
          ))}
          <h4 className="text-muted-foreground pt-2 text-xs font-semibold tracking-wider uppercase">
            Analyze Repository Agent
          </h4>
          {ANALYZE_REPO_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`stage-timeout-${field.key}`}>{field.label} (seconds)</Label>
              <Input
                id={`stage-timeout-${field.key}`}
                data-testid={`stage-timeout-${field.key}-input`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="600"
                value={field.state}
                onChange={(e) => field.setter(e.target.value)}
                onBlur={() => handleFieldBlur(field.key, field.state, field.original)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
