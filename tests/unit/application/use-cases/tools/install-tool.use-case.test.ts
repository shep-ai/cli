/**
 * InstallToolUseCase Unit Tests
 *
 * Tests for executing tool installation with output streaming.
 * Uses mock tool installer service (manual mock object).
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstallToolUseCase } from '@/application/use-cases/tools/install-tool.use-case.js';
import type { ToolInstallationStatus } from '@/domain/generated/output.js';
import type { IToolInstallerService } from '@/application/ports/output/services/index.js';

describe('InstallToolUseCase', () => {
  let useCase: InstallToolUseCase;
  let mockService: IToolInstallerService;

  beforeEach(() => {
    mockService = {
      checkAvailability: vi.fn(),
      getInstallCommand: vi.fn(),
      executeInstall: vi
        .fn<
          (toolName: string, onOutput?: (data: string) => void) => Promise<ToolInstallationStatus>
        >()
        .mockResolvedValue({
          status: 'available',
          toolName: 'test-tool',
        }),
    };

    useCase = new InstallToolUseCase(mockService);
  });

  describe('tool installation', () => {
    it('should call executeInstall on the service with correct toolName', async () => {
      // Act
      await useCase.execute('vscode');

      // Assert
      expect(mockService.executeInstall).toHaveBeenCalledWith('vscode', undefined);
    });

    it('should return ToolInstallationStatus from service on success', async () => {
      // Arrange
      const expectedStatus: ToolInstallationStatus = {
        status: 'available',
        toolName: 'vscode',
      };
      vi.mocked(mockService.executeInstall).mockResolvedValue(expectedStatus);

      // Act
      const result = await useCase.execute('vscode');

      // Assert
      expect(result).toEqual(expectedStatus);
      expect(result.status).toBe('available');
    });

    it('should return error status on timeout', async () => {
      // Arrange
      const expectedStatus: ToolInstallationStatus = {
        status: 'error',
        toolName: 'vscode',
        errorMessage: 'Installation timeout after 300 seconds',
      };
      vi.mocked(mockService.executeInstall).mockResolvedValue(expectedStatus);

      // Act
      const result = await useCase.execute('vscode');

      // Assert
      expect(result).toEqual(expectedStatus);
      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('timeout');
    });

    it('should return error status on non-zero exit', async () => {
      // Arrange
      const expectedStatus: ToolInstallationStatus = {
        status: 'error',
        toolName: 'vscode',
        errorMessage: 'Installation process exited with code 127',
      };
      vi.mocked(mockService.executeInstall).mockResolvedValue(expectedStatus);

      // Act
      const result = await useCase.execute('vscode');

      // Assert
      expect(result).toEqual(expectedStatus);
      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('exited');
    });

    it('should pass onOutput callback through to service', async () => {
      // Arrange
      const onOutput = vi.fn();

      // Act
      await useCase.execute('vscode', onOutput);

      // Assert
      expect(mockService.executeInstall).toHaveBeenCalledWith('vscode', onOutput);
    });

    it('should call service exactly once per execution', async () => {
      // Act
      await useCase.execute('cursor');

      // Assert
      expect(mockService.executeInstall).toHaveBeenCalledOnce();
    });
  });
});
