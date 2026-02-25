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
import { SdlcLifecycle } from '@/domain/generated/output.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import { colors, messages, spinner } from '../../ui/index.js';
import { getShepHomeDir } from '@/infrastructure/services/filesystem/shep-directory.service.js';
import { getSettings, hasSettings } from '@/infrastructure/services/settings.service.js';

interface NewOptions {
  repo?: string;
  push?: boolean;
  pr?: boolean;
  allowPrd?: boolean;
  allowPlan?: boolean;
  allowMerge?: boolean;
  allowAll?: boolean;
  parent?: string;
}

/**
 * Read workflow defaults from settings, falling back to false if settings unavailable.
 */
interface WorkflowDefaults {
  openPr: boolean;
  allowPrd: boolean;
  allowPlan: boolean;
  allowMerge: boolean;
  push: boolean;
}

function getWorkflowDefaults(): WorkflowDefaults {
  if (!hasSettings()) {
    return { openPr: false, allowPrd: false, allowPlan: false, allowMerge: false, push: false };
  }
  const settings = getSettings();
  const gates = settings.workflow.approvalGateDefaults;
  return {
    openPr: settings.workflow.openPrOnImplementationComplete,
    allowPrd: gates.allowPrd,
    allowPlan: gates.allowPlan,
    allowMerge: gates.allowMerge,
    push: gates.pushOnImplementationComplete,
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
    .option('--push', 'Push branch to remote after implementation')
    .option('--pr', 'Open PR on implementation complete (implies --push)')
    .option('--no-pr', 'Do not open PR on implementation complete')
    .option('--allow-prd', 'Auto-approve through requirements, pause after')
    .option('--allow-plan', 'Auto-approve through planning, pause at implementation')
    .option('--allow-merge', 'Auto-approve merge phase')
    .option('--allow-all', 'Run fully autonomous (no approval pauses)')
    .option('--parent <fid>', 'Parent feature ID (full or partial prefix)')
    .action(async (description: string, options: NewOptions) => {
      try {
        const useCase = container.resolve(CreateFeatureUseCase);
        const repoPath = options.repo ?? process.cwd();

        // Resolve openPr from CLI flags or settings defaults
        const defaults = getWorkflowDefaults();
        const openPr = options.pr ?? defaults.openPr;

        // Build approval gates from flags, falling back to settings defaults
        const approvalGates: ApprovalGates = options.allowAll
          ? { allowPrd: true, allowPlan: true, allowMerge: true }
          : {
              allowPrd: options.allowPrd ?? defaults.allowPrd,
              allowPlan: options.allowPlan ?? defaults.allowPlan,
              allowMerge: options.allowMerge ?? defaults.allowMerge,
            };

        const push = options.push ?? defaults.push;

        // Resolve parent feature ID if --parent flag is provided
        let parentId: string | undefined;
        if (options.parent) {
          const featureRepo = container.resolve<IFeatureRepository>('IFeatureRepository');
          const parentFeature = await featureRepo.findByIdPrefix(options.parent);
          if (!parentFeature) {
            messages.error(`Parent feature not found: ${options.parent}`);
            process.exitCode = 1;
            return;
          }
          parentId = parentFeature.id;
        }

        const result = await spinner('Thinking', () =>
          useCase.execute({
            userInput: description,
            repositoryPath: repoPath,
            approvalGates,
            push,
            openPr,
            ...(parentId !== undefined && { parentId }),
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
        if (feature.lifecycle === SdlcLifecycle.Blocked) {
          messages.info(
            `Feature created in Blocked state — waiting for parent to reach Implementation`
          );
        }
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
        if (push || openPr) {
          const pushHint = openPr ? 'push + PR' : 'push only';
          console.log(`  ${colors.muted('Push:')}     ${pushHint}`);
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
