/**
 * Output Format Utilities
 *
 * Provides utilities for formatting output in multiple formats:
 * - Table (default, using cli-table3)
 * - JSON (structured data)
 * - YAML (human-readable structured data)
 *
 * @module output
 */

import yaml from 'js-yaml';
import { TableFormatter } from './tables.js';

export type OutputFormat = 'table' | 'json' | 'yaml';

/**
 * Output formatter for multiple formats
 */
export class OutputFormatter {
  /**
   * Formats data according to the specified output format
   */
  static format(data: unknown, format: OutputFormat): string {
    switch (format) {
      case 'table':
        return OutputFormatter.formatAsTable(data);
      case 'json':
        return OutputFormatter.formatAsJSON(data);
      case 'yaml':
        return OutputFormatter.formatAsYAML(data);
    }
  }

  /**
   * Formats data as a table
   */
  static formatAsTable(data: unknown): string {
    const table = TableFormatter.createSettingsTable(data);
    return table.toString();
  }

  /**
   * Formats data as JSON
   */
  static formatAsJSON(data: unknown): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Formats data as YAML
   */
  static formatAsYAML(data: unknown): string {
    return yaml.dump(data, { indent: 2, lineWidth: -1 });
  }
}
