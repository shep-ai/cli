/**
 * Shared Log Viewer
 *
 * Displays a log file with support for follow mode and tail lines.
 * Used by both `shep agent logs` and `shep feat logs`.
 */

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
import { messages } from '../ui/index.js';

export interface LogViewerOptions {
  /** Absolute path to the log file */
  logPath: string;
  /** Follow log output (like tail -f) */
  follow?: boolean;
  /** Number of lines to show from the end (0 = all) */
  lines: number;
  /** Label for error messages (e.g. "run abc123", "feature my-feat") */
  label: string;
}

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

/**
 * Display a log file to stdout with optional follow mode and tail lines.
 *
 * @returns false if the log file doesn't exist or is empty (in non-follow mode)
 */
export async function viewLog(opts: LogViewerOptions): Promise<boolean> {
  const { logPath, follow, lines: requestedLines, label } = opts;

  if (!existsSync(logPath)) {
    messages.error(`No log file found for ${label}`);
    messages.info(`Expected: ${logPath}`);
    return false;
  }

  const stat = statSync(logPath);
  if (stat.size === 0) {
    messages.info(`Log file is empty for ${label}`);
    if (!follow) return false;
    // In follow mode, continue — the file will grow
  }

  if (follow) {
    // Print existing content first
    if (stat.size > 0) {
      if (requestedLines > 0) {
        process.stdout.write(readTailLines(logPath, requestedLines));
        if (!process.stdout.destroyed) process.stdout.write('\n');
      } else {
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

  return true;
}
