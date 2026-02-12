/**
 * Version Command
 *
 * Displays detailed version information for Shep AI CLI.
 * Provides more context than the --version flag.
 *
 * Usage: shep version
 *
 * @example
 * $ shep version
 * @shepai/cli v0.1.0
 * Autonomous AI Native SDLC Platform
 *
 * Node:     v20.10.0
 * Platform: linux x64
 */

import { Command } from 'commander';
import { container } from '../../../infrastructure/di/container.js';
import type { IVersionService } from '../../../application/ports/output/services/version-service.interface.js';
import { colors, fmt, messages } from '../ui/index.js';

/**
 * Create the version command
 */
export function createVersionCommand(): Command {
  return new Command('version').description('Display version information').action(() => {
    const versionService = container.resolve<IVersionService>('IVersionService');
    const info = versionService.getVersion();

    messages.newline();
    console.log(`${fmt.heading(info.name)} ${fmt.version(info.version)}`);
    console.log(colors.muted(info.description));
    messages.newline();
    console.log(`${fmt.label('Node:')}     ${process.version}`);
    console.log(`${fmt.label('Platform:')} ${process.platform} ${process.arch}`);
    messages.newline();
  });
}
