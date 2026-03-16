/**
 * Repo Add Command
 *
 * Import a GitHub repository by URL or interactively browse user's repos.
 *
 * Usage:
 *   shep repo add                       # Interactive wizard
 *   shep repo add --url owner/repo      # Direct import by URL
 *   shep repo add --url <url> --dest /path  # Override clone destination
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { getSettings } from '@/infrastructure/services/settings.service.js';
import { ImportGitHubRepositoryUseCase } from '@/application/use-cases/repositories/import-github-repository.use-case.js';
import { ListGitHubRepositoriesUseCase } from '@/application/use-cases/repositories/list-github-repositories.use-case.js';
import type { IGitHubRepositoryService } from '@/application/ports/output/services/github-repository-service.interface.js';
import {
  GitHubAuthError,
  GitHubCloneError,
  GitHubUrlParseError,
} from '@/application/ports/output/services/github-repository-service.interface.js';
import { messages } from '../../ui/index.js';
import { githubImportWizard } from '../../../tui/wizards/github-import.wizard.js';

export function createAddCommand(): Command {
  return new Command('add')
    .description('Import a GitHub repository (clone and register)')
    .option('--url <url>', 'GitHub repository URL or owner/repo shorthand')
    .option('--dest <path>', 'Override clone destination directory')
    .action(async (options: { url?: string; dest?: string }) => {
      try {
        const importUseCase = container.resolve(ImportGitHubRepositoryUseCase);

        let url: string;
        let dest: string | undefined = options.dest;

        if (options.url) {
          url = options.url;
        } else {
          // Interactive wizard
          const gitHubService = container.resolve<IGitHubRepositoryService>(
            'IGitHubRepositoryService'
          );
          const listUseCase = container.resolve(ListGitHubRepositoriesUseCase);
          const wizardResult = await githubImportWizard(gitHubService, listUseCase);
          url = wizardResult.url;
          if (!dest && wizardResult.dest) {
            dest = wizardResult.dest;
          }
        }

        // Read default clone directory from settings
        const settings = getSettings();
        const defaultCloneDir = settings.environment?.defaultCloneDirectory;

        const repository = await importUseCase.execute({
          url,
          dest,
          defaultCloneDir,
        });

        messages.success(`Repository imported: ${repository.name}`);
        messages.info(`Path: ${repository.path}`);
      } catch (error) {
        if (error instanceof GitHubAuthError) {
          messages.error('GitHub CLI is not authenticated. Run `gh auth login` to sign in.');
          process.exitCode = 1;
          return;
        }
        if (error instanceof GitHubUrlParseError) {
          messages.error(`Invalid GitHub URL: ${error.message}`);
          messages.info(
            'Supported formats: https://github.com/owner/repo, git@github.com:owner/repo.git, or owner/repo'
          );
          process.exitCode = 1;
          return;
        }
        if (error instanceof GitHubCloneError) {
          messages.error(`Clone failed: ${error.message}`);
          process.exitCode = 1;
          return;
        }

        // Handle Ctrl+C gracefully
        if (
          error &&
          typeof error === 'object' &&
          'name' in error &&
          error.name === 'ExitPromptError'
        ) {
          return;
        }

        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to import repository', err);
        process.exitCode = 1;
      }
    });
}
