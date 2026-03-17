/**
 * Feature Adopt Command
 *
 * Adopts an existing git branch into Shep's feature tracking system.
 * Creates a worktree (if needed), derives metadata from the branch name,
 * and persists a Feature with lifecycle=Maintain (agent inactive).
 *
 * Usage:
 *   shep feat adopt <branch>
 *   shep feat adopt <branch> -r /path/to/repo
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { AdoptBranchUseCase } from '@/application/use-cases/features/adopt-branch.use-case.js';
import { colors, messages, spinner } from '../../ui/index.js';

export function createAdoptCommand(): Command {
  return new Command('adopt')
    .description('Adopt an existing branch as a tracked feature')
    .argument('<branch>', 'Branch name to adopt')
    .option('-r, --repo <path>', 'Repository path (defaults to cwd)')
    .action(async (branch: string, options: { repo?: string }) => {
      try {
        const useCase = container.resolve(AdoptBranchUseCase);
        const { feature } = await spinner('Adopting branch', () =>
          useCase.execute({
            branchName: branch,
            repositoryPath: options.repo ?? process.cwd(),
          })
        );

        messages.newline();
        messages.success('Branch adopted');
        console.log(`  ${colors.muted('ID:')}        ${colors.accent(feature.id.slice(0, 8))}`);
        console.log(`  ${colors.muted('Name:')}      ${feature.name}`);
        console.log(`  ${colors.muted('Branch:')}    ${colors.accent(feature.branch)}`);
        console.log(`  ${colors.muted('Status:')}    ${feature.lifecycle}`);
        if (feature.pr) {
          console.log(
            `  ${colors.muted('PR:')}        ${colors.accent(feature.pr.url)} (${feature.pr.status})`
          );
        }
        console.log(`  ${colors.muted('Worktree:')}  ${colors.accent(feature.worktreePath ?? '')}`);
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to adopt branch', err);
        process.exitCode = 1;
      }
    });
}
