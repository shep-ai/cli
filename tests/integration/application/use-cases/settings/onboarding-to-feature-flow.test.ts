/**
 * Onboarding → Feature Command Integration Tests
 *
 * Validates that workflow defaults configured during onboarding
 * flow through to the feature command, and that CLI flags override
 * those defaults correctly.
 *
 * Uses a real in-memory SQLite database with migrations applied.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createInMemoryDatabase } from '../../../../helpers/database.helper.js';
import { runSQLiteMigrations } from '@/infrastructure/persistence/sqlite/migrations.js';
import { SQLiteSettingsRepository } from '@/infrastructure/repositories/sqlite-settings.repository.js';
import { InitializeSettingsUseCase } from '@/application/use-cases/settings/initialize-settings.use-case.js';
import {
  CompleteOnboardingUseCase,
  type CompleteOnboardingInput,
} from '@/application/use-cases/settings/complete-onboarding.use-case.js';
import {
  getSettings,
  hasSettings,
  initializeSettings,
  resetSettings,
} from '@/infrastructure/services/settings.service.js';
import { AgentType, AgentAuthMethod } from '@/domain/generated/output.js';

/**
 * Mirrors the logic from new.command.ts getWorkflowDefaults() + option resolution.
 * We test this logic directly against real settings to avoid coupling to Commander.
 */
function resolveWorkflowValues(flags: {
  push?: boolean;
  pr?: boolean;
  allowPrd?: boolean;
  allowPlan?: boolean;
  allowMerge?: boolean;
  allowAll?: boolean;
}) {
  // Mirrors getWorkflowDefaults() from new.command.ts
  let defaults = {
    openPr: false,
    allowPrd: false,
    allowPlan: false,
    allowMerge: false,
    push: false,
  };
  if (hasSettings()) {
    const settings = getSettings();
    const gates = settings.workflow.approvalGateDefaults;
    defaults = {
      openPr: settings.workflow.openPrOnImplementationComplete,
      allowPrd: gates.allowPrd,
      allowPlan: gates.allowPlan,
      allowMerge: gates.allowMerge,
      push: gates.pushOnImplementationComplete,
    };
  }

  // Mirrors option resolution from new.command.ts action
  const openPr = flags.pr ?? defaults.openPr;
  const approvalGates = flags.allowAll
    ? { allowPrd: true, allowPlan: true, allowMerge: true }
    : {
        allowPrd: flags.allowPrd ?? defaults.allowPrd,
        allowPlan: flags.allowPlan ?? defaults.allowPlan,
        allowMerge: flags.allowMerge ?? defaults.allowMerge,
      };
  const push = flags.push ?? defaults.push;

  return { openPr, approvalGates, push };
}

