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

const IDE_TOOLS = ['vscode', 'cursor', 'windsurf', 'zed', 'antigravity'];

function printToolsList(): void {
  const tools = Object.keys(TOOL_METADATA);
  const ides = tools.filter((t) => IDE_TOOLS.includes(t));
  const cliAgents = tools.filter((t) => !IDE_TOOLS.includes(t));

  console.log(fmt.heading('IDEs:'));
  for (const key of ides) {
    const note = TOOL_METADATA[key].notes ?? '';
    console.log(`  ${colors.accent(key.padEnd(16))}${colors.muted(note)}`);
  }
  console.log();

  console.log(fmt.heading('CLI Agents:'));
  for (const key of cliAgents) {
    const note = TOOL_METADATA[key].notes ?? '';
    console.log(`  ${colors.accent(key.padEnd(16))}${colors.muted(note)}`);
  }
  console.log();
}

export function createInstallCommand(): Command {
  return new Command('install')
    .description('Install a development tool (IDE or CLI agent)')
    .argument(
      '[tool]',
      'Tool to install (vscode, cursor, windsurf, zed, antigravity, cursor-cli, claude-code)'
    )
    .option('--how', 'Show installation instructions without executing')
    .action(async (tool: string | undefined, options: InstallOptions) => {
      try {
        // No tool specified — show available tools
        if (!tool) {
          console.log();
          console.log(`Run ${fmt.code('shep install <tool>')} with one of these options:`);
          console.log();
          printToolsList();
          return;
        }

        // Validate tool name
        const metadata = TOOL_METADATA[tool];
        if (!metadata) {
          console.log();
          console.log(`Hmm, I don't recognize '${tool}'. Did you mean one of these?`);
          console.log();
          printToolsList();
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

        // Tools that don't support auto-install — show instructions instead
        if (metadata.autoInstall === false) {
          messages.warning(`${tool} does not support automated installation`);
          printInstallInstructions(tool, metadata);
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

  const binaryDisplay =
    typeof metadata.binary === 'string'
      ? metadata.binary
      : Object.entries(metadata.binary)
          .map(([platform, bin]) => `${bin} (${platform})`)
          .join(', ');
  console.log(`${fmt.label('Binary:')} ${binaryDisplay}`);
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
