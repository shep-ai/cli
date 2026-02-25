/**
 * ListToolsUseCase Unit Tests
 *
 * Tests that ListToolsUseCase returns all tools from TOOL_METADATA enriched
 * with live ToolInstallationStatus from IToolInstallerService.checkAvailability().
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolInstallationStatus } from '@/domain/generated/output.js';
import type { IToolInstallerService } from '@/application/ports/output/services/index.js';

// Use vi.hoisted so the mockMetadata reference is available inside the vi.mock factory
// (vi.mock factories are hoisted before import declarations)
const mockMetadata = vi.hoisted(() => ({
  TOOL_METADATA: {
    vscode: {
      name: 'Visual Studio Code',
      summary: 'Lightweight source code editor',
      description: 'VS Code detailed description',
      tags: ['ide'] as ('ide' | 'cli-agent' | 'vcs')[],
      binary: 'code',
      packageManager: 'apt',
      commands: { linux: 'apt install code', darwin: 'brew install code' },
      timeout: 300000,
      documentationUrl: 'https://code.visualstudio.com',
      verifyCommand: 'code --version',
      autoInstall: true,
      openDirectory: 'code {dir}',
    },
    cursor: {
      name: 'Cursor',
      summary: 'AI code editor',
      description: 'Cursor detailed description',
      tags: ['ide'] as ('ide' | 'cli-agent' | 'vcs')[],
      binary: 'cursor',
      packageManager: 'manual',
      commands: { linux: 'manual install instructions', darwin: 'brew install --cask cursor' },
      timeout: 600000,
      documentationUrl: 'https://cursor.com',
      verifyCommand: 'cursor --version',
      autoInstall: false,
      openDirectory: 'cursor {dir}',
    },
  } as Record<string, unknown>,
}));

vi.mock('@/infrastructure/services/tool-installer/tool-metadata.js', () => mockMetadata);

import { ListToolsUseCase } from '@/application/use-cases/tools/list-tools.use-case.js';

describe('ListToolsUseCase', () => {
  let useCase: ListToolsUseCase;
  let mockService: IToolInstallerService;

  const availableStatus: ToolInstallationStatus = { status: 'available', toolName: 'vscode' };
  const missingStatus: ToolInstallationStatus = { status: 'missing', toolName: 'cursor' };

  beforeEach(() => {
    // Reset to the default two-tool metadata before each test
    mockMetadata.TOOL_METADATA = {
      vscode: {
        name: 'Visual Studio Code',
        summary: 'Lightweight source code editor',
        description: 'VS Code detailed description',
        tags: ['ide'],
        binary: 'code',
        packageManager: 'apt',
        commands: { linux: 'apt install code', darwin: 'brew install code' },
        timeout: 300000,
        documentationUrl: 'https://code.visualstudio.com',
        verifyCommand: 'code --version',
        autoInstall: true,
        openDirectory: 'code {dir}',
      },
      cursor: {
        name: 'Cursor',
        summary: 'AI code editor',
        description: 'Cursor detailed description',
        tags: ['ide'],
        binary: 'cursor',
        packageManager: 'manual',
        commands: { linux: 'manual install instructions', darwin: 'brew install --cask cursor' },
        timeout: 600000,
        documentationUrl: 'https://cursor.com',
        verifyCommand: 'cursor --version',
        autoInstall: false,
        openDirectory: 'cursor {dir}',
      },
    };

    mockService = {
      checkAvailability: vi.fn(),
      getInstallCommand: vi.fn(),
      executeInstall: vi.fn(),
    };

    useCase = new ListToolsUseCase(mockService);
  });

  describe('happy path', () => {
    it('should return all tools with status populated from checkAvailability()', async () => {
      vi.mocked(mockService.checkAvailability).mockImplementation(async (id) => {
        if (id === 'vscode') return availableStatus;
        return missingStatus;
      });

      const result = await useCase.execute();

      expect(result).toHaveLength(2);

      const vscodeTool = result.find((t) => t.id === 'vscode');
      const cursorTool = result.find((t) => t.id === 'cursor');

      expect(vscodeTool).toBeDefined();
      expect(vscodeTool?.status).toEqual(availableStatus);
      expect(vscodeTool?.name).toBe('Visual Studio Code');
      expect(vscodeTool?.summary).toBe('Lightweight source code editor');
      expect(vscodeTool?.tags).toEqual(['ide']);
      expect(vscodeTool?.autoInstall).toBe(true);
      expect(vscodeTool?.documentationUrl).toBe('https://code.visualstudio.com');

      expect(cursorTool).toBeDefined();
      expect(cursorTool?.status).toEqual(missingStatus);
      expect(cursorTool?.autoInstall).toBe(false);
    });

    it('should call checkAvailability once for each tool', async () => {
      vi.mocked(mockService.checkAvailability).mockResolvedValue(availableStatus);

      await useCase.execute();

      expect(mockService.checkAvailability).toHaveBeenCalledTimes(2);
      expect(mockService.checkAvailability).toHaveBeenCalledWith('vscode');
      expect(mockService.checkAvailability).toHaveBeenCalledWith('cursor');
    });
  });

  describe('partial failure', () => {
    it('should return error status for a tool whose checkAvailability() rejects, others succeed', async () => {
      vi.mocked(mockService.checkAvailability).mockImplementation(async (id) => {
        if (id === 'vscode') throw new Error('binary check failed');
        return missingStatus;
      });

      const result = await useCase.execute();

      expect(result).toHaveLength(2);

      const vscodeTool = result.find((t) => t.id === 'vscode');
      const cursorTool = result.find((t) => t.id === 'cursor');

      expect(vscodeTool?.status.status).toBe('error');
      expect(cursorTool?.status).toEqual(missingStatus);
    });
  });

  describe('empty metadata', () => {
    it('should return empty array when TOOL_METADATA is empty', async () => {
      mockMetadata.TOOL_METADATA = {};

      const result = await useCase.execute();

      expect(result).toEqual([]);
      expect(mockService.checkAvailability).not.toHaveBeenCalled();
    });
  });
});
