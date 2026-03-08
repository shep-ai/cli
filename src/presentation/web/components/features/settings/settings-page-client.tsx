'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateSettingsAction } from '@/app/actions/update-settings';
import { type AgentType, AgentAuthMethod, EditorType } from '@shepai/core/domain/generated/output';
import { getEditorTypeIcon } from '@/components/common/editor-type-icons';
import { AgentModelPicker } from '@/components/features/settings/AgentModelPicker';
import type {
  Settings,
  FeatureFlags,
  NotificationPreferences,
} from '@shepai/core/domain/generated/output';

const AUTH_METHOD_OPTIONS = [
  { value: AgentAuthMethod.Session, label: 'Session' },
  { value: AgentAuthMethod.Token, label: 'Token' },
];

const EDITOR_OPTIONS = [
  { value: EditorType.VsCode, label: 'VS Code' },
  { value: EditorType.Cursor, label: 'Cursor' },
  { value: EditorType.Windsurf, label: 'Windsurf' },
  { value: EditorType.Zed, label: 'Zed' },
  { value: EditorType.Antigravity, label: 'Antigravity' },
];

export interface SettingsPageClientProps {
  settings: Settings;
  shepHome: string;
  dbFileSize: string;
}

function useSaveIndicator() {
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

  const save = useCallback(
    (payload: Record<string, unknown>) => {
      startTransition(async () => {
        const result = await updateSettingsAction(payload);
        if (!result.success) {
          toast.error(result.error ?? 'Failed to save settings');
        }
      });
    },
    [startTransition]
  );

  return { isPending, showSaved, save };
}

function SettingsRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <Label htmlFor={htmlFor} className="cursor-pointer text-sm font-normal whitespace-nowrap">
        {label}
      </Label>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function SelectRow({
  label,
  id,
  testId,
  value,
  options,
  onChange,
}: {
  label: string;
  id: string;
  testId: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <SettingsRow label={label} htmlFor={id}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} data-testid={testId} className="w-45 cursor-pointer">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsRow>
  );
}

function SwitchRow({
  label,
  id,
  testId,
  checked,
  onChange,
}: {
  label: string;
  id: string;
  testId: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <SettingsRow label={label} htmlFor={id}>
      <Switch
        id={id}
        data-testid={testId}
        checked={checked}
        onCheckedChange={onChange}
        className="cursor-pointer"
      />
    </SettingsRow>
  );
}

