/**
 * Agent Logs Command
 *
 * View log output for an agent run with efficient streaming.
 *
 * Usage:
 *   shep agent logs <id>         # Print full log
 *   shep agent logs -f <id>      # Follow (tail -f) using fs.watch
 *   shep agent logs -n 50 <id>   # Last 50 lines
 */

import { Command } from 'commander';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { messages } from '../../ui/index.js';
import { resolveAgentRun } from './resolve-run.js';
import { viewLog } from '../log-viewer.js';

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
        const ok = await viewLog({
          logPath,
          follow: opts.follow,
          lines: parseInt(opts.lines, 10),
          label: `run ${resolved.run.id.substring(0, 8)}`,
        });

        if (!ok) {
          process.exitCode = 1;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to read agent logs', err);
        process.exitCode = 1;
      }
    });
}
