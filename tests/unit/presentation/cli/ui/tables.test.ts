/**
 * TableFormatter Unit Tests
 *
 * Tests for the TableFormatter that creates formatted tables for CLI output.
 *
 * TDD Phase: RED
 * - These tests are written BEFORE implementation
 * - All tests should FAIL initially because formatter doesn't work yet
 */

import { describe, it, expect } from 'vitest';
import type Table from 'cli-table3';
import { TableFormatter } from '../../../../../src/presentation/cli/ui/tables.js';
import { createDefaultSettings } from '../../../../../src/domain/factories/settings-defaults.factory.js';

describe('TableFormatter', () => {
  const sampleSettings = createDefaultSettings();

  describe('createSettingsTable()', () => {
    it('should return a Table instance', () => {
      // Act
      const result = TableFormatter.createSettingsTable(sampleSettings);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result.toString).toBe('function'); // Tables have toString method
    });

    it('should create table with settings data', () => {
      // Act
      const table = TableFormatter.createSettingsTable(sampleSettings);
      const tableString = table.toString();

      // Assert
      expect(tableString).toBeTypeOf('string');
      expect(tableString.length).toBeGreaterThan(0);
    });

    it('should include all settings sections', () => {
      // Act
      const table = TableFormatter.createSettingsTable(sampleSettings);
      const tableString = table.toString();

      // Assert
      expect(tableString).toContain('Models');
      expect(tableString).toContain('Environment');
      expect(tableString).toContain('System');
    });

    it('should handle nested objects in settings', () => {
      // Act
      const table = TableFormatter.createSettingsTable(sampleSettings);
      const tableString = table.toString();

      // Assert - Should include nested values (e.g., models.analyze)
      expect(tableString).toContain('claude-sonnet-4-5'); // Default model name
    });
  });
});
