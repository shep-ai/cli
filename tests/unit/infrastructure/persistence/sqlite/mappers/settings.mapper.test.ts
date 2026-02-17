/**
 * Settings Database Mapper Unit Tests
 *
 * Tests for toDatabase() and fromDatabase() mapping functions,
 * specifically for the notification preference columns added in migration v9.
 *
 * TDD Phase: RED
 * - These tests are written BEFORE implementation
 * - Tests for notification mapping should FAIL initially
 */

import { describe, it, expect } from 'vitest';
import {
  toDatabase,
  fromDatabase,
  type SettingsRow,
} from '../../../../../../src/infrastructure/persistence/sqlite/mappers/settings.mapper.js';
import type { Settings } from '../../../../../../src/domain/generated/output.js';
import {
  AgentType,
  AgentAuthMethod,
  EditorType,
} from '../../../../../../src/domain/generated/output.js';

/**
 * Creates a complete test Settings object with all fields populated,
 * including notification preferences.
 */
function createTestSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 'test-id',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T12:00:00Z'),
    models: {
      analyze: 'claude-opus-4',
      requirements: 'claude-sonnet-4',
      plan: 'claude-sonnet-4',
      implement: 'claude-sonnet-4',
    },
    user: {
      name: 'Test User',
      email: 'test@example.com',
      githubUsername: 'testuser',
    },
    environment: {
      defaultEditor: EditorType.VsCode,
      shellPreference: 'zsh',
    },
    system: {
      autoUpdate: true,
      logLevel: 'info',
    },
    agent: {
      type: AgentType.ClaudeCode,
      authMethod: AgentAuthMethod.Session,
    },
    notifications: {
      inApp: { enabled: false },
      browser: { enabled: false },
      desktop: { enabled: false },
      events: {
        agentStarted: true,
        phaseCompleted: true,
        waitingApproval: true,
        agentCompleted: true,
        agentFailed: true,
      },
    },
    ...overrides,
  };
}

/**
 * Creates a complete test SettingsRow with all columns populated,
 * including notification columns.
 */
function createTestRow(overrides: Partial<SettingsRow> = {}): SettingsRow {
  return {
    id: 'test-id',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T12:00:00.000Z',
    model_analyze: 'claude-opus-4',
    model_requirements: 'claude-sonnet-4',
    model_plan: 'claude-sonnet-4',
    model_implement: 'claude-sonnet-4',
    user_name: 'Test User',
    user_email: 'test@example.com',
    user_github_username: 'testuser',
    env_default_editor: 'vscode',
    env_shell_preference: 'zsh',
    sys_auto_update: 1,
    sys_log_level: 'info',
    agent_type: 'claude-code',
    agent_auth_method: 'session',
    agent_token: null,
    notif_in_app_enabled: 0,
    notif_browser_enabled: 0,
    notif_desktop_enabled: 0,
    notif_evt_agent_started: 1,
    notif_evt_phase_completed: 1,
    notif_evt_waiting_approval: 1,
    notif_evt_agent_completed: 1,
    notif_evt_agent_failed: 1,
    ...overrides,
  };
}

