/**
 * CLI Design System - Detail View
 *
 * Renders clean KEY  VALUE displays for "show" commands.
 * Aligned labels in muted color, grouped into optional sections,
 * with support for text blocks (prompts, results, errors).
 *
 * @example
 * renderDetailView({
 *   title: 'Agent Run',
 *   sections: [
 *     { fields: [{ label: 'ID', value: '123' }, { label: 'Status', value: colors.success('completed') }] },
 *     { title: 'Timing', fields: [{ label: 'Started', value: '...' }] },
 *   ],
 *   textBlocks: [{ title: 'Result', content: 'output here' }],
 * });
 */

import pc from 'picocolors';
import { colors } from './colors.js';
import { fmt } from './formatters.js';

export interface DetailField {
  label: string;
  value: string | undefined | null;
}

export interface DetailSection {
  title?: string;
  fields: DetailField[];
}

export interface DetailTextBlock {
  title: string;
  content: string;
  color?: (text: string) => string;
}

export interface DetailViewConfig {
  title: string;
  sections: DetailSection[];
  textBlocks?: DetailTextBlock[];
}

/**
 * Render a detail view to stdout.
 *
 * Fields with null/undefined values are silently skipped.
 * Each section auto-aligns labels to the longest visible label in that section.
 */
export function renderDetailView(config: DetailViewConfig): void {
  const lines: string[] = [];

  lines.push('');
  lines.push(`  ${fmt.heading(config.title)}`);

  for (const section of config.sections) {
    const visible = section.fields.filter((f) => f.value != null);
    if (visible.length === 0) continue;

    lines.push('');
    if (section.title) {
      lines.push(`  ${pc.bold(section.title)}`);
    }

    const labelWidth = Math.max(...visible.map((f) => f.label.length)) + 2;

    for (const field of visible) {
      const padded = field.label.padEnd(labelWidth);
      lines.push(`  ${colors.muted(padded)}${field.value}`);
    }
  }

  if (config.textBlocks) {
    for (const block of config.textBlocks) {
      lines.push('');
      lines.push(`  ${pc.bold(block.title)}`);
      const text = block.color ? block.color(block.content) : block.content;
      for (const line of text.split('\n')) {
        lines.push(`  ${line}`);
      }
    }
  }

  lines.push('');
  console.log(lines.join('\n'));
}
