/**
 * Show Settings Command
 *
 * Displays current Shep settings with multiple output format support.
 *
 * Usage:
 *   shep settings show                 # Display as table (default)
 *   shep settings show --output json   # Display as JSON
 *   shep settings show -o yaml         # Display as YAML
 */

import { Command, Option } from 'commander';
import { OutputFormatter, type OutputFormat } from '../../ui/output.js';
import { getShepDbPath } from '@/infrastructure/services/filesystem/shep-directory.service.js';
import { getSettings } from '@/infrastructure/services/settings.service.js';
import { statSync } from 'node:fs';
import { messages } from '../../ui/index.js';

/**
 * Create the show settings command
 */
export function createShowCommand(): Command {
  return new Command('show')
    .description('Display current settings')
    .addOption(
      new Option('-o, --output <format>', 'Output format: table|json|yaml')
        .choices(['table', 'json', 'yaml'])
        .default('table')
    )
    .addHelpText(
      'after',
      `
Examples:
  $ shep settings show                 Display settings as table
  $ shep settings show --output json   Display settings as JSON
  $ shep settings show -o yaml         Display settings as YAML`
    )
    .action((options: { output: OutputFormat }) => {
      try {
        const settings = getSettings();

        // Build database metadata for table format
        const dbMeta = options.output === 'table' ? getDatabaseMeta() : undefined;

        const output = OutputFormatter.format(settings, options.output, dbMeta);
        console.log(output);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to load settings', err);
        process.exitCode = 1;
      }
    });
}

function getDatabaseMeta() {
  const dbPath = getShepDbPath();
  let size = 'unknown';
  try {
    const stats = statSync(dbPath);
    size = formatFileSize(stats.size);
  } catch {
    // File may not be accessible
  }
  return { path: dbPath, size };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
