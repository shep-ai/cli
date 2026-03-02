import { describe, it, expect } from 'vitest';
import {
  settingsFormSchema,
  type SettingsFormValues,
} from '@/components/features/settings/settings-schema';
import { EditorType, AgentType, AgentAuthMethod } from '@shepai/core/domain/generated/output';

function makeValidSettings(): SettingsFormValues {
  return {
    models: {
      analyze: 'claude-sonnet-4-5',
      requirements: 'claude-sonnet-4-5',
      plan: 'claude-sonnet-4-5',
      implement: 'claude-sonnet-4-5',
    },
    user: {
      name: '',
      email: '',
      githubUsername: '',
    },
    environment: {
      defaultEditor: EditorType.VsCode,
      shellPreference: 'bash',
    },
    system: {
      autoUpdate: true,
      logLevel: 'info',
    },
    agent: {
      type: AgentType.ClaudeCode,
      authMethod: AgentAuthMethod.Session,
      token: '',
    },
    notifications: {
      inApp: { enabled: true },
      browser: { enabled: true },
      desktop: { enabled: true },
      events: {
        agentStarted: true,
        phaseCompleted: true,
        waitingApproval: true,
        agentCompleted: true,
        agentFailed: true,
        prMerged: true,
        prClosed: true,
        prChecksPassed: true,
        prChecksFailed: true,
      },
    },
    workflow: {
      openPrOnImplementationComplete: false,
      approvalGateDefaults: {
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
      },
      ciMaxFixAttempts: undefined,
      ciWatchTimeoutMs: undefined,
      ciLogMaxChars: undefined,
    },
  };
}

describe('settingsFormSchema', () => {
  it('accepts valid default settings', () => {
    const result = settingsFormSchema.safeParse(makeValidSettings());
    expect(result.success).toBe(true);
  });

  it('accepts valid settings with all optional fields populated', () => {
    const settings = makeValidSettings();
    settings.user.name = 'John Doe';
    settings.user.email = 'john@example.com';
    settings.user.githubUsername = 'johndoe';
    settings.agent.token = 'sk-abc123';
    settings.workflow.ciMaxFixAttempts = 5;
    settings.workflow.ciWatchTimeoutMs = 600000;
    settings.workflow.ciLogMaxChars = 50000;

    const result = settingsFormSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const settings = makeValidSettings();
    settings.user.email = 'not-an-email';

    const result = settingsFormSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });

  it('accepts empty email string', () => {
    const settings = makeValidSettings();
    settings.user.email = '';

    const result = settingsFormSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });

  it('rejects invalid EditorType enum value', () => {
    const settings = makeValidSettings();
    (settings.environment as Record<string, unknown>).defaultEditor = 'notepad';

    const result = settingsFormSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });

  it('rejects invalid AgentType enum value', () => {
    const settings = makeValidSettings();
    (settings.agent as Record<string, unknown>).type = 'invalid-agent';

    const result = settingsFormSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });

  it('rejects invalid AgentAuthMethod enum value', () => {
    const settings = makeValidSettings();
    (settings.agent as Record<string, unknown>).authMethod = 'apikey';

    const result = settingsFormSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });

  it('rejects negative ciMaxFixAttempts', () => {
    const settings = makeValidSettings();
    settings.workflow.ciMaxFixAttempts = -1;

    const result = settingsFormSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });

  it('rejects zero ciMaxFixAttempts', () => {
    const settings = makeValidSettings();
    settings.workflow.ciMaxFixAttempts = 0;

    const result = settingsFormSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer ciWatchTimeoutMs', () => {
    const settings = makeValidSettings();
    settings.workflow.ciWatchTimeoutMs = 1.5;

    const result = settingsFormSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });

  it('accepts undefined optional number fields', () => {
    const settings = makeValidSettings();
    settings.workflow.ciMaxFixAttempts = undefined;
    settings.workflow.ciWatchTimeoutMs = undefined;
    settings.workflow.ciLogMaxChars = undefined;

    const result = settingsFormSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });

  it('accepts all EditorType enum values', () => {
    const settings = makeValidSettings();
    for (const editor of Object.values(EditorType)) {
      settings.environment.defaultEditor = editor;
      const result = settingsFormSchema.safeParse(settings);
      expect(result.success).toBe(true);
    }
  });

  it('accepts all AgentType enum values', () => {
    const settings = makeValidSettings();
    for (const agent of Object.values(AgentType)) {
      settings.agent.type = agent;
      const result = settingsFormSchema.safeParse(settings);
      expect(result.success).toBe(true);
    }
  });

  it('requires all model fields', () => {
    const settings = makeValidSettings();
    delete (settings.models as Record<string, unknown>).analyze;

    const result = settingsFormSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });

  it('requires all notification event fields', () => {
    const settings = makeValidSettings();
    delete (settings.notifications.events as Record<string, unknown>).agentStarted;

    const result = settingsFormSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });
});
