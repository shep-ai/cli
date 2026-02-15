/**
 * Feature New Command
 *
 * Creates a new feature with a git branch and worktree.
 *
 * Usage: shep feat new <description> [options]
 *
 * @example
 * $ shep feat new "Add user authentication"
 * $ shep feat new "Add login page" --repo /path/to/project
 */

import { Command } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import { CreateFeatureUseCase } from '../../../../application/use-cases/features/create-feature.use-case.js';
import type { ApprovalGates } from '../../../../domain/generated/output.js';
import { colors, messages, spinner } from '../../ui/index.js';

interface NewOptions {
  repo?: string;
  interactive?: boolean;
  allowPrd?: boolean;
  allowPlan?: boolean;
  allowAll?: boolean;
}

/**
 * Create the feat new command
 */
export function createNewCommand(): Command {
  return new Command('new')
    .description('Create a new feature')
    .argument('<description>', 'Feature description')
    .option('-r, --repo <path>', 'Repository path (defaults to current directory)')
    .option('--interactive', 'Require approval after every agent step')
    .option('--allow-prd', 'Auto-approve through requirements, pause after')
    .option('--allow-plan', 'Auto-approve through planning, pause at implementation')
    .option('--allow-all', 'Run fully autonomous (no approval pauses)')
    .action(async (description: string, options: NewOptions) => {
      try {
        const useCase = container.resolve(CreateFeatureUseCase);
        const repoPath = options.repo ?? process.cwd();

        // Build approval gates from flags
        let approvalGates: ApprovalGates | undefined;
        if (options.interactive) approvalGates = { allowPrd: false, allowPlan: false };
        if (options.allowPrd) approvalGates = { allowPrd: true, allowPlan: false };
        if (options.allowPlan) approvalGates = { allowPrd: true, allowPlan: true };
        if (options.allowAll) approvalGates = undefined; // no gates = fully autonomous

        const feature = await spinner('Thinking', () =>
          useCase.execute({
            userInput: description,
            repositoryPath: repoPath,
            approvalGates,
          })
        );

        messages.newline();
        messages.success('Feature created');
        console.log(`  ${colors.muted('ID:')}     ${colors.accent(feature.id)}`);
        console.log(`  ${colors.muted('Name:')}   ${feature.name}`);
        console.log(`  ${colors.muted('Branch:')} ${colors.accent(feature.branch)}`);
        console.log(`  ${colors.muted('Status:')} ${feature.lifecycle}`);
        if (feature.agentRunId) {
          console.log(
            `  ${colors.muted('Agent:')}  ${colors.success('spawned')} (run ${feature.agentRunId.slice(0, 8)})`
          );
        }
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to create feature', err);
        process.exitCode = 1;
      }
    });
}
