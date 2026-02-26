/**
 * status Command
 *
 * Displays live status and metrics for the running Shep web UI daemon.
 *
 * Metrics collected:
 *   - PID, port, URL (from daemon.json)
 *   - Uptime (computed from startedAt)
 *   - CPU%, RSS memory (from ps shell-out via execFile — injection-safe)
 *   - Environment: paths, versions, agent executor versions
 *
 * Flags:
 *   --logs [N]   Show last N lines of daemon.log (default 50)
 *   -f, --follow  Follow daemon.log in real-time (like tail -f)
 *
 * Gracefully degrades if ps is unavailable (timeout or error).
 *
 * Usage: shep status
 *        shep status --logs
 *        shep status --logs 100 --follow
 */

import { Command } from 'commander';
import { execFile } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { watch } from 'node:fs';
import { container } from '@/infrastructure/di/container.js';
import type { IDaemonService } from '@/application/ports/output/services/daemon-service.interface.js';
import type { IVersionService } from '@/application/ports/output/services/version-service.interface.js';
import type { IAgentExecutorFactory } from '@/application/ports/output/agents/agent-executor-factory.interface.js';
import {
  getShepHomeDir,
  getShepDbPath,
  getDaemonStatePath,
  getDaemonLogPath,
} from '@/infrastructure/services/filesystem/shep-directory.service.js';
import { renderDetailView, messages, colors } from '../ui/index.js';

const PS_TIMEOUT_MS = 2000;
const VERSION_CMD_TIMEOUT_MS = 3000;
const DEFAULT_LOG_LINES = 50;

interface PsMetrics {
  cpu: string;
  rssMb: string;
}

/**
 * Parse ps output: "pid  cpu%  rss_kb\n"
 * Returns formatted strings for display.
 */
function parsePs(output: string): PsMetrics {
  const parts = output.trim().split(/\s+/);
  const cpu = parts[1] ?? '?';
  const rssKb = parseFloat(parts[2] ?? '0');
  const rssMb = (rssKb / 1024).toFixed(1);
  return { cpu, rssMb };
}

/**
 * Human-readable uptime string, e.g. "2h 14m 3s".
 */
function humanizeUptime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

/**
 * Shell out to ps for CPU% and RSS, with a timeout guard.
 * Uses execFile (not exec) — the PID is a separate array argument,
 * preventing any possibility of shell injection.
 */
function fetchPsMetrics(pid: number): Promise<PsMetrics> {
  return new Promise((resolve) => {
    const pidStr = String(pid);
    let settled = false;

    const fallback = (): PsMetrics => ({ cpu: 'unavailable', rssMb: 'unavailable' });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        resolve(fallback());
      }
    }, PS_TIMEOUT_MS);

    const child = execFile(
      'ps',
      ['-o', 'pid=,pcpu=,rss=', '-p', pidStr],
      { timeout: PS_TIMEOUT_MS },
      (err, stdout) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err || !stdout.trim()) {
          resolve(fallback());
        } else {
          resolve(parsePs(stdout));
        }
      }
    );
  });
}

/**
 * Detect the version of an agent executor CLI.
 * Returns version string or 'not installed'.
 */
function detectAgentVersion(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: VERSION_CMD_TIMEOUT_MS }, (err, stdout) => {
      if (err) {
        resolve('not installed');
      } else {
        // Extract first line, strip leading labels like "claude-code v1.2.3" → "v1.2.3"
        const line = stdout.trim().split('\n')[0] ?? '';
        // Try to extract version-like string
        const match = line.match(/v?\d+\.\d+[\w.-]*/);
        resolve(match ? match[0] : line || 'unknown');
      }
    });
  });
}

/**
 * Read the last N lines of a file.
 */
