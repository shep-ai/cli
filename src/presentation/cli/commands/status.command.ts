/**
 * status Command
 *
 * Displays live status and metrics for the running Shep web UI daemon.
 *
 * Metrics collected:
 *   - PID, port, URL (from daemon.json)
 *   - Uptime (computed from startedAt)
 *   - CPU%, RSS memory (from ps shell-out via execFile — injection-safe)
 *
 * Gracefully degrades if ps is unavailable (timeout or error).
 *
 * Usage: shep status
 */

import { Command } from 'commander';
import { execFile } from 'node:child_process';
import { container } from '@/infrastructure/di/container.js';
import type { IDaemonService } from '@/application/ports/output/services/daemon-service.interface.js';
import { renderDetailView, messages } from '../ui/index.js';

const PS_TIMEOUT_MS = 2000;

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
 * Create the status command.
 */
export function createStatusCommand(): Command {
  return new Command('status')
    .description('Show the status of the Shep web UI daemon')
    .action(async () => {
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

      const { cpu, rssMb } = await fetchPsMetrics(pid);

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
        ],
      });
    });
}
