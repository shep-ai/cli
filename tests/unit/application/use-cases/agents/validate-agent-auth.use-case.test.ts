/**
 * ValidateAgentAuthUseCase Unit Tests
 *
 * Tests for the agent auth validation use case.
 * Uses mock validator (manual mock object).
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidateAgentAuthUseCase } from '../../../../../src/application/use-cases/agents/validate-agent-auth.use-case.js';
import { AgentType } from '../../../../../src/domain/generated/output.js';
import type {
  IAgentValidator,
  AgentValidationResult,
} from '../../../../../src/application/ports/output/agents/agent-validator.interface.js';

describe('ValidateAgentAuthUseCase', () => {
  let useCase: ValidateAgentAuthUseCase;
  let mockValidator: IAgentValidator;

  beforeEach(() => {
    mockValidator = {
      isAvailable: vi
        .fn<(agentType: AgentType) => Promise<AgentValidationResult>>()
        .mockResolvedValue({
          available: true,
          version: '1.0.0',
        }),
    };

    useCase = new ValidateAgentAuthUseCase(mockValidator);
  });

  describe('validation delegation', () => {
    it('should return validation result from validator when available', async () => {
      // Arrange
      const expectedResult: AgentValidationResult = {
        available: true,
        version: '2.1.0',
      };
      vi.mocked(mockValidator.isAvailable).mockResolvedValue(expectedResult);

      // Act
      const result = await useCase.execute(AgentType.ClaudeCode);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(result.available).toBe(true);
      expect(result.version).toBe('2.1.0');
    });

    it('should return validation result from validator when not available', async () => {
      // Arrange
      const expectedResult: AgentValidationResult = {
        available: false,
        error: 'Binary "claude" not found',
      };
      vi.mocked(mockValidator.isAvailable).mockResolvedValue(expectedResult);

      // Act
      const result = await useCase.execute(AgentType.ClaudeCode);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(result.available).toBe(false);
      expect(result.error).toBe('Binary "claude" not found');
    });

    it('should pass agent type through to validator', async () => {
      // Act
      await useCase.execute(AgentType.ClaudeCode);

      // Assert
      expect(mockValidator.isAvailable).toHaveBeenCalledWith(AgentType.ClaudeCode);
    });

    it('should pass different agent types correctly', async () => {
      // Act
      await useCase.execute(AgentType.GeminiCli);

      // Assert
      expect(mockValidator.isAvailable).toHaveBeenCalledWith(AgentType.GeminiCli);
    });

    it('should call validator exactly once per execution', async () => {
      // Act
      await useCase.execute(AgentType.ClaudeCode);

      // Assert
      expect(mockValidator.isAvailable).toHaveBeenCalledOnce();
    });
  });
});
