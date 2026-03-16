/**
 * GitHub Import Wizard Unit Tests
 *
 * Tests for the interactive GitHub import wizard.
 *
 * TDD Phase: RED -> GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock @inquirer/prompts before importing the wizard
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  input: vi.fn(),
}));

import { select, input } from '@inquirer/prompts';
import { githubImportWizard } from '../../../../../src/presentation/tui/wizards/github-import.wizard.js';
import { GitHubUrlParseError } from '@/application/ports/output/services/github-repository-service.interface.js';
import type {
  IGitHubRepositoryService,
  GitHubRepo,
} from '@/application/ports/output/services/github-repository-service.interface.js';
import type { ListGitHubRepositoriesUseCase } from '@/application/use-cases/repositories/list-github-repositories.use-case.js';

const mockSelect = select as ReturnType<typeof vi.fn>;
const mockInput = input as ReturnType<typeof vi.fn>;

// -------------------------------------------------------------------------
// Test helpers
// -------------------------------------------------------------------------

function createMockGitHubService(): IGitHubRepositoryService {
  return {
    checkAuth: vi.fn().mockResolvedValue(undefined),
    cloneRepository: vi.fn().mockResolvedValue(undefined),
    listUserRepositories: vi.fn().mockResolvedValue([]),
    parseGitHubUrl: vi.fn().mockReturnValue({
      owner: 'octocat',
      repo: 'my-project',
      nameWithOwner: 'octocat/my-project',
    }),
  };
}

function createMockListUseCase(): ListGitHubRepositoriesUseCase {
  return {
    execute: vi.fn().mockResolvedValue([]),
  } as unknown as ListGitHubRepositoriesUseCase;
}

function createTestRepos(): GitHubRepo[] {
  return [
    {
      name: 'my-project',
      nameWithOwner: 'octocat/my-project',
      description: 'A cool project',
      isPrivate: false,
      pushedAt: '2024-01-15T10:00:00Z',
    },
    {
      name: 'private-repo',
      nameWithOwner: 'octocat/private-repo',
      description: '',
      isPrivate: true,
      pushedAt: '2024-01-14T10:00:00Z',
    },
  ];
}

describe('githubImportWizard', () => {
  let gitHubService: IGitHubRepositoryService;
  let listUseCase: ReturnType<typeof createMockListUseCase>;

  beforeEach(() => {
    vi.clearAllMocks();
    gitHubService = createMockGitHubService();
    listUseCase = createMockListUseCase();
  });

  // -------------------------------------------------------------------------
  // URL input path
  // -------------------------------------------------------------------------

  describe('URL input path', () => {
    it('should return URL when user selects URL input path', async () => {
      mockSelect.mockResolvedValueOnce('url');
      mockInput
        .mockResolvedValueOnce('https://github.com/octocat/my-project') // URL input
        .mockResolvedValueOnce(''); // empty dest (skip)

      const result = await githubImportWizard(gitHubService, listUseCase);

      expect(result).toEqual({
        url: 'https://github.com/octocat/my-project',
      });
      expect(result.dest).toBeUndefined();
    });

    it('should validate URL input with parseGitHubUrl', async () => {
      mockSelect.mockResolvedValueOnce('url');
      mockInput.mockResolvedValueOnce('octocat/my-project').mockResolvedValueOnce('');

      await githubImportWizard(gitHubService, listUseCase);

      // The input prompt should have been called with a validate function
      const inputCall = mockInput.mock.calls[0][0];
      expect(inputCall.validate).toBeDefined();

      // Test the validate function: valid URL
      const validResult = inputCall.validate('octocat/my-project');
      expect(validResult).toBe(true);
      expect(gitHubService.parseGitHubUrl).toHaveBeenCalledWith('octocat/my-project');
    });

    it('should reject invalid URL input via validate function', async () => {
      mockSelect.mockResolvedValueOnce('url');
      mockInput.mockResolvedValueOnce('octocat/my-project').mockResolvedValueOnce('');

      // Make parseGitHubUrl throw for invalid URLs
      (gitHubService.parseGitHubUrl as ReturnType<typeof vi.fn>).mockImplementation(
        (url: string) => {
          if (url === 'not-a-url') {
            throw new GitHubUrlParseError('Invalid GitHub URL: not-a-url');
          }
          return { owner: 'octocat', repo: 'my-project', nameWithOwner: 'octocat/my-project' };
        }
      );

      await githubImportWizard(gitHubService, listUseCase);

      const inputCall = mockInput.mock.calls[0][0];

      // Invalid URL should return error message
      const invalidResult = inputCall.validate('not-a-url');
      expect(invalidResult).toBe('Invalid GitHub URL: not-a-url');
    });

    it('should reject empty URL input', async () => {
      mockSelect.mockResolvedValueOnce('url');
      mockInput.mockResolvedValueOnce('octocat/my-project').mockResolvedValueOnce('');

      await githubImportWizard(gitHubService, listUseCase);

      const inputCall = mockInput.mock.calls[0][0];
      const emptyResult = inputCall.validate('');
      expect(emptyResult).toBe('URL is required');
    });

    it('should trim whitespace from URL input', async () => {
      mockSelect.mockResolvedValueOnce('url');
      mockInput.mockResolvedValueOnce('  octocat/my-project  ').mockResolvedValueOnce('');

      const result = await githubImportWizard(gitHubService, listUseCase);

      expect(result.url).toBe('octocat/my-project');
    });
  });

  // -------------------------------------------------------------------------
  // Browse path
  // -------------------------------------------------------------------------

  describe('Browse path', () => {
    it('should return nameWithOwner when user selects browse path', async () => {
      const repos = createTestRepos();
      (listUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(repos);

      mockSelect
        .mockResolvedValueOnce('browse') // method choice
        .mockResolvedValueOnce('octocat/my-project'); // repo selection
      mockInput.mockResolvedValueOnce(''); // empty dest

      const result = await githubImportWizard(gitHubService, listUseCase);

      expect(result).toEqual({
        url: 'octocat/my-project',
      });
    });

    it('should call listUseCase with limit 30', async () => {
      const repos = createTestRepos();
      (listUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(repos);

      mockSelect.mockResolvedValueOnce('browse').mockResolvedValueOnce('octocat/my-project');
      mockInput.mockResolvedValueOnce('');

      await githubImportWizard(gitHubService, listUseCase);

      expect(listUseCase.execute).toHaveBeenCalledWith({ limit: 30 });
    });

    it('should display repos with name, visibility badge, and description', async () => {
      const repos = createTestRepos();
      (listUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(repos);

      mockSelect.mockResolvedValueOnce('browse').mockResolvedValueOnce('octocat/my-project');
      mockInput.mockResolvedValueOnce('');

      await githubImportWizard(gitHubService, listUseCase);

      // Second select call is for repo selection
      const repoSelectCall = mockSelect.mock.calls[1][0];
      expect(repoSelectCall.choices).toEqual([
        {
          name: 'octocat/my-project',
          value: 'octocat/my-project',
          description: 'A cool project',
        },
        {
          name: 'octocat/private-repo (private)',
          value: 'octocat/private-repo',
          description: undefined,
        },
      ]);
    });

    it('should throw error when no repos are found', async () => {
      (listUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      mockSelect.mockResolvedValueOnce('browse');

      await expect(githubImportWizard(gitHubService, listUseCase)).rejects.toThrow(
        'No repositories found'
      );
    });
  });

  // -------------------------------------------------------------------------
  // Destination override
  // -------------------------------------------------------------------------

  describe('Destination override', () => {
    it('should include dest when user provides a destination', async () => {
      mockSelect.mockResolvedValueOnce('url');
      mockInput.mockResolvedValueOnce('octocat/my-project').mockResolvedValueOnce('/custom/path');

      const result = await githubImportWizard(gitHubService, listUseCase);

      expect(result).toEqual({
        url: 'octocat/my-project',
        dest: '/custom/path',
      });
    });

    it('should omit dest when user leaves destination empty', async () => {
      mockSelect.mockResolvedValueOnce('url');
      mockInput.mockResolvedValueOnce('octocat/my-project').mockResolvedValueOnce('  '); // whitespace-only

      const result = await githubImportWizard(gitHubService, listUseCase);

      expect(result.dest).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Prompt flow order
  // -------------------------------------------------------------------------

  describe('Prompt flow', () => {
    it('should call prompts in the correct order for URL path', async () => {
      const callOrder: string[] = [];

      mockSelect.mockImplementation(async (config: { message: string }) => {
        callOrder.push(`select:${config.message}`);
        return 'url';
      });

      mockInput.mockImplementation(async (config: { message: string }) => {
        callOrder.push(`input:${config.message}`);
        return 'octocat/my-project';
      });

      await githubImportWizard(gitHubService, listUseCase);

      expect(callOrder).toEqual([
        'select:How would you like to add a GitHub repository?',
        'input:Enter a GitHub repository URL or owner/repo',
        'input:Clone destination (leave empty for default)',
      ]);
    });

    it('should use shepTheme for all prompts', async () => {
      mockSelect.mockResolvedValueOnce('url');
      mockInput.mockResolvedValueOnce('octocat/my-project').mockResolvedValueOnce('');

      await githubImportWizard(gitHubService, listUseCase);

      // All prompt calls should include the theme
      for (const call of mockSelect.mock.calls) {
        expect(call[0]).toHaveProperty('theme');
      }
      for (const call of mockInput.mock.calls) {
        expect(call[0]).toHaveProperty('theme');
      }
    });
  });
});