describe('Settings Mapper', () => {
  describe('toDatabase() - notification preferences', () => {
    it('should map notifications.inApp.enabled=false to notif_in_app_enabled=0', () => {
      const settings = createTestSettings({
        notifications: {
          inApp: { enabled: false },
          browser: { enabled: false },
          desktop: { enabled: false },
          events: {
            agentStarted: true,
            phaseCompleted: true,
            waitingApproval: true,
            agentCompleted: true,
            agentFailed: true,
          },
        },
      });

      const row = toDatabase(settings);

      expect(row.notif_in_app_enabled).toBe(0);
    });

    it('should map notifications.inApp.enabled=true to notif_in_app_enabled=1', () => {
      const settings = createTestSettings({
        notifications: {
          inApp: { enabled: true },
          browser: { enabled: false },
          desktop: { enabled: false },
          events: {
            agentStarted: true,
            phaseCompleted: true,
            waitingApproval: true,
            agentCompleted: true,
            agentFailed: true,
          },
        },
      });

      const row = toDatabase(settings);

      expect(row.notif_in_app_enabled).toBe(1);
    });

    it('should map all three channel enabled flags', () => {
      const settings = createTestSettings({
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
          },
        },
      });

      const row = toDatabase(settings);

      expect(row.notif_in_app_enabled).toBe(1);
      expect(row.notif_browser_enabled).toBe(1);
      expect(row.notif_desktop_enabled).toBe(1);
    });

    it('should map all five event type flags', () => {
      const settings = createTestSettings({
        notifications: {
          inApp: { enabled: false },
          browser: { enabled: false },
          desktop: { enabled: false },
          events: {
            agentStarted: false,
            phaseCompleted: false,
            waitingApproval: true,
            agentCompleted: true,
            agentFailed: false,
          },
        },
      });

      const row = toDatabase(settings);

      expect(row.notif_evt_agent_started).toBe(0);
      expect(row.notif_evt_phase_completed).toBe(0);
      expect(row.notif_evt_waiting_approval).toBe(1);
      expect(row.notif_evt_agent_completed).toBe(1);
      expect(row.notif_evt_agent_failed).toBe(0);
    });
  });

  describe('fromDatabase() - notification preferences', () => {
    it('should reconstruct notifications.inApp.enabled=true from notif_in_app_enabled=1', () => {
      const row = createTestRow({ notif_in_app_enabled: 1 });

      const settings = fromDatabase(row);

      expect(settings.notifications.inApp.enabled).toBe(true);
    });

    it('should reconstruct notifications.desktop.enabled=true from notif_desktop_enabled=1', () => {
      const row = createTestRow({ notif_desktop_enabled: 1 });

      const settings = fromDatabase(row);

      expect(settings.notifications.desktop.enabled).toBe(true);
    });

    it('should reconstruct all channel configs from columns', () => {
      const row = createTestRow({
        notif_in_app_enabled: 0,
        notif_browser_enabled: 1,
        notif_desktop_enabled: 0,
      });

      const settings = fromDatabase(row);

      expect(settings.notifications.inApp.enabled).toBe(false);
      expect(settings.notifications.browser.enabled).toBe(true);
      expect(settings.notifications.desktop.enabled).toBe(false);
    });

    it('should reconstruct all event type configs from columns', () => {
      const row = createTestRow({
        notif_evt_agent_started: 0,
        notif_evt_phase_completed: 1,
        notif_evt_waiting_approval: 0,
        notif_evt_agent_completed: 1,
        notif_evt_agent_failed: 0,
      });

      const settings = fromDatabase(row);

      expect(settings.notifications.events.agentStarted).toBe(false);
      expect(settings.notifications.events.phaseCompleted).toBe(true);
      expect(settings.notifications.events.waitingApproval).toBe(false);
      expect(settings.notifications.events.agentCompleted).toBe(true);
      expect(settings.notifications.events.agentFailed).toBe(false);
    });
  });

  describe('round-trip - notification preferences', () => {
    it('should preserve all 8 notification values through toDatabase → fromDatabase', () => {
      const original = createTestSettings({
        notifications: {
          inApp: { enabled: true },
          browser: { enabled: false },
          desktop: { enabled: true },
          events: {
            agentStarted: false,
            phaseCompleted: true,
            waitingApproval: false,
            agentCompleted: true,
            agentFailed: false,
          },
        },
      });

      const row = toDatabase(original);
      const restored = fromDatabase(row);

      expect(restored.notifications).toEqual(original.notifications);
    });

    it('should preserve default notification values through round-trip', () => {
      const original = createTestSettings(); // Uses default notifications (all channels off, all events on)

      const row = toDatabase(original);
      const restored = fromDatabase(row);

      expect(restored.notifications).toEqual({
        inApp: { enabled: false },
        browser: { enabled: false },
        desktop: { enabled: false },
        events: {
          agentStarted: true,
          phaseCompleted: true,
          waitingApproval: true,
          agentCompleted: true,
          agentFailed: true,
        },
      });
    });
  });

  describe('toDatabase() - preserves existing field mappings', () => {
    it('should still map all pre-existing fields correctly', () => {
      const settings = createTestSettings();

      const row = toDatabase(settings);

      expect(row.id).toBe('test-id');
      expect(row.model_analyze).toBe('claude-opus-4');
      expect(row.user_name).toBe('Test User');
      expect(row.env_default_editor).toBe('vscode');
      expect(row.sys_auto_update).toBe(1);
      expect(row.agent_type).toBe('claude-code');
    });
  });

  describe('fromDatabase() - preserves existing field mappings', () => {
    it('should still reconstruct all pre-existing fields correctly', () => {
      const row = createTestRow();

      const settings = fromDatabase(row);

      expect(settings.id).toBe('test-id');
      expect(settings.models.analyze).toBe('claude-opus-4');
      expect(settings.user.name).toBe('Test User');
      expect(settings.environment.defaultEditor).toBe('vscode');
      expect(settings.system.autoUpdate).toBe(true);
      expect(settings.agent.type).toBe('claude-code');
    });
  });
});
