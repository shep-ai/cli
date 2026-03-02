'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Loader2, Eye, EyeOff, Settings } from 'lucide-react';
import { toast } from 'sonner';
import type { Settings as SettingsType } from '@shepai/core/domain/generated/output';
import { EditorType, AgentType, AgentAuthMethod } from '@shepai/core/domain/generated/output';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { settingsFormSchema, type SettingsFormValues } from './settings-schema';

export interface SettingsPageClientProps {
  settings: SettingsType;
  className?: string;
}

export function SettingsPageClient({ settings, className }: SettingsPageClientProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<SettingsFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(settingsFormSchema) as any,
    defaultValues: {
      models: settings.models,
      user: {
        name: settings.user.name ?? '',
        email: settings.user.email ?? '',
        githubUsername: settings.user.githubUsername ?? '',
      },
      environment: settings.environment,
      system: settings.system,
      agent: {
        type: settings.agent.type,
        authMethod: settings.agent.authMethod,
        token: settings.agent.token ?? '',
      },
      notifications: settings.notifications,
      workflow: settings.workflow,
    },
  });

  const { isDirty } = form.formState;

  // Warn on unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    if (isDirty) {
      window.addEventListener('beforeunload', handler);
    }
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const onSubmit = useCallback(
    async (values: SettingsFormValues) => {
      setIsSaving(true);
      try {
        const payload = {
          id: settings.id,
          createdAt: settings.createdAt,
          updatedAt: settings.updatedAt,
          onboardingComplete: settings.onboardingComplete,
          ...values,
        };
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Failed to save settings');
        }
        const updated = await res.json();
        form.reset({
          models: updated.models,
          user: {
            name: updated.user.name ?? '',
            email: updated.user.email ?? '',
            githubUsername: updated.user.githubUsername ?? '',
          },
          environment: updated.environment,
          system: updated.system,
          agent: {
            type: updated.agent.type,
            authMethod: updated.agent.authMethod,
            token: updated.agent.token ?? '',
          },
          notifications: updated.notifications,
          workflow: updated.workflow,
        });
        toast.success('Settings saved');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save settings');
      } finally {
        setIsSaving(false);
      }
    },
    [settings, form]
  );

  return (
    <div data-testid="settings-page-client" className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="text-muted-foreground h-4 w-4" />
          <h1 className="text-sm font-bold tracking-tight">Settings</h1>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!isDirty || isSaving}
          variant={isDirty ? 'default' : 'outline'}
          data-testid="settings-save-button"
          onClick={form.handleSubmit(onSubmit)}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="models" data-testid="settings-tabs">
            <TabsList>
              <TabsTrigger value="models" data-testid="settings-tab-models">
                Models
              </TabsTrigger>
              <TabsTrigger value="profile" data-testid="settings-tab-profile">
                Profile
              </TabsTrigger>
              <TabsTrigger value="environment" data-testid="settings-tab-environment">
                Environment
              </TabsTrigger>
              <TabsTrigger value="system" data-testid="settings-tab-system">
                System
              </TabsTrigger>
              <TabsTrigger value="agent" data-testid="settings-tab-agent">
                Agent
              </TabsTrigger>
              <TabsTrigger value="notifications" data-testid="settings-tab-notifications">
                Notifications
              </TabsTrigger>
              <TabsTrigger value="workflow" data-testid="settings-tab-workflow">
                Workflow
              </TabsTrigger>
            </TabsList>

            <TabsContent value="models">
              <ModelsSection form={form} />
            </TabsContent>
            <TabsContent value="profile">
              <ProfileSection form={form} />
            </TabsContent>
            <TabsContent value="environment">
              <EnvironmentSection form={form} />
            </TabsContent>
            <TabsContent value="system">
              <SystemSection form={form} />
            </TabsContent>
            <TabsContent value="agent">
              <AgentSection form={form} />
            </TabsContent>
            <TabsContent value="notifications">
              <NotificationsSection form={form} />
            </TabsContent>
            <TabsContent value="workflow">
              <WorkflowSection form={form} />
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}

