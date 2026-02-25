/**
 * ConfigureAgentUseCase Unit Tests
 *
 * Tests for the agent configuration use case.
 * Uses mock repository and mock validator (manual mock objects).
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigureAgentUseCase } from '@/application/use-cases/agents/configure-agent.use-case.js';
import { AgentType, AgentAuthMethod } from '@/domain/generated/output.js';
import type { Settings } from '@/domain/generated/output.js';
import type { ISettingsRepository } from '@/application/ports/output/repositories/settings.repository.interface.js';
import type {
  IAgentValidator,
  AgentValidationResult,
} from '@/application/ports/output/agents/agent-validator.interface.js';
import { createDefaultSettings } from '@/domain/factories/settings-defaults.factory.js';

describe('ConfigureAgentUseCase', () => {
  let useCase: ConfigureAgentUseCase;
  let mockRepository: ISettingsRepository;
  let mockValidator: IAgentValidator;
  let defaultSettings: Settings;

  beforeEach(() => {
    defaultSettings = createDefaultSettings();

    mockRepository = {
      initialize: vi.fn(),
      load: vi.fn<() => Promise<Settings | null>>().mockResolvedValue(defaultSettings),
      update: vi.fn<(settings: Settings) => Promise<void>>().mockResolvedValue(undefined),
    };

    mockValidator = {
      isAvailable: vi
        .fn<(agentType: AgentType) => Promise<AgentValidationResult>>()
        .mockResolvedValue({
          available: true,
          version: '1.0.0',
        }),
    };

    useCase = new ConfigureAgentUseCase(mockRepository, mockValidator);
  });

  describe('successful configuration', () => {
    it('should configure agent when validation passes', async () => {
      // Act
      const result = await useCase.execute({
        type: AgentType.ClaudeCode,
        authMethod: AgentAuthMethod.Session,
      });

      // Assert
      expect(result.agent.type).toBe(AgentType.ClaudeCode);
      expect(result.agent.authMethod).toBe(AgentAuthMethod.Session);
      expect(mockValidator.isAvailable).toHaveBeenCalledWith(AgentType.ClaudeCode);
      expect(mockRepository.update).toHaveBeenCalledOnce();
    });

    it('should include token in update when provided', async () => {
      // Act
      const result = await useCase.execute({
        type: AgentType.ClaudeCode,
        authMethod: AgentAuthMethod.Token,
        token: 'sk-ant-api-key-123',
      });

      // Assert
      expect(result.agent.token).toBe('sk-ant-api-key-123');
      expect(result.agent.authMethod).toBe(AgentAuthMethod.Token);
    });

    it('should not include token when not provided', async () => {
      // Act
      const result = await useCase.execute({
        type: AgentType.ClaudeCode,
        authMethod: AgentAuthMethod.Session,
      });

      // Assert
      expect(result.agent.token).toBeUndefined();
    });

    it('should set updatedAt timestamp', async () => {
      // Arrange
      const beforeExec = new Date();

      // Act
      const result = await useCase.execute({
        type: AgentType.ClaudeCode,
        authMethod: AgentAuthMethod.Session,
      });

      // Assert
      const afterExec = new Date();
      expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeExec.getTime());
      expect(result.updatedAt.getTime()).toBeLessThanOrEqual(afterExec.getTime());
    });

    it('should persist updated settings via repository', async () => {
      // Act
      await useCase.execute({
        type: AgentType.ClaudeCode,
        authMethod: AgentAuthMethod.Session,
      });

      // Assert
      expect(mockRepository.update).toHaveBeenCalledOnce();
      const updatedSettings = vi.mocked(mockRepository.update).mock.calls[0]![0];
      expect(updatedSettings.agent.type).toBe(AgentType.ClaudeCode);
    });
  });

  describe('validation failures', () => {
    it('should throw error when agent is not available', async () => {
      // Arrange
      vi.mocked(mockValidator.isAvailable).mockResolvedValue({
        available: false,
        error: 'Binary "claude" not found or not executable: spawn claude ENOENT',
      });

      // Act & Assert
      await expect(
        useCase.execute({
          type: AgentType.ClaudeCode,
          authMethod: AgentAuthMethod.Session,
        })
      ).rejects.toThrow('Agent "claude-code" is not available');

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should include validator error message in thrown error', async () => {
      // Arrange
      vi.mocked(mockValidator.isAvailable).mockResolvedValue({
        available: false,
        error: 'Agent type "gemini-cli" is not supported yet',
      });

      // Act & Assert
      await expect(
        useCase.execute({
          type: AgentType.GeminiCli,
          authMethod: AgentAuthMethod.Session,
        })
      ).rejects.toThrow('not supported yet');
    });

    it('should use default error message when validator error is undefined', async () => {
      // Arrange
      vi.mocked(mockValidator.isAvailable).mockResolvedValue({
        available: false,
      });

      // Act & Assert
      await expect(
        useCase.execute({
          type: AgentType.ClaudeCode,
          authMethod: AgentAuthMethod.Session,
        })
      ).rejects.toThrow('binary not found');
    });
  });

  describe('dev agent type — no binary validation', () => {
    it('should NOT call agentValidator.isAvailable for dev type', async () => {
      // Act
      await useCase.execute({
        type: AgentType.Dev,
        authMethod: AgentAuthMethod.Session,
      });

      // Assert: validator must not be called for dev type
      expect(mockValidator.isAvailable).not.toHaveBeenCalled();
    });

    it('should persist agent.type = "dev" to settings', async () => {
      // Act
      const result = await useCase.execute({
        type: AgentType.Dev,
        authMethod: AgentAuthMethod.Session,
      });

      // Assert
      expect(result.agent.type).toBe(AgentType.Dev);
      expect(mockRepository.update).toHaveBeenCalledOnce();
    });
  });

  describe('settings not found', () => {
    it('should throw error when settings not initialized', async () => {
      // Arrange
      vi.mocked(mockRepository.load).mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          type: AgentType.ClaudeCode,
          authMethod: AgentAuthMethod.Session,
        })
      ).rejects.toThrow('Settings not found');

      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });
});
