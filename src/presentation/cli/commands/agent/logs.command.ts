/**
 * Agent Logs Command
 *
 * View log output for an agent run.
 *
 * Usage:
 *   shep agent logs <id>         # Print full log
 *   shep agent logs -f <id>      # Follow (tail -f)
 *   shep agent logs -n 50 <id>   # Last 50 lines
 */

import { Command } from 'commander';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { colors, messages } from '../../ui/index.js';
import { resolveAgentRun } from './resolve-run.js';

export function createLogsCommand(): Command {
  return new Command('logs')
    .description('View agent run logs')
    .argument('<id>', 'Agent run ID (or prefix)')
    .option('-f, --follow', 'Follow log output (like tail -f)')
    .option('-n, --lines <count>', 'Number of lines to show from the end', '0')
    .action(async (id: string, opts: { follow?: boolean; lines: string }) => {
      try {
        const resolved = await resolveAgentRun(id);
        if ('error' in resolved) {
          messages.error(resolved.error);
          process.exitCode = 1;
          return;
        }

        const logPath = join(homedir(), '.shep', 'logs', `worker-${resolved.run.id}.log`);

        if (!existsSync(logPath)) {
          messages.error(`No log file found for run ${resolved.run.id.substring(0, 8)}`);
          messages.info(`Expected: ${logPath}`);
          process.exitCode = 1;
          return;
        }

        const stat = statSync(logPath);
        if (stat.size === 0) {
          messages.info(
            `Log file is empty for run ${colors.accent(resolved.run.id.substring(0, 8))}`
          );
          return;
        }

        const tailLines = parseInt(opts.lines, 10);

        if (opts.follow) {
          // Follow mode: print existing content then watch for changes
          const content = readFileSync(logPath, 'utf-8');
          const lines = content.split('\n');
          const startFrom = tailLines > 0 ? Math.max(0, lines.length - tailLines) : 0;
          process.stdout.write(lines.slice(startFrom).join('\n'));

          // Watch for new content
          let position = stat.size;
          const handle = await open(logPath, 'r');

          const interval = setInterval(async () => {
            try {
              const currentStat = statSync(logPath);
              if (currentStat.size > position) {
                const buf = Buffer.alloc(currentStat.size - position);
                await handle.read(buf, 0, buf.length, position);
                process.stdout.write(buf.toString('utf-8'));
                position = currentStat.size;
              }
            } catch {
              clearInterval(interval);
              await handle.close();
            }
          }, 200);

          // Handle Ctrl+C
          process.on('SIGINT', async () => {
            clearInterval(interval);
            await handle.close();
            process.exit(0);
          });
        } else {
          // Print mode: dump log content
          const content = readFileSync(logPath, 'utf-8');
          if (tailLines > 0) {
            const lines = content.split('\n');
            process.stdout.write(
              `${lines.slice(Math.max(0, lines.length - tailLines)).join('\n')}\n`
            );
          } else {
            process.stdout.write(content);
            if (!content.endsWith('\n')) process.stdout.write('\n');
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to read agent logs', err);
        process.exitCode = 1;
      }
    });
}