async function tailFile(filePath: string, lineCount: number): Promise<string[]> {
  const lines: string[] = [];
  const stream = createReadStream(filePath, { encoding: 'utf-8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    lines.push(line);
    if (lines.length > lineCount) {
      lines.shift();
    }
  }

  return lines;
}

/**
 * Follow a file in real-time (like tail -f).
 * Reads new content as the file grows.
 */
function followFile(filePath: string): void {
  let position = 0;
  try {
    position = statSync(filePath).size;
  } catch {
    // File doesn't exist yet, start from 0
  }

  const readNewContent = () => {
    try {
      const currentSize = statSync(filePath).size;
      if (currentSize <= position) {
        if (currentSize < position) position = 0; // File was truncated
        return;
      }

      const stream = createReadStream(filePath, {
        encoding: 'utf-8',
        start: position,
      });

      let buffer = '';
      stream.on('data', (chunk: string) => {
        buffer += chunk;
      });
      stream.on('end', () => {
        position = currentSize;
        if (buffer) {
          process.stdout.write(buffer);
        }
      });
    } catch {
      // File may have been deleted/rotated
    }
  };

  const watcher = watch(filePath, () => {
    readNewContent();
  });

  // Also poll every 1s as a fallback (fs.watch can miss events)
  const interval = setInterval(readNewContent, 1000);

  process.on('SIGINT', () => {
    watcher.close();
    clearInterval(interval);
    process.exit(0);
  });
}

/**
 * Create the status command.
 */
export function createStatusCommand(): Command {
  return new Command('status')
    .description('Show the status of the Shep web UI daemon')
    .option('--logs [lines]', 'Show last N lines of daemon log (default 50)')
    .option('-f, --follow', 'Follow daemon log output in real-time')
    .action(async (options: { logs?: string | true; follow?: boolean }) => {
      const logPath = getDaemonLogPath();

      // Handle --logs flag
      if (options.logs !== undefined || options.follow) {
        if (!existsSync(logPath)) {
          messages.newline();
          messages.info('No daemon log file found.');
          messages.info(`Expected at: ${logPath}`);
          messages.newline();
          return;
        }

        // Show tail lines
        const lineCount =
          typeof options.logs === 'string'
            ? parseInt(options.logs, 10) || DEFAULT_LOG_LINES
            : DEFAULT_LOG_LINES;

        const lines = await tailFile(logPath, lineCount);
        if (lines.length > 0) {
          console.log(lines.join('\n'));
        } else {
          messages.info('Log file is empty.');
        }

        // Follow mode
        if (options.follow) {
          console.log(colors.muted('--- following daemon.log (Ctrl+C to stop) ---'));
          followFile(logPath);
          return; // Block forever (followFile handles SIGINT)
        }

        return;
      }

      const daemonService = container.resolve<IDaemonService>('IDaemonService');

      const state = await daemonService.read();

      if (!state || !daemonService.isAlive(state.pid)) {
        messages.newline();
        messages.info('Shep daemon is not running.');
        messages.info('Run `shep start` to launch it.');
        messages.newline();
        return;
      }

      const { pid, port, startedAt } = state;
      const url = `http://localhost:${port}`;
      const uptimeMs = Date.now() - Date.parse(startedAt);
      const uptime = humanizeUptime(uptimeMs);

      // Get agent CLI info from the factory
      const factory = container.resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
      const agentClis = factory.getCliInfo();

      // Fetch ps metrics and agent versions in parallel
      const [psMetrics, ...agentVersions] = await Promise.all([
        fetchPsMetrics(pid),
        ...agentClis.map((a) => detectAgentVersion(a.cmd, a.versionArgs)),
      ]);

      const { cpu, rssMb } = psMetrics;

      // Get CLI version
      let cliVersion = 'unknown';
      try {
        const versionService = container.resolve<IVersionService>('IVersionService');
        cliVersion = versionService.getVersion().version;
      } catch {
        // Version service not available
      }

      renderDetailView({
        title: 'Shep Daemon Status',
        sections: [
          {
            fields: [
              { label: 'PID', value: String(pid) },
              { label: 'Port', value: String(port) },
              { label: 'URL', value: url },
              { label: 'Started', value: new Date(startedAt).toLocaleString() },
              { label: 'Uptime', value: uptime },
              { label: 'CPU %', value: cpu === 'unavailable' ? 'unavailable' : `${cpu}%` },
              {
                label: 'Memory (RSS)',
                value: rssMb === 'unavailable' ? 'unavailable' : `${rssMb} MB`,
              },
            ],
          },
          {
            title: 'Environment',
            fields: [
              { label: 'Shep Home', value: getShepHomeDir() },
              { label: 'CLI Version', value: cliVersion },
              { label: 'Node Version', value: process.version },
              { label: 'DB Path', value: getShepDbPath() },
              { label: 'Log File', value: logPath },
              { label: 'Daemon Config', value: getDaemonStatePath() },
            ],
          },
          {
            title: 'Agent Executors',
            fields: agentClis.map((agent, i) => ({
              label: agent.agentType as string,
              value: agentVersions[i],
            })),
          },
        ],
      });
    });
}
