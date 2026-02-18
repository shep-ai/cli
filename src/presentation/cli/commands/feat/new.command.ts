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
import { getShepHomeDir } from '@/infrastructure/services/filesystem/shep-directory.service.js';
import { getSettings, hasSettings } from '@/infrastructure/services/settings.service.js';

interface NewOptions {
  repo?: string;
  pr?: boolean;
  allowPrd?: boolean;
  allowPlan?: boolean;
  allowMerge?: boolean;
  allowAll?: boolean;
}

/**
 * Read workflow defaults from settings, falling back to false if settings unavailable.
 */
function getWorkflowDefaults(): { openPr: boolean } {
  if (!hasSettings()) {
    return { openPr: false };
  }
  const settings = getSettings();
  return {
    openPr: settings.workflow.openPrOnImplementationComplete,
  };
}

/**
 * Create the feat new command
 */
export function createNewCommand(): Command {
  return new Command('new')
    .description('Create a new feature')
    .argument('<description>', 'Feature description')
    .option('-r, --repo <path>', 'Repository path (defaults to current directory)')
    .option('--pr', 'Open PR on implementation complete')
    .option('--no-pr', 'Do not open PR on implementation complete')
    .option('--allow-prd', 'Auto-approve through requirements, pause after')
    .option('--allow-plan', 'Auto-approve through planning, pause at implementation')
    .option('--allow-merge', 'Auto-approve merge phase')
    .option('--allow-all', 'Run fully autonomous (no approval pauses)')
    .action(async (description: string, options: NewOptions) => {
      try {
        const useCase = container.resolve(CreateFeatureUseCase);
        const repoPath = options.repo ?? process.cwd();

        // Resolve openPr from CLI flags or settings defaults
        const defaults = getWorkflowDefaults();
        const openPr = options.pr ?? defaults.openPr;

        // Build approval gates from flags (each flag controls only its own step)
        const approvalGates: ApprovalGates = options.allowAll
          ? { allowPrd: true, allowPlan: true, allowMerge: true }
          : {
              allowPrd: !!options.allowPrd,
              allowPlan: !!options.allowPlan,
              allowMerge: !!options.allowMerge,
            };

        const result = await spinner('Thinking', () =>
          useCase.execute({
            userInput: description,
            repositoryPath: repoPath,
            approvalGates,
            openPr,
          })
        );

        const { feature, warning } = result;
        const repoHash = createHash('sha256').update(repoPath).digest('hex').slice(0, 16);
        const wtSlug = feature.branch.replace(/\//g, '-');
        const worktreePath = join(getShepHomeDir(), 'repos', repoHash, 'wt', wtSlug);

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
        const approved = [
          approvalGates.allowPrd && 'PRD',
          approvalGates.allowPlan && 'Plan',
          approvalGates.allowMerge && 'Merge',
        ].filter(Boolean);
        const hint =
          approved.length === 3
            ? 'fully autonomous'
            : approved.length === 0
              ? 'pause after every phase'
              : `auto-approve: ${approved.join(', ')}`;
        console.log(`  ${colors.muted('Review:')}   ${hint}`);
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to create feature', err);
        process.exitCode = 1;
      }
    });
}
