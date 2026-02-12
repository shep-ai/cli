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
import {
  closeSync,
  createReadStream,
  existsSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  watch,
} from 'node:fs';
import { open } from 'node:fs/promises';
import { colors, messages } from '../../ui/index.js';
import { resolveAgentRun } from './resolve-run.js';

/** Read the last N lines from a file without loading it all into memory */
function readTailLines(filePath: string, n: number): string {
  const stat = statSync(filePath);
  // For small files (< 64KB), just read the whole thing
  if (stat.size < 65536) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    return lines.slice(Math.max(0, lines.length - n)).join('\n');
  }
  // For large files, read from the end in chunks
  const fd = openSync(filePath, 'r');
  const chunkSize = Math.min(stat.size, 8192);
  let found = 0;
  let pos = stat.size;
  let tail = '';
  const buf = Buffer.alloc(chunkSize);
  while (pos > 0 && found <= n) {
    const readSize = Math.min(chunkSize, pos);
    pos -= readSize;
    readSync(fd, buf, 0, readSize, pos);
    const chunk = buf.toString('utf-8', 0, readSize);
    tail = chunk + tail;
    for (const ch of chunk) {
      if (ch === '\n') found++;
    }
  }
  closeSync(fd);
  const lines = tail.split('\n');
  return lines.slice(Math.max(0, lines.length - n)).join('\n');
}

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
          if (!opts.follow) return;
          // In follow mode, continue — the file will grow
        }

        const requestedLines = parseInt(opts.lines, 10);

        if (opts.follow) {
          // Print existing content first
          if (stat.size > 0) {
            if (requestedLines > 0) {
              process.stdout.write(readTailLines(logPath, requestedLines));
              if (!process.stdout.destroyed) process.stdout.write('\n');
            } else {
              // Stream existing content without loading entire file into memory
              await new Promise<void>((resolve, reject) => {
                const stream = createReadStream(logPath, { encoding: 'utf-8' });
                stream.pipe(process.stdout, { end: false });
                stream.on('end', resolve);
                stream.on('error', reject);
              });
            }
          }

          // Follow new content using fs.watch (event-driven, no polling)
          let position = stat.size;
          const handle = await open(logPath, 'r');
          // Reusable 4KB buffer for incremental reads
          const readBuf = Buffer.alloc(4096);

          const readNewContent = async () => {
            try {
              const currentStat = statSync(logPath);
              while (position < currentStat.size) {
                const bytesToRead = Math.min(readBuf.length, currentStat.size - position);
                const { bytesRead } = await handle.read(readBuf, 0, bytesToRead, position);
                if (bytesRead === 0) break;
                process.stdout.write(readBuf.toString('utf-8', 0, bytesRead));
                position += bytesRead;
              }
            } catch {
              // File may have been deleted/rotated
            }
          };

          // Use fs.watch for efficient OS-level file change notifications
          const watcher = watch(logPath, { persistent: true }, () => {
            readNewContent();
          });

          // Fallback poll every 2s in case fs.watch misses events (NFS, etc.)
          const fallbackInterval = setInterval(readNewContent, 2000);

          const cleanup = async () => {
            watcher.close();
            clearInterval(fallbackInterval);
            await handle.close();
          };

          process.on('SIGINT', async () => {
            await cleanup();
            process.exit(0);
          });

          process.on('SIGTERM', async () => {
            await cleanup();
            process.exit(0);
          });
        } else {
          // Print mode
          if (requestedLines > 0) {
            process.stdout.write(readTailLines(logPath, requestedLines));
            process.stdout.write('\n');
          } else {
            // Stream the file — don't load it all into memory
            await new Promise<void>((resolve, reject) => {
              const stream = createReadStream(logPath, { encoding: 'utf-8' });
              stream.pipe(process.stdout, { end: false });
              stream.on('end', () => {
                process.stdout.write('\n');
                resolve();
              });
              stream.on('error', reject);
            });
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to read agent logs', err);
        process.exitCode = 1;
      }
    });
}
