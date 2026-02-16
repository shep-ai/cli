/**
 * Install Command
 *
 * Installs a development tool (IDE or CLI agent) on the system.
 *
 * Usage:
 *   shep install <tool>           Install a tool
 *   shep install <tool> --how     Show installation instructions without executing
 *
 * Available tools:
 *   - vscode, cursor, windsurf, zed, antigravity (IDEs)
 *   - cursor-cli, claude-code (CLI agents)
 */

import { Command } from 'commander';
import { container } from '../../../infrastructure/di/container.js';
import { ValidateToolAvailabilityUseCase } from '../../../application/use-cases/tools/validate-tool-availability.use-case.js';
import { InstallToolUseCase } from '../../../application/use-cases/tools/install-tool.use-case.js';
import { TOOL_METADATA } from '../../../infrastructure/services/tool-installer/tool-metadata.js';
import { messages, fmt, colors } from '../ui/index.js';

interface InstallOptions {
  how?: boolean;
}

export function createInstallCommand(): Command {
  return new Command('install')
    .description('Install a development tool (IDE or CLI agent)')
    .argument(
      '<tool>',
      'Tool to install (vscode, cursor, windsurf, zed, antigravity, cursor-cli, claude-code)'
    )
    .option('--how', 'Show installation instructions without executing')
    .action(async (tool: string, options: InstallOptions) => {
      try {
        // Validate tool name
        const metadata = TOOL_METADATA[tool];
        if (!metadata) {
          messages.error(
            `Unknown tool: "${tool}". Available: ${Object.keys(TOOL_METADATA).join(', ')}`,
            new Error(`Unknown tool: ${tool}`)
          );
          process.exitCode = 1;
          return;
        }

        if (options.how) {
          // Print installation instructions without executing
          printInstallInstructions(tool, metadata);
          return;
        }

        // Check availability first
        const validateUseCase = container.resolve(ValidateToolAvailabilityUseCase);
        const status = await validateUseCase.execute(tool);

        if (status.status === 'available') {
          messages.success(`${tool} is already installed`);
          return;
        }

        // Install
        const installUseCase = container.resolve(InstallToolUseCase);
        const result = await installUseCase.execute(tool, (data) => process.stdout.write(data));

        if (result.status === 'available') {
          messages.success(`${tool} installed successfully`);
        } else {
          messages.error(
            `Failed to install ${tool}: ${result.errorMessage ?? 'Unknown error'}`,
            new Error(result.errorMessage ?? 'Installation failed')
          );
          process.exitCode = 1;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error(`Failed to install ${tool}`, err);
        process.exitCode = 1;
      }
    });
}

/**
 * Print installation instructions for a tool
 */
function printInstallInstructions(
  toolName: string,
  metadata: (typeof TOOL_METADATA)[keyof typeof TOOL_METADATA]
) {
  console.log();
  console.log(fmt.heading(`Installation Instructions for ${toolName}`));
  console.log();

  console.log(`${fmt.label('Binary:')} ${metadata.binary}`);
  console.log(`${fmt.label('Package Manager:')} ${metadata.packageManager}`);
  console.log();

  // Print platform-specific commands
  console.log(fmt.heading('Installation Commands'));
  for (const [platform, commands] of Object.entries(metadata.commands)) {
    console.log(`${colors.muted(`[${platform}]`)} ${commands.join(' ')}`);
  }
  console.log();

  // Print documentation link
  console.log(fmt.heading('Documentation'));
  console.log(`${colors.muted('→')} ${metadata.documentationUrl}`);
  console.log();

  // Print verify command
  console.log(fmt.heading('Verify Installation'));
  console.log(`${colors.muted('$')} ${metadata.verifyCommand.join(' ')}`);
  console.log();

  if (metadata.notes) {
    console.log(fmt.heading('Notes'));
    console.log(`${colors.muted('→')} ${metadata.notes}`);
    console.log();
  }
}
