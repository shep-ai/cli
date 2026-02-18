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
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { container } from '@/infrastructure/di/container.js';
import { CreateFeatureUseCase } from '@/application/use-cases/features/create/create-feature.use-case.js';
import type { ApprovalGates } from '@/domain/generated/output.js';
import { colors, messages, spinner } from '../../ui/index.js';
import { SHEP_HOME_DIR } from '@/infrastructure/services/filesystem/shep-directory.service.js';

interface NewOptions {
  repo?: string;
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
    .option('--allow-prd', 'Auto-approve through requirements, pause after')
    .option('--allow-plan', 'Auto-approve through planning, pause at implementation')
    .option('--allow-all', 'Run fully autonomous (no approval pauses)')
    .action(async (description: string, options: NewOptions) => {
      try {
        const useCase = container.resolve(CreateFeatureUseCase);
        const repoPath = options.repo ?? process.cwd();

        // Build approval gates from flags (default: pause after every phase)
        let approvalGates: ApprovalGates | undefined = {
          allowPrd: false,
          allowPlan: false,
          allowMerge: false,
        };
        if (options.allowPrd) approvalGates = { ...approvalGates, allowPrd: true };
        if (options.allowPlan)
          approvalGates = { allowPrd: true, allowPlan: true, allowMerge: false };
        if (options.allowAll) approvalGates = undefined; // no gates = fully autonomous

        const result = await spinner('Thinking', () =>
          useCase.execute({
            userInput: description,
            repositoryPath: repoPath,
            approvalGates,
          })
        );

        const { feature, warning } = result;
        const repoHash = createHash('sha256').update(repoPath).digest('hex').slice(0, 16);
        const wtSlug = feature.branch.replace(/\//g, '-');
        const worktreePath = join(SHEP_HOME_DIR, 'repos', repoHash, 'wt', wtSlug);

        messages.newline();
        if (warning) {
          messages.warning(warning);
        }
        messages.success('Feature created');
        console.log(`  ${colors.muted('ID:')}       ${colors.accent(feature.id)}`);
        console.log(`  ${colors.muted('Name:')}     ${feature.name}`);
        console.log(`  ${colors.muted('Branch:')}   ${colors.accent(feature.branch)}`);
        console.log(`  ${colors.muted('Status:')}   ${feature.lifecycle}`);
        console.log(`  ${colors.muted('Worktree:')} ${worktreePath}`);
        if (feature.specPath) {
          console.log(`  ${colors.muted('Spec:')}     ${feature.specPath}`);
        }
        if (feature.agentRunId) {
          console.log(
            `  ${colors.muted('Agent:')}    ${colors.success('spawned')} (run ${feature.agentRunId.slice(0, 8)})`
          );
        }
        if (approvalGates) {
          const hint = !approvalGates.allowPrd
            ? 'pause after every phase'
            : !approvalGates.allowPlan
              ? 'auto-approve through requirements, pause after'
              : 'auto-approve through planning, pause at implementation';
          console.log(`  ${colors.muted('Review:')}   ${hint}`);
        }
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to create feature', err);
        process.exitCode = 1;
      }
    });
}
