/**
 * ToolInstallationStatus Value Object Unit Tests
 *
 * Tests for the ToolInstallationStatus value object that validates and
 * freezes installation status objects with optional error messages and
 * installation suggestions.
 *
 * TDD Phase: RED
 * - These tests are written BEFORE implementation
 * - All tests should FAIL initially (value object doesn't exist yet)
 */

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import {
  createToolInstallationStatus,
  createAvailableStatus,
  createMissingStatus,
  createErrorStatus,
} from '@/domain/value-objects/tool-installation-status.js';
import type { ToolInstallationStatus, InstallationSuggestion } from '@/domain/generated/output.js';

describe('ToolInstallationStatus Value Object', () => {
  describe('createToolInstallationStatus', () => {
    it('should create an object with "available" status', () => {
      // Arrange
      const input: ToolInstallationStatus = {
        status: 'available',
        toolName: 'vscode',
      };

      // Act
      const result = createToolInstallationStatus(input);

      // Assert
      expect(result.status).toBe('available');
      expect(result.toolName).toBe('vscode');
      expect(result.errorMessage).toBeUndefined();
      expect(result.suggestions).toBeUndefined();
    });

    it('should create an object with "missing" status and suggestions', () => {
      // Arrange
      const suggestions: InstallationSuggestion[] = [
        {
          packageManager: 'brew',
          command: 'brew install code',
          documentationUrl: 'https://code.visualstudio.com/docs/setup/mac',
          notes: 'Recommended for macOS',
        },
      ];
      const input: ToolInstallationStatus = {
        status: 'missing',
        toolName: 'vscode',
        suggestions,
      };

      // Act
      const result = createToolInstallationStatus(input);

      // Assert
      expect(result.status).toBe('missing');
      expect(result.toolName).toBe('vscode');
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions?.[0].packageManager).toBe('brew');
      expect(result.suggestions?.[0].command).toBe('brew install code');
      expect(result.suggestions?.[0].documentationUrl).toBe(
        'https://code.visualstudio.com/docs/setup/mac'
      );
      expect(result.suggestions?.[0].notes).toBe('Recommended for macOS');
    });

    it('should create an object with "error" status and errorMessage', () => {
      // Arrange
      const input: ToolInstallationStatus = {
        status: 'error',
        toolName: 'cursor',
        errorMessage: 'Failed to check installation: Permission denied',
      };

      // Act
      const result = createToolInstallationStatus(input);

      // Assert
      expect(result.status).toBe('error');
      expect(result.toolName).toBe('cursor');
      expect(result.errorMessage).toBe('Failed to check installation: Permission denied');
      expect(result.suggestions).toBeUndefined();
    });

    it('should throw or return error when toolName is empty string', () => {
      // Arrange
      const input: ToolInstallationStatus = {
        status: 'available',
        toolName: '',
      };

      // Act & Assert
      expect(() => createToolInstallationStatus(input)).toThrow();
    });

    it('should throw or return error when toolName is whitespace-only', () => {
      // Arrange
      const input: ToolInstallationStatus = {
        status: 'available',
        toolName: '   ',
      };

      // Act & Assert
      expect(() => createToolInstallationStatus(input)).toThrow();
    });

    it('should throw when status is invalid value', () => {
      // Arrange
      const input: any = {
        status: 'invalid',
        toolName: 'vscode',
      };

      // Act & Assert
      expect(() => createToolInstallationStatus(input)).toThrow();
    });

    it('should freeze the returned object (immutability)', () => {
      // Arrange
      const input: ToolInstallationStatus = {
        status: 'available',
        toolName: 'vscode',
      };

      // Act
      const result = createToolInstallationStatus(input);

      // Assert
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should freeze suggestions array if present', () => {
      // Arrange
      const suggestions: InstallationSuggestion[] = [
        {
          packageManager: 'apt',
          command: 'apt install code',
          documentationUrl: 'https://code.visualstudio.com/docs/setup/linux',
        },
      ];
      const input: ToolInstallationStatus = {
        status: 'missing',
        toolName: 'vscode',
        suggestions,
      };

      // Act
      const result = createToolInstallationStatus(input);

      // Assert
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.suggestions)).toBe(true);
    });

    it('should prevent mutation after freezing', () => {
      // Arrange
      const input: ToolInstallationStatus = {
        status: 'available',
        toolName: 'vscode',
      };
      const result = createToolInstallationStatus(input);

      // Act & Assert
      expect(() => {
        (result as any).status = 'missing';
      }).toThrow();

      expect(() => {
        (result as any).toolName = 'cursor';
      }).toThrow();
    });
  });

  describe('Factory helper: createAvailableStatus', () => {
    it('should create an available status object with provided toolName', () => {
      // Act
      const result = createAvailableStatus('windsurf');

      // Assert
      expect(result.status).toBe('available');
      expect(result.toolName).toBe('windsurf');
      expect(result.errorMessage).toBeUndefined();
      expect(result.suggestions).toBeUndefined();
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should validate toolName is not empty', () => {
      // Act & Assert
      expect(() => createAvailableStatus('')).toThrow();
    });

    it('should validate toolName is not whitespace-only', () => {
      // Act & Assert
      expect(() => createAvailableStatus('  ')).toThrow();
    });
  });

  describe('Factory helper: createMissingStatus', () => {
    it('should create a missing status object with suggestions', () => {
      // Arrange
      const suggestions: InstallationSuggestion[] = [
        {
          packageManager: 'npm',
          command: 'npm install -g cursor-cli',
          documentationUrl: 'https://www.cursor.com/docs',
        },
      ];

      // Act
      const result = createMissingStatus('cursor-cli', suggestions);

      // Assert
      expect(result.status).toBe('missing');
      expect(result.toolName).toBe('cursor-cli');
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions?.[0]).toEqual(suggestions[0]);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should create missing status with empty suggestions array', () => {
      // Act
      const result = createMissingStatus('zed', []);

      // Assert
      expect(result.status).toBe('missing');
      expect(result.toolName).toBe('zed');
      expect(result.suggestions).toEqual([]);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should validate toolName is not empty', () => {
      // Act & Assert
      expect(() => createMissingStatus('', [])).toThrow();
    });
  });

  describe('Factory helper: createErrorStatus', () => {
    it('should create an error status object with errorMessage', () => {
      // Arrange
      const errorMessage = 'Installer crashed with exit code 1';

      // Act
      const result = createErrorStatus('antigravity', errorMessage);

      // Assert
      expect(result.status).toBe('error');
      expect(result.toolName).toBe('antigravity');
      expect(result.errorMessage).toBe(errorMessage);
      expect(result.suggestions).toBeUndefined();
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should accept error message with special characters', () => {
      // Arrange
      const errorMessage = 'Error: "Command failed" at /usr/bin/tool (line 42)';

      // Act
      const result = createErrorStatus('claude-code', errorMessage);

      // Assert
      expect(result.errorMessage).toBe(errorMessage);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should validate toolName is not empty', () => {
      // Act & Assert
      expect(() => createErrorStatus('', 'Error message')).toThrow();
    });
  });

  describe('Edge cases and normalization', () => {
    it('should handle toolName with leading/trailing whitespace', () => {
      // Arrange
      const input: ToolInstallationStatus = {
        status: 'available',
        toolName: '  vscode  ',
      };

      // Act - should trim the toolName
      const result = createToolInstallationStatus(input);

      // Assert
      expect(result.toolName).toBe('vscode');
    });

    it('should handle multiple suggestions', () => {
      // Arrange
      const suggestions: InstallationSuggestion[] = [
        {
          packageManager: 'brew',
          command: 'brew install code',
          documentationUrl: 'https://code.visualstudio.com/docs/setup/mac',
        },
        {
          packageManager: 'apt',
          command: 'apt install code',
          documentationUrl: 'https://code.visualstudio.com/docs/setup/linux',
          notes: 'Use official repository',
        },
        {
          packageManager: 'choco',
          command: 'choco install vscode',
          documentationUrl: 'https://code.visualstudio.com/docs/setup/windows',
        },
      ];
      const input: ToolInstallationStatus = {
        status: 'missing',
        toolName: 'vscode',
        suggestions,
      };

      // Act
      const result = createToolInstallationStatus(input);

      // Assert
      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions?.[1].notes).toBe('Use official repository');
    });
  });
});