// --- Section Components ---

interface SectionProps {
  form: UseFormReturn<SettingsFormValues, unknown, SettingsFormValues>;
}

function ModelsSection({ form }: SectionProps) {
  const models: {
    key: 'models.analyze' | 'models.requirements' | 'models.plan' | 'models.implement';
    label: string;
    description: string;
  }[] = [
    {
      key: 'models.analyze',
      label: 'Analyze Model',
      description: 'Model used for repository analysis',
    },
    {
      key: 'models.requirements',
      label: 'Requirements Model',
      description: 'Model used for requirements gathering',
    },
    {
      key: 'models.plan',
      label: 'Plan Model',
      description: 'Model used for implementation planning',
    },
    {
      key: 'models.implement',
      label: 'Implement Model',
      description: 'Model used for code implementation',
    },
  ];

  return (
    <div className="space-y-4 pt-4" data-testid="settings-section-models">
      {models.map(({ key, label, description }) => (
        <FormField
          key={key}
          control={form.control}
          name={key}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <Input placeholder="e.g. claude-sonnet-4-5" {...field} />
              </FormControl>
              <FormDescription>{description}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}

function ProfileSection({ form }: SectionProps) {
  return (
    <div className="space-y-4 pt-4" data-testid="settings-section-profile">
      <FormField
        control={form.control}
        name="user.name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Your name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="user.email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="you@example.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="user.githubUsername"
        render={({ field }) => (
          <FormItem>
            <FormLabel>GitHub Username</FormLabel>
            <FormControl>
              <Input placeholder="your-username" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

const EDITOR_LABELS: Record<string, string> = {
  [EditorType.VsCode]: 'VS Code',
  [EditorType.Cursor]: 'Cursor',
  [EditorType.Windsurf]: 'Windsurf',
  [EditorType.Zed]: 'Zed',
  [EditorType.Antigravity]: 'Antigravity',
};

function EnvironmentSection({ form }: SectionProps) {
  return (
    <div className="space-y-4 pt-4" data-testid="settings-section-environment">
      <FormField
        control={form.control}
        name="environment.defaultEditor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Default Editor</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select an editor" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(EditorType).map((editor) => (
                  <SelectItem key={editor} value={editor}>
                    {EDITOR_LABELS[editor] ?? editor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="environment.shellPreference"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Shell Preference</FormLabel>
            <FormControl>
              <Input placeholder="bash" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

function SystemSection({ form }: SectionProps) {
  return (
    <div className="space-y-4 pt-4" data-testid="settings-section-system">
      <FormField
        control={form.control}
        name="system.autoUpdate"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FormLabel>Auto Update</FormLabel>
              <FormDescription>
                Automatically update Shep when new versions are available
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="system.logLevel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Log Level</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select log level" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {LOG_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

const AGENT_TYPE_LABELS: Record<string, string> = {
  [AgentType.ClaudeCode]: 'Claude Code',
  [AgentType.GeminiCli]: 'Gemini CLI',
  [AgentType.Aider]: 'Aider',
  [AgentType.Continue]: 'Continue',
  [AgentType.Cursor]: 'Cursor',
  [AgentType.Dev]: 'Dev',
};

const AUTH_METHOD_LABELS: Record<string, string> = {
  [AgentAuthMethod.Session]: 'Session',
  [AgentAuthMethod.Token]: 'Token',
};

function AgentSection({ form }: SectionProps) {
  const [showToken, setShowToken] = useState(false);
  const authMethod = useWatch({ control: form.control, name: 'agent.authMethod' });

  return (
    <div className="space-y-4 pt-4" data-testid="settings-section-agent">
      <FormField
        control={form.control}
        name="agent.type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Agent Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(AgentType).map((agent) => (
                  <SelectItem key={agent} value={agent}>
                    {AGENT_TYPE_LABELS[agent] ?? agent}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="agent.authMethod"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Auth Method</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select auth method" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(AgentAuthMethod).map((method) => (
                  <SelectItem key={method} value={method}>
                    {AUTH_METHOD_LABELS[method] ?? method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {authMethod === AgentAuthMethod.Token && (
        <FormField
          control={form.control}
          name="agent.token"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Token</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Enter your API token"
                    {...field}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowToken((prev) => !prev)}
                  data-testid="token-reveal-toggle"
                  aria-label={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}

const CHANNEL_ITEMS = [
  { key: 'notifications.inApp.enabled' as const, label: 'In-App' },
  { key: 'notifications.browser.enabled' as const, label: 'Browser' },
  { key: 'notifications.desktop.enabled' as const, label: 'Desktop' },
];

const EVENT_ITEMS = [
  { key: 'notifications.events.agentStarted' as const, label: 'Agent Started' },
  { key: 'notifications.events.phaseCompleted' as const, label: 'Phase Completed' },
  { key: 'notifications.events.waitingApproval' as const, label: 'Waiting Approval' },
  { key: 'notifications.events.agentCompleted' as const, label: 'Agent Completed' },
  { key: 'notifications.events.agentFailed' as const, label: 'Agent Failed' },
  { key: 'notifications.events.prMerged' as const, label: 'PR Merged' },
  { key: 'notifications.events.prClosed' as const, label: 'PR Closed' },
  { key: 'notifications.events.prChecksPassed' as const, label: 'PR Checks Passed' },
  { key: 'notifications.events.prChecksFailed' as const, label: 'PR Checks Failed' },
];

function NotificationsSection({ form }: SectionProps) {
  return (
    <div className="space-y-4 pt-4" data-testid="settings-section-notifications">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Channels</h3>
        {CHANNEL_ITEMS.map(({ key, label }) => (
          <FormField
            key={key}
            control={form.control}
            name={key}
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="font-normal">{label}</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        ))}
      </div>
      <Separator />
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Events</h3>
        {EVENT_ITEMS.map(({ key, label }) => (
          <FormField
            key={key}
            control={form.control}
            name={key}
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="font-normal">{label}</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  );
}

const APPROVAL_GATE_ITEMS = [
  { key: 'workflow.approvalGateDefaults.allowPrd' as const, label: 'Allow PRD' },
  { key: 'workflow.approvalGateDefaults.allowPlan' as const, label: 'Allow Plan' },
  { key: 'workflow.approvalGateDefaults.allowMerge' as const, label: 'Allow Merge' },
  {
    key: 'workflow.approvalGateDefaults.pushOnImplementationComplete' as const,
    label: 'Push on Implementation Complete',
  },
];

function WorkflowSection({ form }: SectionProps) {
  return (
    <div className="space-y-4 pt-4" data-testid="settings-section-workflow">
      <FormField
        control={form.control}
        name="workflow.openPrOnImplementationComplete"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FormLabel>Open PR on Implementation Complete</FormLabel>
              <FormDescription>
                Automatically create a pull request when implementation finishes
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <Separator />

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Approval Gates</h3>
        {APPROVAL_GATE_ITEMS.map(({ key, label }) => (
          <FormField
            key={key}
            control={form.control}
            name={key}
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="font-normal">{label}</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        ))}
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-medium">CI Configuration</h3>
        <FormField
          control={form.control}
          name="workflow.ciMaxFixAttempts"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Fix Attempts</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g. 3"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                  }
                />
              </FormControl>
              <FormDescription>Maximum number of CI fix attempts</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="workflow.ciWatchTimeoutMs"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Watch Timeout (ms)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g. 600000"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                  }
                />
              </FormControl>
              <FormDescription>CI watch timeout in milliseconds</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="workflow.ciLogMaxChars"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Log Max Characters</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                  }
                />
              </FormControl>
              <FormDescription>Maximum characters to capture from CI logs</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
