/**
 * AgentValidatorService Unit Tests
 *
 * Tests for the agent binary availability checking service.
 * Uses constructor-injected exec function mock (NOT vi.mock of child_process).
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AgentValidatorService,
  type ExecFunction,
} from '../../../../../src/infrastructure/services/agents/agent-validator.service.js';
import { AgentType } from '../../../../../src/domain/generated/output.js';
import { createMockLogger } from '../../../../helpers/mock-logger.js';
import type { ILogger } from '../../../../../src/application/ports/output/logger.interface.js';

describe('AgentValidatorService', () => {
  let mockExec: ExecFunction;
  let mockLogger: ILogger;
  let service: AgentValidatorService;

  beforeEach(() => {
    mockExec = vi.fn();
    mockLogger = createMockLogger();
    service = new AgentValidatorService(mockExec, mockLogger);
  });

  describe('isAvailable - claude-code', () => {
    it('should return available with version when binary is found', async () => {
      // Arrange
      vi.mocked(mockExec).mockResolvedValue({
        stdout: '1.0.16\n',
        stderr: '',
      });

      // Act
      const result = await service.isAvailable(AgentType.ClaudeCode);

      // Assert
      expect(result.available).toBe(true);
      expect(result.version).toBe('1.0.16');
      expect(result.error).toBeUndefined();
      expect(mockExec).toHaveBeenCalledWith('claude', ['--version']);
    });

    it('should return not available when binary is not found', async () => {
      // Arrange
      vi.mocked(mockExec).mockRejectedValue(new Error('spawn claude ENOENT'));

      // Act
      const result = await service.isAvailable(AgentType.ClaudeCode);

      // Assert
      expect(result.available).toBe(false);
      expect(result.version).toBeUndefined();
      expect(result.error).toContain('claude');
      expect(result.error).toContain('not found or not executable');
    });

    it('should handle non-Error thrown values gracefully', async () => {
      // Arrange
      vi.mocked(mockExec).mockRejectedValue('unexpected string error');

      // Act
      const result = await service.isAvailable(AgentType.ClaudeCode);

      // Assert
      expect(result.available).toBe(false);
      expect(result.error).toContain('Unknown error');
    });

    it('should trim whitespace from version output', async () => {
      // Arrange
      vi.mocked(mockExec).mockResolvedValue({
        stdout: '  2.3.4  \n',
        stderr: '',
      });

      // Act
      const result = await service.isAvailable(AgentType.ClaudeCode);

      // Assert
      expect(result.version).toBe('2.3.4');
    });
  });

  describe('isAvailable - unsupported agents', () => {
    it('should return not available for gemini-cli', async () => {
      // Act
      const result = await service.isAvailable(AgentType.GeminiCli);

      // Assert
      expect(result.available).toBe(false);
      expect(result.error).toContain('not supported yet');
      expect(result.error).toContain('gemini-cli');
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should return not available for aider', async () => {
      // Act
      const result = await service.isAvailable(AgentType.Aider);

      // Assert
      expect(result.available).toBe(false);
      expect(result.error).toContain('not supported yet');
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should return not available for continue', async () => {
      // Act
      const result = await service.isAvailable(AgentType.Continue);

      // Assert
      expect(result.available).toBe(false);
      expect(result.error).toContain('not supported yet');
    });

    it('should return not available for cursor', async () => {
      // Act
      const result = await service.isAvailable(AgentType.Cursor);

      // Assert
      expect(result.available).toBe(false);
      expect(result.error).toContain('not supported yet');
    });
  });
});
