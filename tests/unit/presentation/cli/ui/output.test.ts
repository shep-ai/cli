/**
 * OutputFormatter Unit Tests
 *
 * Tests for the OutputFormatter that handles multiple output formats.
 *
 * TDD Phase: RED
 * - These tests are written BEFORE implementation
 * - All tests should FAIL initially because formatters don't work yet
 */

import { describe, it, expect } from 'vitest';
import { OutputFormatter } from '../../../../../src/presentation/cli/ui/output.js';
import { createDefaultSettings } from '../../../../../src/domain/factories/settings-defaults.factory.js';

describe('OutputFormatter', () => {
  const sampleSettings = createDefaultSettings();

  describe('format()', () => {
    it('should format as table when format is "table"', () => {
      // Act
      const result = OutputFormatter.format(sampleSettings, 'table');

      // Assert - Should return a formatted table string
      expect(result).toBeTypeOf('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Models'); // Table should have section headers
    });

    it('should format as JSON when format is "json"', () => {
      // Act
      const result = OutputFormatter.format(sampleSettings, 'json');

      // Assert - Should return valid JSON
      expect(result).toBeTypeOf('string');
      expect(() => JSON.parse(result)).not.toThrow();

      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('models');
    });

    it('should format as YAML when format is "yaml"', () => {
      // Act
      const result = OutputFormatter.format(sampleSettings, 'yaml');

      // Assert - Should return valid YAML
      expect(result).toBeTypeOf('string');
      expect(result).toContain('models:');
      expect(result).toContain('environment:');
    });
  });

  describe('formatAsTable()', () => {
    it('should return a non-empty string', () => {
      // Act
      const result = OutputFormatter.formatAsTable(sampleSettings);

      // Assert
      expect(result).toBeTypeOf('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include section headers', () => {
      // Act
      const result = OutputFormatter.formatAsTable(sampleSettings);

      // Assert
      expect(result).toContain('Models');
      expect(result).toContain('Environment');
      expect(result).toContain('System');
    });
  });

  describe('formatAsJSON()', () => {
    it('should return valid JSON string', () => {
      // Act
      const result = OutputFormatter.formatAsJSON(sampleSettings);

      // Assert
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should include all settings properties', () => {
      // Act
      const result = OutputFormatter.formatAsJSON(sampleSettings);
      const parsed = JSON.parse(result);

      // Assert
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('models');
      expect(parsed).toHaveProperty('user');
      expect(parsed).toHaveProperty('environment');
      expect(parsed).toHaveProperty('system');
    });

    it('should be properly formatted (2-space indent)', () => {
      // Act
      const result = OutputFormatter.formatAsJSON(sampleSettings);

      // Assert - Check for indentation (JSON.stringify with 2 spaces)
      expect(result).toMatch(/\n {2}"/);
    });
  });

  describe('formatAsYAML()', () => {
    it('should return valid YAML string', () => {
      // Act
      const result = OutputFormatter.formatAsYAML(sampleSettings);

      // Assert
      expect(result).toBeTypeOf('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should contain YAML syntax', () => {
      // Act
      const result = OutputFormatter.formatAsYAML(sampleSettings);

      // Assert
      expect(result).toContain('models:');
      expect(result).toContain('environment:');
      expect(result).toContain('system:');
    });

    it('should be properly indented (2 spaces)', () => {
      // Act
      const result = OutputFormatter.formatAsYAML(sampleSettings);

      // Assert - Check for indented keys
      expect(result).toMatch(/^ {2}\w+:/m);
    });
  });
});
