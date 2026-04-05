/**
 * GitHub Import Wizard
 *
 * Interactive TUI wizard that guides users through importing a GitHub repository.
 * Offers two paths: paste a GitHub URL or browse the user's repositories.
 * Supports browsing repos from multiple organizations.
 * Returns the selected URL/nameWithOwner and optional destination override.
 */

import { select, input } from '@inquirer/prompts';

import type {
  IGitHubRepositoryService,
  GitHubRepo,
} from '@/application/ports/output/services/github-repository-service.interface.js';
import { GitHubUrlParseError } from '@/application/ports/output/services/github-repository-service.interface.js';
import type { ListGitHubRepositoriesUseCase } from '@/application/use-cases/repositories/list-github-repositories.use-case.js';
import type { ListGitHubOrganizationsUseCase } from '@/application/use-cases/repositories/list-github-organizations.use-case.js';
import { getTuiI18n } from '../i18n.js';
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

/** Sentinel value representing the authenticated user's personal account */
const PERSONAL_OWNER = '__personal__';

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
 * 2b. If browse: optionally select an org, then fetch repos via listUseCase, display select list
 * 3. Optionally prompt for destination directory override
 *
 * @param gitHubService - Service for URL validation
 * @param listUseCase - Use case for listing user repos
 * @param listOrgsUseCase - Use case for listing user's organizations
 * @returns The selected import target and optional destination
 */
export async function githubImportWizard(
  gitHubService: IGitHubRepositoryService,
  listUseCase: ListGitHubRepositoriesUseCase,
  listOrgsUseCase?: ListGitHubOrganizationsUseCase
): Promise<GitHubImportWizardResult> {
  // Step 1: Choose import method
  const t = getTuiI18n().t;
  const method = await select<ImportMethod>({
    message: t('tui:wizards.githubImport.methodMessage'),
    choices: [
      {
        name: t('tui:wizards.githubImport.pasteUrl'),
        value: 'url' as const,
        description: t('tui:wizards.githubImport.pasteUrlDescription'),
      },
      {
        name: t('tui:wizards.githubImport.browseRepos'),
        value: 'browse' as const,
        description: t('tui:wizards.githubImport.browseReposDescription'),
      },
    ],
    theme: shepTheme,
  });

  let url: string;

  if (method === 'url') {
    url = await promptForUrl(gitHubService);
  } else {
    url = await promptForBrowse(listUseCase, listOrgsUseCase);
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
  const t = getTuiI18n().t;
  const url = await input({
    message: t('tui:wizards.githubImport.enterUrl'),
    validate: (value: string) => {
      if (!value.trim()) {
        return t('tui:wizards.githubImport.urlRequired');
      }
      try {
        gitHubService.parseGitHubUrl(value.trim());
        return true;
      } catch (error) {
        if (error instanceof GitHubUrlParseError) {
          return error.message;
        }
        return t('tui:wizards.githubImport.invalidUrlFormat');
      }
    },
    theme: shepTheme,
  });

  return url.trim();
}

/**
 * Prompt the user to browse and select from their GitHub repositories.
 * If organizations are available, first prompts the user to select an owner.
 */
async function promptForBrowse(
  listUseCase: ListGitHubRepositoriesUseCase,
  listOrgsUseCase?: ListGitHubOrganizationsUseCase
): Promise<string> {
  const t = getTuiI18n().t;
  let owner: string | undefined;

  // Try to load organizations for the owner selector
  if (listOrgsUseCase) {
    try {
      const orgs = await listOrgsUseCase.execute();
      if (orgs.length > 0) {
        const ownerChoices = [
          { name: 'My repositories', value: PERSONAL_OWNER },
          ...orgs.map((org) => ({
            name: org.login,
            value: org.login,
            description: org.description || undefined,
          })),
        ];

        const selectedOwner = await select<string>({
          message: 'Select account',
          choices: ownerChoices,
          theme: shepTheme,
        });

        if (selectedOwner !== PERSONAL_OWNER) {
          owner = selectedOwner;
        }
      }
    } catch {
      // Org listing failure is non-critical — proceed with personal repos
    }
  }

  const repos = await listUseCase.execute({ limit: 30, owner });

  if (repos.length === 0) {
    throw new Error(t('tui:wizards.githubImport.noRepos'));
  }

  const choices = repos.map(formatRepoChoice);

  const selected = await select<string>({
    message: t('tui:wizards.githubImport.selectRepo'),
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
    message: getTuiI18n().t('tui:wizards.githubImport.cloneDestination'),
    theme: shepTheme,
  });

  return dest.trim() || undefined;
}
