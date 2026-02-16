/**
 * ValidateToolAvailabilityUseCase Unit Tests
 *
 * Tests for validating if a tool is available on the system.
 * Uses mock tool installer service (manual mock object).
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidateToolAvailabilityUseCase } from '../../../../../src/application/use-cases/tools/validate-tool-availability.use-case.js';
import type {
  ToolInstallationStatus,
  InstallationSuggestion,
} from '../../../../../src/domain/generated/output.js';
import type { IToolInstallerService } from '../../../../../src/application/ports/output/services/index.js';

describe('ValidateToolAvailabilityUseCase', () => {
  let useCase: ValidateToolAvailabilityUseCase;
  let mockService: IToolInstallerService;

  beforeEach(() => {
    mockService = {
      checkAvailability: vi
        .fn<(toolName: string) => Promise<ToolInstallationStatus>>()
        .mockResolvedValue({
          status: 'available',
          toolName: 'test-tool',
        }),
      getInstallCommand: vi.fn(),
      executeInstall: vi.fn(),
    };

    useCase = new ValidateToolAvailabilityUseCase(mockService);
  });

  describe('availability validation', () => {
    it('should return available status when tool is found', async () => {
      // Arrange
      const expectedStatus: ToolInstallationStatus = {
        status: 'available',
        toolName: 'vscode',
      };
      vi.mocked(mockService.checkAvailability).mockResolvedValue(expectedStatus);

      // Act
      const result = await useCase.execute('vscode');

      // Assert
      expect(result).toEqual(expectedStatus);
      expect(result.status).toBe('available');
      expect(result.toolName).toBe('vscode');
    });

    it('should return missing status with suggestions when tool not found', async () => {
      // Arrange
      const suggestions: InstallationSuggestion[] = [
        {
          packageManager: 'brew',
          command: 'brew install visual-studio-code',
          documentationUrl: 'https://code.visualstudio.com/docs/setup/mac',
        },
      ];
      const expectedStatus: ToolInstallationStatus = {
        status: 'missing',
        toolName: 'vscode',
        suggestions,
      };
      vi.mocked(mockService.checkAvailability).mockResolvedValue(expectedStatus);

      // Act
      const result = await useCase.execute('vscode');

      // Assert
      expect(result).toEqual(expectedStatus);
      expect(result.status).toBe('missing');
      expect(result.suggestions).toEqual(suggestions);
    });

    it('should return error status when check fails', async () => {
      // Arrange
      const expectedStatus: ToolInstallationStatus = {
        status: 'error',
        toolName: 'vscode',
        errorMessage: 'Permission denied accessing system PATH',
      };
      vi.mocked(mockService.checkAvailability).mockResolvedValue(expectedStatus);

      // Act
      const result = await useCase.execute('vscode');

      // Assert
      expect(result).toEqual(expectedStatus);
      expect(result.status).toBe('error');
      expect(result.errorMessage).toBe('Permission denied accessing system PATH');
    });

    it('should pass correct toolName to service', async () => {
      // Act
      await useCase.execute('cursor');

      // Assert
      expect(mockService.checkAvailability).toHaveBeenCalledWith('cursor');
    });

    it('should call service exactly once per execution', async () => {
      // Act
      await useCase.execute('vscode');

      // Assert
      expect(mockService.checkAvailability).toHaveBeenCalledOnce();
    });
  });
});
