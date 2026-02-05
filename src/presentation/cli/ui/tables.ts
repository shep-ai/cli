/**
 * Table Formatting Utilities
 *
 * Provides utilities for rendering structured data as formatted tables
 * in the terminal using cli-table3.
 *
 * @module tables
 */

import Table from 'cli-table3';
import type { Settings } from '../../../domain/generated/output.js';

/**
 * Table formatter for CLI output
 */
export class TableFormatter {
  /**
   * Creates a formatted table for settings data
   */
  static createSettingsTable(settings: unknown): InstanceType<typeof Table> {
    const s = settings as Settings;

    const table = new Table({
      style: { head: [], border: [] },
    });

    // Models section
    table.push(
      [{ colSpan: 2, content: 'Models', hAlign: 'center' }],
      ['Analyze', s.models.analyze],
      ['Requirements', s.models.requirements],
      ['Plan', s.models.plan],
      ['Implement', s.models.implement]
    );

    // User section
    table.push(
      [{ colSpan: 2, content: 'User', hAlign: 'center' }],
      ['Name', s.user.name ?? '(not set)'],
      ['Email', s.user.email ?? '(not set)'],
      ['GitHub', s.user.githubUsername ?? '(not set)']
    );

    // Environment section
    table.push(
      [{ colSpan: 2, content: 'Environment', hAlign: 'center' }],
      ['Editor', s.environment.defaultEditor],
      ['Shell', s.environment.shellPreference]
    );

    // System section
    table.push(
      [{ colSpan: 2, content: 'System', hAlign: 'center' }],
      ['Auto-Update', String(s.system.autoUpdate)],
      ['Log Level', s.system.logLevel]
    );

    return table;
  }
}
