/**
 * Tools Command Group
 *
 * Provides subcommands for listing and managing development tools.
 *
 * Usage:
 *   shep tools list   # List all tools with their installed status
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { ListToolsUseCase } from '@/application/use-cases/tools/list-tools.use-case.js';

/**
 * Create the tools command group
 */
export function createToolsCommand(): Command {
  const tools = new Command('tools').description('Manage development tools (IDEs and CLI agents)');

  tools
    .command('list')
    .description('List all available tools with their installed status')
    .action(async () => {
      try {
        const listToolsUseCase = container.resolve(ListToolsUseCase);
        const result = await listToolsUseCase.execute();

        for (const tool of result) {
          const statusLabel = tool.status.status === 'available' ? 'installed' : 'missing';
          console.log(`[${statusLabel}]  ${tool.id}  ${tool.name}`);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`Error listing tools: ${err.message}`);
        process.exitCode = 1;
      }
    });

  return tools;
}
