/**
 * Doctor Command
 *
 * Diagnoses shep operation failures, opens a GitHub issue on shep-ai/cli,
 * and optionally invokes an AI agent to attempt a fix and open a PR.
 *
 * Usage: shep doctor [description] [options]
 *
 * @example
 * $ shep doctor "agent crashed during planning"
 * $ shep doctor --fix
 * $ shep doctor --no-fix
 * $ shep doctor "broken workflow" --fix --workdir /tmp/my-fix
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { DoctorDiagnoseUseCase } from '@/application/use-cases/doctor/doctor-diagnose.use-case.js';
import type { IToolInstallerService } from '@/application/ports/output/services/tool-installer.service.js';
import type { IGitHubRepositoryService } from '@/application/ports/output/services/github-repository-service.interface.js';
import { colors, messages, spinner } from '../ui/index.js';

interface DoctorOptions {
  fix?: boolean;
  workdir?: string;
}

/**
 * Create the doctor command
 */
export function createDoctorCommand(): Command {
  const cmd = new Command('doctor')
    .description('Diagnose shep failures, open a GitHub issue, and optionally attempt a fix')
    .argument('[description]', 'Problem description (prompted interactively if omitted)')
    .option('--fix', 'Skip confirmation and attempt a fix automatically')
    .option('--no-fix', 'Skip the fix attempt entirely (only create the issue)')
    .action(async (description: string | undefined, options: DoctorOptions) => {
      try {
        // Step 1: Validate prerequisites
        await validatePrerequisites();

        // Step 2: Collect description (argument or interactive prompt)
        const problemDescription = description ?? (await promptForDescription());
        if (!problemDescription) {
          messages.info('No description provided. Cancelled.');
          return;
        }

        // Step 3: Determine fix behavior
        const shouldFix = await resolveFix(options);

        // Step 4: Run the use case
        const useCase = container.resolve(DoctorDiagnoseUseCase);

        messages.newline();
        messages.info('Running shep doctor...');
        messages.newline();

        const result = await spinner('Collecting diagnostics and creating issue', () =>
          useCase.execute({
            description: problemDescription,
            fix: shouldFix,
            workdir: options.workdir,
          })
        );

        // Step 5: Display results
        messages.newline();
        messages.success(`GitHub issue created: ${colors.accent(result.issueUrl)}`);

        if (result.prUrl) {
          messages.success(`Pull request created: ${colors.accent(result.prUrl)}`);
          if (result.flowType) {
            messages.info(
              `Flow: ${result.flowType === 'maintainer' ? 'direct push (maintainer)' : 'fork (contributor)'}`
            );
          }
        } else if (shouldFix && result.error) {
          messages.warning(`Fix attempt failed: ${result.error}`);
          messages.info('The issue has been created — a maintainer can review it.');
        } else if (!shouldFix) {
          messages.info('Issue created. Use --fix to attempt an automated fix.');
        }

        if (result.cleanedUp) {
          messages.info('Temporary working directory cleaned up.');
        }

        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Handle Ctrl+C gracefully
        if (err.message.includes('force closed') || err.message.includes('User force closed')) {
          messages.info('Cancelled.');
          return;
        }

        messages.error('Doctor failed', err);
        process.exitCode = 1;
      }
    });

  // Commander handles --no-fix by negating the --fix option, but we need
  // explicit --workdir as a separate option
  cmd.option('--workdir <path>', 'Custom directory for the cloned repository');

  return cmd;
}

/**
 * Validate that gh CLI is installed and authenticated.
 */
async function validatePrerequisites(): Promise<void> {
  const toolInstaller = container.resolve<IToolInstallerService>('IToolInstallerService');
  const ghStatus = await toolInstaller.checkAvailability('gh');

  if (ghStatus.status !== 'available') {
    throw new Error(
      'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/ and run: gh auth login'
    );
  }

  const repoService = container.resolve<IGitHubRepositoryService>('IGitHubRepositoryService');
  await repoService.checkAuth();
}

/**
 * Prompt the user interactively for a problem description.
 */
async function promptForDescription(): Promise<string | undefined> {
  const { input } = await import('@inquirer/prompts');
  const description = await input({
    message: 'Describe the problem you encountered:',
  });
  return description.trim() || undefined;
}

/**
 * Determine whether to attempt a fix based on flags or interactive prompt.
 */
async function resolveFix(options: DoctorOptions): Promise<boolean> {
  // --fix explicitly set: always fix
  if (options.fix === true) {
    return true;
  }
  // --no-fix explicitly set (Commander sets fix to false): skip fix
  if (options.fix === false) {
    return false;
  }
  // Interactive: ask the user
  const { confirm } = await import('@inquirer/prompts');
  return confirm({
    message: 'Would you like shep to attempt a fix?',
    default: false,
  });
}
