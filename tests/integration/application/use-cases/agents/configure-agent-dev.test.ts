/**
 * ConfigureAgentUseCase + Dev Agent Type Integration Test
 *
 * Verifies that agent.type = "dev" can be persisted via ConfigureAgentUseCase
 * and read back via LoadSettingsUseCase against a real SQLite database.
 *
 * Uses real in-memory SQLite (no external dependencies).
 * Validates NFR-7 (backward compatibility) and FR-9 (no binary validation for dev).
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createInMemoryDatabase } from '../../../../helpers/database.helper.js';
import { runSQLiteMigrations } from '@/infrastructure/persistence/sqlite/migrations.js';
import { SQLiteSettingsRepository } from '@/infrastructure/repositories/sqlite-settings.repository.js';
import { InitializeSettingsUseCase } from '@/application/use-cases/settings/initialize-settings.use-case.js';
import { LoadSettingsUseCase } from '@/application/use-cases/settings/load-settings.use-case.js';
import { ConfigureAgentUseCase } from '@/application/use-cases/agents/configure-agent.use-case.js';
import { AgentValidatorService } from '@/infrastructure/services/agents/common/agent-validator.service.js';
import { AgentType, AgentAuthMethod } from '@/domain/generated/output.js';

describe('ConfigureAgentUseCase — dev agent type persistence (integration)', () => {
  let db: Database.Database;
  let repository: SQLiteSettingsRepository;
  let configureUseCase: ConfigureAgentUseCase;
  let loadUseCase: LoadSettingsUseCase;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    await runSQLiteMigrations(db);
    repository = new SQLiteSettingsRepository(db);

    // Initialize settings (simulates first CLI run)
    const initUseCase = new InitializeSettingsUseCase(repository);
    await initUseCase.execute();

    // AgentValidatorService requires an ExecFunction but dev type bypasses it;
    // provide a stub that throws to confirm the bypass is effective.
    const stubExec = () => Promise.reject(new Error('should not be called for dev type'));
    const validator = new AgentValidatorService(stubExec as any);

    configureUseCase = new ConfigureAgentUseCase(repository, validator);
    loadUseCase = new LoadSettingsUseCase(repository);
  });

  afterEach(() => {
    db.close();
  });

  it('should persist agent.type = "dev" without binary validation errors', async () => {
    await expect(
      configureUseCase.execute({
        type: AgentType.Dev,
        authMethod: AgentAuthMethod.Session,
      })
    ).resolves.not.toThrow();
  });

  it('should read back agent.type = "dev" from the database after configure', async () => {
    await configureUseCase.execute({
      type: AgentType.Dev,
      authMethod: AgentAuthMethod.Session,
    });

    const settings = await loadUseCase.execute();
    expect(settings.agent.type).toBe(AgentType.Dev);
  });

  it('should read back authMethod after configure with dev type', async () => {
    await configureUseCase.execute({
      type: AgentType.Dev,
      authMethod: AgentAuthMethod.Session,
    });

    const settings = await loadUseCase.execute();
    expect(settings.agent.authMethod).toBe(AgentAuthMethod.Session);
  });

  it('should not call the binary validator when configuring dev type', async () => {
    // The stubExec throws — if it were called, configureUseCase.execute() would throw.
    // The fact that it doesn't throw confirms the binary check is bypassed.
    const result = await configureUseCase.execute({
      type: AgentType.Dev,
      authMethod: AgentAuthMethod.Session,
    });
    expect(result.agent.type).toBe(AgentType.Dev);
  });

  it('should overwrite a previously configured agent type with "dev"', async () => {
    // First configure a real agent type with a permissive validator
    const permissiveExec = () => Promise.resolve({ stdout: '1.0.0', stderr: '' });
    const permissiveValidator = new AgentValidatorService(permissiveExec as any);
    const permissiveConfigureUseCase = new ConfigureAgentUseCase(repository, permissiveValidator);

    await permissiveConfigureUseCase.execute({
      type: AgentType.ClaudeCode,
      authMethod: AgentAuthMethod.Session,
    });

    // Now switch to dev
    await configureUseCase.execute({
      type: AgentType.Dev,
      authMethod: AgentAuthMethod.Session,
    });

    const settings = await loadUseCase.execute();
    expect(settings.agent.type).toBe(AgentType.Dev);
  });
});
