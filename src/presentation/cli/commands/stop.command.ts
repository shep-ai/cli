/**
 * stop Command
 *
 * Stops the running Shep web UI daemon.
 * Stop logic is implemented in the shared stopDaemon() helper.
 *
 * Usage: shep stop
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import type { IDaemonService } from '@/application/ports/output/services/daemon-service.interface.js';
import { messages } from '../ui/index.js';
import { stopDaemon } from './daemon/stop-daemon.js';

/**
 * Create the stop command.
 */
export function createStopCommand(): Command {
  return new Command('stop').description('Stop the running Shep web UI daemon').action(async () => {
    const daemonService = container.resolve<IDaemonService>('IDaemonService');

    const state = await daemonService.read();

    // Print a user-facing message when no daemon state is recorded at all.
    // The alive-but-stale case (state exists, PID dead) is handled silently by stopDaemon.
    if (!state) {
      messages.info('No Shep daemon is running.');
    }

    await stopDaemon(daemonService);
  });
}