export function SettingsPageClient({ settings, shepHome, dbFileSize }: SettingsPageClientProps) {
  const { isPending, showSaved, save } = useSaveIndicator();
  const featureFlags = settings.featureFlags ?? { skills: false, envDeploy: false, debug: false };

  // Agent state
  const [agentType, setAgentType] = useState(settings.agent.type);
  const [authMethod, setAuthMethod] = useState(settings.agent.authMethod);
  const [token, setToken] = useState(settings.agent.token ?? '');
  const [showToken, setShowToken] = useState(false);

  // Environment state
  const [editor, setEditor] = useState(settings.environment.defaultEditor);
  const shell = settings.environment.shellPreference;

  // Workflow state
  const [openPr, setOpenPr] = useState(settings.workflow.openPrOnImplementationComplete);
  const [pushOnComplete, setPushOnComplete] = useState(
    settings.workflow.approvalGateDefaults.pushOnImplementationComplete
  );
  const [allowPrd, setAllowPrd] = useState(settings.workflow.approvalGateDefaults.allowPrd);
  const [allowPlan, setAllowPlan] = useState(settings.workflow.approvalGateDefaults.allowPlan);
  const [allowMerge, setAllowMerge] = useState(settings.workflow.approvalGateDefaults.allowMerge);
  const [ciMaxFix, setCiMaxFix] = useState(
    settings.workflow.ciMaxFixAttempts != null ? String(settings.workflow.ciMaxFixAttempts) : ''
  );
  const [ciTimeout, setCiTimeout] = useState(
    settings.workflow.ciWatchTimeoutMs != null
      ? String(Math.round(settings.workflow.ciWatchTimeoutMs / 1000))
      : ''
  );
  const [ciLogMax, setCiLogMax] = useState(
    settings.workflow.ciLogMaxChars != null ? String(settings.workflow.ciLogMaxChars) : ''
  );

  // Notification state
  const [inApp, setInApp] = useState(settings.notifications.inApp.enabled);
  const [browser, setBrowser] = useState(settings.notifications.browser.enabled);
  const [desktop, setDesktop] = useState(settings.notifications.desktop.enabled);
  const [events, setEvents] = useState({ ...settings.notifications.events });

  // Feature flags state
  const [flags, setFlags] = useState<FeatureFlags>({ ...featureFlags });

  // Original CI values for blur comparison
  const originalCiMaxFix =
    settings.workflow.ciMaxFixAttempts != null ? String(settings.workflow.ciMaxFixAttempts) : '';
  const originalCiTimeout =
    settings.workflow.ciWatchTimeoutMs != null
      ? String(Math.round(settings.workflow.ciWatchTimeoutMs / 1000))
      : '';
  const originalCiLogMax =
    settings.workflow.ciLogMaxChars != null ? String(settings.workflow.ciLogMaxChars) : '';

  function parseOptionalInt(value: string): number | undefined {
    if (value === '') return undefined;
    const n = parseInt(value, 10);
    return Number.isNaN(n) || n <= 0 ? undefined : n;
  }

  // Agent helpers
  function buildAgentPayload(overrides: Partial<typeof settings.agent> = {}) {
    const merged = { type: agentType, authMethod, ...overrides };
    const result: Record<string, unknown> = { type: merged.type, authMethod: merged.authMethod };
    if (merged.authMethod === AgentAuthMethod.Token) {
      result.token = overrides.token ?? token;
    }
    return { agent: result };
  }

  // Workflow helpers
  function buildWorkflowPayload(
    overrides: {
      openPr?: boolean;
      pushOnComplete?: boolean;
      allowPrd?: boolean;
      allowPlan?: boolean;
      allowMerge?: boolean;
      ciMaxFix?: string;
      ciTimeout?: string;
      ciLogMax?: string;
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
      },
    };
  }

  // Notification helpers
  function buildNotificationPayload(
    overrides: {
      inApp?: boolean;
      browser?: boolean;
      desktop?: boolean;
      events?: NotificationPreferences['events'];
    } = {}
  ) {
    return {
      notifications: {
        inApp: { enabled: overrides.inApp ?? inApp },
        browser: { enabled: overrides.browser ?? browser },
        desktop: { enabled: overrides.desktop ?? desktop },
        events: overrides.events ?? events,
      },
    };
  }

  return (
    <div data-testid="settings-page-client" className="max-w-lg">
      <div className="flex items-center justify-between border-b pb-3">
        <h1 className="text-sm font-bold tracking-tight">Settings</h1>
        {isPending ? <span className="text-muted-foreground text-xs">Saving...</span> : null}
        {showSaved && !isPending ? (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3 w-3" />
            Saved
          </span>
        ) : null}
      </div>

      <div>
        <h2
          className="text-muted-foreground mt-6 mb-1 text-xs font-medium tracking-wide uppercase"
          data-testid="agent-settings-section"
        >
          Agent
        </h2>
        <SettingsRow label="Agent & Model" htmlFor="agent-model-picker">
          <AgentModelPicker
            initialAgentType={agentType}
            initialModel={settings.models.default}
            mode="settings"
            onAgentModelChange={(newAgent) => setAgentType(newAgent as AgentType)}
            className="w-45"
          />
        </SettingsRow>
        <SelectRow
          label="Authentication"
          id="auth-method"
          testId="auth-method-select"
          value={authMethod}
          options={AUTH_METHOD_OPTIONS}
          onChange={(v) => {
            setAuthMethod(v as AgentAuthMethod);
            save(buildAgentPayload({ authMethod: v as AgentAuthMethod }));
          }}
        />
        {authMethod === AgentAuthMethod.Token && (
          <SettingsRow label="API Token" htmlFor="agent-token">
            <div className="relative w-45">
              <Input
                id="agent-token"
                data-testid="agent-token-input"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onBlur={() => {
                  if (token !== (settings.agent.token ?? '')) {
                    save(buildAgentPayload({ token }));
                  }
                }}
                placeholder="Enter token"
                className="pr-8"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-full px-2 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
                data-testid="toggle-token-visibility"
                aria-label={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
          </SettingsRow>
        )}

        <h2
          className="text-muted-foreground mt-6 mb-1 text-xs font-medium tracking-wide uppercase"
          data-testid="environment-settings-section"
        >
          Environment
        </h2>
        <SettingsRow label="Editor" htmlFor="default-editor">
          <Select
            value={editor}
            onValueChange={(v) => {
              setEditor(v as EditorType);
              save({ environment: { defaultEditor: v as EditorType, shellPreference: shell } });
            }}
          >
            <SelectTrigger
              id="default-editor"
              data-testid="editor-select"
              className="w-45 cursor-pointer"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDITOR_OPTIONS.map((opt) => {
                const Icon = getEditorTypeIcon(opt.value);
                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      {opt.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </SettingsRow>

        <h2
          className="text-muted-foreground mt-6 mb-1 text-xs font-medium tracking-wide uppercase"
          data-testid="workflow-settings-section"
        >
          Workflow
        </h2>
        <SwitchRow
          label="Open PR on complete"
          id="open-pr"
          testId="switch-open-pr"
          checked={openPr}
          onChange={(v) => {
            setOpenPr(v);
            save(buildWorkflowPayload({ openPr: v }));
          }}
        />
        <SwitchRow
          label="Push on complete"
          id="push-on-complete"
          testId="switch-push-on-complete"
          checked={pushOnComplete}
          onChange={(v) => {
            setPushOnComplete(v);
            save(buildWorkflowPayload({ pushOnComplete: v }));
          }}
        />
        <SwitchRow
          label="Auto-approve PRD"
          id="allow-prd"
          testId="switch-allow-prd"
          checked={allowPrd}
          onChange={(v) => {
            setAllowPrd(v);
            save(buildWorkflowPayload({ allowPrd: v }));
          }}
        />
        <SwitchRow
          label="Auto-approve Plan"
          id="allow-plan"
          testId="switch-allow-plan"
          checked={allowPlan}
          onChange={(v) => {
            setAllowPlan(v);
            save(buildWorkflowPayload({ allowPlan: v }));
          }}
        />
        <SwitchRow
          label="Auto-approve Merge"
          id="allow-merge"
          testId="switch-allow-merge"
          checked={allowMerge}
          onChange={(v) => {
            setAllowMerge(v);
            save(buildWorkflowPayload({ allowMerge: v }));
          }}
        />

        <h2
          className="text-muted-foreground mt-6 mb-1 text-xs font-medium tracking-wide uppercase"
          data-testid="ci-settings-section"
        >
          CI
        </h2>
        <SettingsRow label="Max fix attempts" htmlFor="ci-max-fix">
          <Input
            id="ci-max-fix"
            data-testid="ci-max-fix-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="3"
            value={ciMaxFix}
            onChange={(e) => setCiMaxFix(e.target.value)}
            onBlur={() => {
              if (ciMaxFix !== originalCiMaxFix) save(buildWorkflowPayload({ ciMaxFix }));
            }}
            className="w-20"
          />
        </SettingsRow>
        <SettingsRow label="Watch timeout (s)" htmlFor="ci-timeout">
          <Input
            id="ci-timeout"
            data-testid="ci-timeout-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="300"
            value={ciTimeout}
            onChange={(e) => setCiTimeout(e.target.value)}
            onBlur={() => {
              if (ciTimeout !== originalCiTimeout) save(buildWorkflowPayload({ ciTimeout }));
            }}
            className="w-20"
          />
        </SettingsRow>
        <SettingsRow label="Max log chars" htmlFor="ci-log-max">
          <Input
            id="ci-log-max"
            data-testid="ci-log-max-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="50000"
            value={ciLogMax}
            onChange={(e) => setCiLogMax(e.target.value)}
            onBlur={() => {
              if (ciLogMax !== originalCiLogMax) save(buildWorkflowPayload({ ciLogMax }));
            }}
            className="w-20"
          />
        </SettingsRow>

        <h2
          className="text-muted-foreground mt-6 mb-1 text-xs font-medium tracking-wide uppercase"
          data-testid="notification-settings-section"
        >
          Notifications
        </h2>
        <SwitchRow
          label="In-app"
          id="notif-in-app"
          testId="switch-in-app"
          checked={inApp}
          onChange={(v) => {
            setInApp(v);
            save(buildNotificationPayload({ inApp: v }));
          }}
        />
        <SwitchRow
          label="Browser"
          id="notif-browser"
          testId="switch-browser"
          checked={browser}
          onChange={(v) => {
            setBrowser(v);
            save(buildNotificationPayload({ browser: v }));
          }}
        />
        <SwitchRow
          label="Desktop"
          id="notif-desktop"
          testId="switch-desktop"
          checked={desktop}
          onChange={(v) => {
            setDesktop(v);
            save(buildNotificationPayload({ desktop: v }));
          }}
        />
        <SwitchRow
          label="Agent started"
          id="notif-event-agentStarted"
          testId="switch-event-agentStarted"
          checked={events.agentStarted}
          onChange={(v) => {
            const newEvents = { ...events, agentStarted: v };
            setEvents(newEvents);
            save(buildNotificationPayload({ events: newEvents }));
          }}
        />
        <SwitchRow
          label="Phase completed"
          id="notif-event-phaseCompleted"
          testId="switch-event-phaseCompleted"
          checked={events.phaseCompleted}
          onChange={(v) => {
            const newEvents = { ...events, phaseCompleted: v };
            setEvents(newEvents);
            save(buildNotificationPayload({ events: newEvents }));
          }}
        />
        <SwitchRow
          label="Waiting approval"
          id="notif-event-waitingApproval"
          testId="switch-event-waitingApproval"
          checked={events.waitingApproval}
          onChange={(v) => {
            const newEvents = { ...events, waitingApproval: v };
            setEvents(newEvents);
            save(buildNotificationPayload({ events: newEvents }));
          }}
        />
        <SwitchRow
          label="Agent completed"
          id="notif-event-agentCompleted"
          testId="switch-event-agentCompleted"
          checked={events.agentCompleted}
          onChange={(v) => {
            const newEvents = { ...events, agentCompleted: v };
            setEvents(newEvents);
            save(buildNotificationPayload({ events: newEvents }));
          }}
        />
        <SwitchRow
          label="Agent failed"
          id="notif-event-agentFailed"
          testId="switch-event-agentFailed"
          checked={events.agentFailed}
          onChange={(v) => {
            const newEvents = { ...events, agentFailed: v };
            setEvents(newEvents);
            save(buildNotificationPayload({ events: newEvents }));
          }}
        />
        <SwitchRow
          label="PR merged"
          id="notif-event-prMerged"
          testId="switch-event-prMerged"
          checked={events.prMerged}
          onChange={(v) => {
            const newEvents = { ...events, prMerged: v };
            setEvents(newEvents);
            save(buildNotificationPayload({ events: newEvents }));
          }}
        />
        <SwitchRow
          label="PR closed"
          id="notif-event-prClosed"
          testId="switch-event-prClosed"
          checked={events.prClosed}
          onChange={(v) => {
            const newEvents = { ...events, prClosed: v };
            setEvents(newEvents);
            save(buildNotificationPayload({ events: newEvents }));
          }}
        />
        <SwitchRow
          label="PR checks passed"
          id="notif-event-prChecksPassed"
          testId="switch-event-prChecksPassed"
          checked={events.prChecksPassed}
          onChange={(v) => {
            const newEvents = { ...events, prChecksPassed: v };
            setEvents(newEvents);
            save(buildNotificationPayload({ events: newEvents }));
          }}
        />
        <SwitchRow
          label="PR checks failed"
          id="notif-event-prChecksFailed"
          testId="switch-event-prChecksFailed"
          checked={events.prChecksFailed}
          onChange={(v) => {
            const newEvents = { ...events, prChecksFailed: v };
            setEvents(newEvents);
            save(buildNotificationPayload({ events: newEvents }));
          }}
        />

        <h2
          className="text-muted-foreground mt-6 mb-1 text-xs font-medium tracking-wide uppercase"
          data-testid="feature-flags-settings-section"
        >
          Feature Flags
        </h2>
        <SwitchRow
          label="Skills"
          id="flag-skills"
          testId="switch-flag-skills"
          checked={flags.skills}
          onChange={(v) => {
            const newFlags = { ...flags, skills: v };
            setFlags(newFlags);
            save({ featureFlags: newFlags });
          }}
        />
        <SwitchRow
          label="Deployments"
          id="flag-envDeploy"
          testId="switch-flag-envDeploy"
          checked={flags.envDeploy}
          onChange={(v) => {
            const newFlags = { ...flags, envDeploy: v };
            setFlags(newFlags);
            save({ featureFlags: newFlags });
          }}
        />
        <SwitchRow
          label="Debug"
          id="flag-debug"
          testId="switch-flag-debug"
          checked={flags.debug}
          onChange={(v) => {
            const newFlags = { ...flags, debug: v };
            setFlags(newFlags);
            save({ featureFlags: newFlags });
          }}
        />

        <h2
          className="text-muted-foreground mt-6 mb-1 text-xs font-medium tracking-wide uppercase"
          data-testid="database-settings-section"
        >
          Database
        </h2>
        <SettingsRow label="Location">
          <span
            className="text-muted-foreground max-w-50 truncate font-mono text-xs"
            data-testid="shep-home-path"
          >
            {shepHome}
          </span>
        </SettingsRow>
        <SettingsRow label="Size">
          <span className="text-muted-foreground text-xs" data-testid="db-file-size">
            {dbFileSize}
          </span>
        </SettingsRow>
      </div>
    </div>
  );
}
