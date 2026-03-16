/**
 * GitHub Import Wizard
 *
 * Interactive TUI wizard that guides users through importing a GitHub repository.
 * Offers two paths: paste a GitHub URL or browse the user's repositories.
 * Returns the selected URL/nameWithOwner and optional destination override.
 */

import { select, input } from '@inquirer/prompts';

import type {
  IGitHubRepositoryService,
  GitHubRepo,
} from '@/application/ports/output/services/github-repository-service.interface.js';
import { GitHubUrlParseError } from '@/application/ports/output/services/github-repository-service.interface.js';
import type { ListGitHubRepositoriesUseCase } from '@/application/use-cases/repositories/list-github-repositories.use-case.js';
import { shepTheme } from '../themes/shep.theme.js';

/**
 * Result returned by the GitHub import wizard.
 */
export interface GitHubImportWizardResult {
  /** GitHub URL or owner/repo shorthand */
  url: string;
  /** Optional override for clone destination directory */
  dest?: string;
}

/**
 * Import method choice for the first prompt.
 */
type ImportMethod = 'url' | 'browse';

/**
 * Format a GitHub repo for display in the select list.
 * Shows name, visibility badge, and truncated description.
 */
function formatRepoChoice(repo: GitHubRepo): { name: string; value: string; description?: string } {
  const visibility = repo.isPrivate ? ' (private)' : '';
  return {
    name: `${repo.nameWithOwner}${visibility}`,
    value: repo.nameWithOwner,
    description: repo.description || undefined,
  };
}

/**
 * Runs the interactive GitHub import wizard.
 *
 * Steps:
 * 1. Choose import method (URL input or browse repos)
 * 2a. If URL: prompt for URL, validate with parseGitHubUrl
 * 2b. If browse: fetch repos via listUseCase, display select list
 * 3. Optionally prompt for destination directory override
 *
 * @param gitHubService - Service for URL validation
 * @param listUseCase - Use case for listing user repos
 * @returns The selected import target and optional destination
 */
export async function githubImportWizard(
  gitHubService: IGitHubRepositoryService,
  listUseCase: ListGitHubRepositoriesUseCase
): Promise<GitHubImportWizardResult> {
  // Step 1: Choose import method
  const method = await select<ImportMethod>({
    message: 'How would you like to add a GitHub repository?',
    choices: [
      {
        name: 'Paste a GitHub URL',
        value: 'url' as const,
        description: 'Enter a GitHub repository URL or owner/repo shorthand',
      },
      {
        name: 'Browse my repositories',
        value: 'browse' as const,
        description: 'Search and select from your GitHub repositories',
      },
    ],
    theme: shepTheme,
  });

  let url: string;

  if (method === 'url') {
    url = await promptForUrl(gitHubService);
  } else {
    url = await promptForBrowse(listUseCase);
  }

  // Step 3: Optional destination override
  const dest = await promptForDestination();

  const result: GitHubImportWizardResult = { url };
  if (dest) {
    result.dest = dest;
  }

  return result;
}

/**
 * Prompt the user for a GitHub URL and validate it.
 * Re-prompts on invalid input until a valid URL is provided.
 */
async function promptForUrl(gitHubService: IGitHubRepositoryService): Promise<string> {
  const url = await input({
    message: 'Enter a GitHub repository URL or owner/repo',
    validate: (value: string) => {
      if (!value.trim()) {
        return 'URL is required';
      }
      try {
        gitHubService.parseGitHubUrl(value.trim());
        return true;
      } catch (error) {
        if (error instanceof GitHubUrlParseError) {
          return error.message;
        }
        return 'Invalid GitHub URL format. Use https://github.com/owner/repo or owner/repo';
      }
    },
    theme: shepTheme,
  });

  return url.trim();
}

/**
 * Prompt the user to browse and select from their GitHub repositories.
 * Fetches repos via the list use case and displays them in a select prompt.
 */
async function promptForBrowse(listUseCase: ListGitHubRepositoriesUseCase): Promise<string> {
  const repos = await listUseCase.execute({ limit: 30 });

  if (repos.length === 0) {
    throw new Error('No repositories found. Make sure you have repositories on GitHub.');
  }

  const choices = repos.map(formatRepoChoice);

  const selected = await select<string>({
    message: 'Select a repository to import',
    choices,
    theme: shepTheme,
  });

  return selected;
}

/**
 * Optionally prompt for a custom clone destination directory.
 */
async function promptForDestination(): Promise<string | undefined> {
  const dest = await input({
    message: 'Clone destination (leave empty for default)',
    theme: shepTheme,
  });

  return dest.trim() || undefined;
}
