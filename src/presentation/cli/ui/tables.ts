/**
 * Table Formatting Utilities
 *
 * Provides clean text-based rendering for structured CLI output.
 * Uses alignment, whitespace, and colors instead of box-drawing borders.
 *
 * @module tables
 */

import type { Settings } from '@/domain/generated/output.js';
import { colors } from './colors.js';
import pc from 'picocolors';

export interface DatabaseMeta {
  path: string;
  size: string;
}

/**
 * Table formatter for CLI output
 */
export class TableFormatter {
  private static readonly LABEL_WIDTH = 15;

  /**
   * Creates a clean, formatted settings display string.
   */
  static createSettingsTable(settings: unknown, dbMeta?: DatabaseMeta): string {
    const s = settings as Settings;
    const lines: string[] = [];

    lines.push(`  ${pc.bold(colors.brand('Settings'))}`);
    lines.push('');

    // Models
    lines.push(
      ...TableFormatter.section('Models', [
        ['Analyze', s.models.analyze],
        ['Requirements', s.models.requirements],
        ['Plan', s.models.plan],
        ['Implement', s.models.implement],
      ])
    );

    // User
    lines.push(
      ...TableFormatter.section('User', [
        ['Name', s.user.name],
        ['Email', s.user.email],
        ['GitHub', s.user.githubUsername],
      ])
    );

    // Environment
    lines.push(
      ...TableFormatter.section('Environment', [
        ['Editor', s.environment.defaultEditor],
        ['Shell', s.environment.shellPreference],
      ])
    );

    // System
    lines.push(
      ...TableFormatter.section('System', [
        ['Auto-Update', String(s.system.autoUpdate)],
        ['Log Level', s.system.logLevel],
      ])
    );

    // Agent
    lines.push(
      ...TableFormatter.section('Agent', [
        ['Type', s.agent.type],
        ['Auth', s.agent.authMethod],
        ...(s.agent.token ? [['Token', '••••••••'] as [string, string | undefined]] : []),
      ])
    );

    // Database
    if (dbMeta) {
      lines.push(
        ...TableFormatter.section('Database', [
          ['Path', dbMeta.path],
          ['Size', dbMeta.size],
        ])
      );
    }

    return lines.join('\n');
  }

  private static section(title: string, rows: [string, string | undefined][]): string[] {
    const lines: string[] = [];
    lines.push(`  ${pc.bold(title)}`);
    for (const [label, value] of rows) {
      const paddedLabel = label.padEnd(TableFormatter.LABEL_WIDTH);
      if (value === undefined || value === null) {
        lines.push(`    ${colors.muted(paddedLabel)}${pc.italic(colors.muted('(not set)'))}`);
      } else {
        lines.push(`    ${colors.muted(paddedLabel)}${value}`);
      }
    }
    lines.push('');
    return lines;
  }
}