describe('Onboarding defaults flow into feature command (integration)', () => {
  let db: Database.Database;
  let repository: SQLiteSettingsRepository;

  beforeEach(async () => {
    resetSettings();
    db = createInMemoryDatabase();
    await runSQLiteMigrations(db);
    repository = new SQLiteSettingsRepository(db);
  });

  afterEach(() => {
    resetSettings();
    db.close();
  });

  /**
   * Helper: initialize settings and complete onboarding with given wizard choices.
   */
  async function completeOnboarding(workflowDefaults: CompleteOnboardingInput['workflowDefaults']) {
    const initUseCase = new InitializeSettingsUseCase(repository);
    const settings = await initUseCase.execute();
    initializeSettings(settings);

    const completeUseCase = new CompleteOnboardingUseCase(repository);
    const updated = await completeUseCase.execute({
      agent: { type: AgentType.ClaudeCode, authMethod: AgentAuthMethod.Session },
      ide: 'vscode',
      workflowDefaults,
    });

    // Refresh singleton (same as the real wizard does)
    resetSettings();
    initializeSettings(updated);
  }

  describe('settings defaults used when no CLI flags provided', () => {
    it('should use all-false defaults when wizard selects nothing', async () => {
      await completeOnboarding({
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
        openPrOnImplementationComplete: false,
      });

      const result = resolveWorkflowValues({});

      expect(result.approvalGates).toEqual({
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
      });
      expect(result.push).toBe(false);
      expect(result.openPr).toBe(false);
    });

    it('should use wizard-selected approval gates as defaults', async () => {
      await completeOnboarding({
        allowPrd: true,
        allowPlan: true,
        allowMerge: false,
        pushOnImplementationComplete: false,
        openPrOnImplementationComplete: false,
      });

      const result = resolveWorkflowValues({});

      expect(result.approvalGates).toEqual({ allowPrd: true, allowPlan: true, allowMerge: false });
    });

    it('should use wizard-selected push default', async () => {
      await completeOnboarding({
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: true,
        openPrOnImplementationComplete: false,
      });

      const result = resolveWorkflowValues({});

      expect(result.push).toBe(true);
    });

    it('should use wizard-selected openPr default', async () => {
      await completeOnboarding({
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
        openPrOnImplementationComplete: true,
      });

      const result = resolveWorkflowValues({});

      expect(result.openPr).toBe(true);
    });

    it('should use fully autonomous defaults when wizard enables everything', async () => {
      await completeOnboarding({
        allowPrd: true,
        allowPlan: true,
        allowMerge: true,
        pushOnImplementationComplete: true,
        openPrOnImplementationComplete: true,
      });

      const result = resolveWorkflowValues({});

      expect(result.approvalGates).toEqual({ allowPrd: true, allowPlan: true, allowMerge: true });
      expect(result.push).toBe(true);
      expect(result.openPr).toBe(true);
    });
  });

  describe('CLI flags override settings defaults', () => {
    it('should override push=false default with --push flag', async () => {
      await completeOnboarding({
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
        openPrOnImplementationComplete: false,
      });

      const result = resolveWorkflowValues({ push: true });

      expect(result.push).toBe(true);
    });

    it('should override openPr=false default with --pr flag', async () => {
      await completeOnboarding({
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
        openPrOnImplementationComplete: false,
      });

      const result = resolveWorkflowValues({ pr: true });

      expect(result.openPr).toBe(true);
    });

    it('should override openPr=true default with --no-pr flag (pr=false)', async () => {
      await completeOnboarding({
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
        openPrOnImplementationComplete: true,
      });

      const result = resolveWorkflowValues({ pr: false });

      expect(result.openPr).toBe(false);
    });

    it('should override individual approval gates with CLI flags', async () => {
      await completeOnboarding({
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
        openPrOnImplementationComplete: false,
      });

      const result = resolveWorkflowValues({ allowPrd: true, allowMerge: true });

      expect(result.approvalGates).toEqual({ allowPrd: true, allowPlan: false, allowMerge: true });
    });

    it('should override all approval gate defaults with --allow-all', async () => {
      await completeOnboarding({
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
        openPrOnImplementationComplete: false,
      });

      const result = resolveWorkflowValues({ allowAll: true });

      expect(result.approvalGates).toEqual({ allowPrd: true, allowPlan: true, allowMerge: true });
    });

    it('should allow CLI flags to disable wizard-enabled approval gates', async () => {
      await completeOnboarding({
        allowPrd: true,
        allowPlan: true,
        allowMerge: true,
        pushOnImplementationComplete: true,
        openPrOnImplementationComplete: true,
      });

      // Explicit false flags override settings defaults
      const result = resolveWorkflowValues({
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        push: false,
        pr: false,
      });

      expect(result.approvalGates).toEqual({
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
      });
      expect(result.push).toBe(false);
      expect(result.openPr).toBe(false);
    });
  });

  describe('defaults survive settings round-trip through database', () => {
    it('should preserve wizard defaults after reload from database', async () => {
      await completeOnboarding({
        allowPrd: true,
        allowPlan: false,
        allowMerge: true,
        pushOnImplementationComplete: true,
        openPrOnImplementationComplete: false,
      });

      // Simulate second CLI run: clear singleton, reload from DB
      resetSettings();
      const reloaded = await repository.load();
      expect(reloaded).not.toBeNull();
      initializeSettings(reloaded!);

      const result = resolveWorkflowValues({});

      expect(result.approvalGates).toEqual({ allowPrd: true, allowPlan: false, allowMerge: true });
      expect(result.push).toBe(true);
      expect(result.openPr).toBe(false);
    });
  });
});
