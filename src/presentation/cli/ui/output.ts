/**
 * Output Format Utilities
 *
 * Provides utilities for formatting output in multiple formats:
 * - Table (default, clean text-based layout)
 * - JSON (structured data)
 * - YAML (human-readable structured data)
 *
 * @module output
 */

import yaml from 'js-yaml';
import { TableFormatter, type DatabaseMeta } from './tables.js';

export type OutputFormat = 'table' | 'json' | 'yaml';

/**
 * Output formatter for multiple formats
 */
export class OutputFormatter {
  /**
   * Formats data according to the specified output format
   */
  static format(data: unknown, format: OutputFormat, dbMeta?: DatabaseMeta): string {
    switch (format) {
      case 'table':
        return OutputFormatter.formatAsTable(data, dbMeta);
      case 'json':
        return OutputFormatter.formatAsJSON(data);
      case 'yaml':
        return OutputFormatter.formatAsYAML(data);
    }
  }

  /**
   * Formats data as a clean text display
   */
  static formatAsTable(data: unknown, dbMeta?: DatabaseMeta): string {
    return TableFormatter.createSettingsTable(data, dbMeta);
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
