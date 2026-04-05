/**
 * Repo Add Command Unit Tests
 *
 * Tests for the `shep repo add` CLI command.
 *
 * TDD Phase: RED -> GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// -------------------------------------------------------------------------
// Mocks — vi.hoisted ensures these are available during vi.mock hoisting
// -------------------------------------------------------------------------

const {
  mockImportExecute,
  mockListExecute,
  mockListOrgsExecute,
  mockGitHubService,
  mockGithubImportWizard,
} = vi.hoisted(() => ({
  mockImportExecute: vi.fn(),
  mockListExecute: vi.fn(),
  mockListOrgsExecute: vi.fn().mockResolvedValue([]),
  mockGitHubService: {
    checkAuth: vi.fn(),
    cloneRepository: vi.fn(),
    listUserRepositories: vi.fn(),
    listOrganizations: vi.fn(),
    parseGitHubUrl: vi.fn(),
  },
  mockGithubImportWizard: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn().mockImplementation((token: unknown) => {
      const tokenName = typeof token === 'function' ? token.name : String(token);

      switch (tokenName) {
        case 'ImportGitHubRepositoryUseCase':
          return { execute: mockImportExecute };
        case 'ListGitHubRepositoriesUseCase':
          return { execute: mockListExecute };
        case 'ListGitHubOrganizationsUseCase':
          return { execute: mockListOrgsExecute };
        case 'IGitHubRepositoryService':
          return mockGitHubService;
        default:
          return {};
      }
    }),
  },
}));

vi.mock('@/infrastructure/services/settings.service.js', () => ({
  getSettings: vi.fn().mockReturnValue({
    environment: {
      defaultCloneDirectory: '/home/user/repos',
    },
  }),
}));

vi.mock('../../../../../../src/presentation/tui/wizards/github-import.wizard.js', () => ({
  githubImportWizard: mockGithubImportWizard,
}));

import { createAddCommand } from '../../../../../../src/presentation/cli/commands/repo/add.command.js';
import {
  GitHubAuthError,
  GitHubCloneError,
  GitHubUrlParseError,
} from '@/application/ports/output/services/github-repository-service.interface.js';

// -------------------------------------------------------------------------
// Test helpers
// -------------------------------------------------------------------------

function createTestRepository() {
  return {
    id: 'repo-001',
    name: 'my-project',
    path: '/home/user/repos/my-project',
    remoteUrl: 'https://github.com/octocat/my-project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
}

describe('add command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    // Default: import succeeds
    mockImportExecute.mockResolvedValue(createTestRepository());
    // Suppress console output in tests
    vi.spyOn(console, 'log').mockImplementation(vi.fn());
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
  });

  // -------------------------------------------------------------------------
  // Command structure
  // -------------------------------------------------------------------------

  describe('command structure', () => {
    it('returns a Commander Command instance', () => {
      const cmd = createAddCommand();
      expect(cmd).toBeInstanceOf(Command);
    });

    it('has name "add"', () => {
      const cmd = createAddCommand();
      expect(cmd.name()).toBe('add');
    });

    it('has a --url option', () => {
      const cmd = createAddCommand();
      const urlOption = cmd.options.find((o) => o.long === '--url');
      expect(urlOption).toBeDefined();
    });

    it('has a --dest option', () => {
      const cmd = createAddCommand();
      const destOption = cmd.options.find((o) => o.long === '--dest');
      expect(destOption).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Direct URL import (--url flag)
  // -------------------------------------------------------------------------

  describe('with --url flag', () => {
    it('resolves import use case and calls execute with url', async () => {
      const cmd = createAddCommand();
      await cmd.parseAsync(['--url', 'octocat/my-project'], { from: 'user' });

      expect(mockImportExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'octocat/my-project',
        })
      );
    });

    it('passes defaultCloneDir from settings', async () => {
      const cmd = createAddCommand();
      await cmd.parseAsync(['--url', 'octocat/my-project'], { from: 'user' });

      expect(mockImportExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultCloneDir: '/home/user/repos',
        })
      );
    });

    it('passes --dest to use case', async () => {
      const cmd = createAddCommand();
      await cmd.parseAsync(['--url', 'octocat/my-project', '--dest', '/custom/path'], {
        from: 'user',
      });

      expect(mockImportExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'octocat/my-project',
          dest: '/custom/path',
        })
      );
    });

    it('does not call the wizard when --url is provided', async () => {
      const cmd = createAddCommand();
      await cmd.parseAsync(['--url', 'octocat/my-project'], { from: 'user' });

      expect(mockGithubImportWizard).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Interactive wizard (no --url)
  // -------------------------------------------------------------------------

  describe('without --url flag (interactive)', () => {
    it('calls wizard then executes use case with wizard result', async () => {
      mockGithubImportWizard.mockResolvedValue({ url: 'octocat/my-project' });

      const cmd = createAddCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(mockGithubImportWizard).toHaveBeenCalled();
      expect(mockImportExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'octocat/my-project',
        })
      );
    });

    it('passes wizard dest to use case when no --dest flag', async () => {
      mockGithubImportWizard.mockResolvedValue({ url: 'octocat/my-project', dest: '/wizard/path' });

      const cmd = createAddCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(mockImportExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          dest: '/wizard/path',
        })
      );
    });

    it('prefers --dest flag over wizard dest', async () => {
      mockGithubImportWizard.mockResolvedValue({ url: 'octocat/my-project', dest: '/wizard/path' });

      const cmd = createAddCommand();
      await cmd.parseAsync(['--dest', '/flag/path'], { from: 'user' });

      expect(mockImportExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          dest: '/flag/path',
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('catches GitHubAuthError and shows auth instructions', async () => {
      mockImportExecute.mockRejectedValue(new GitHubAuthError('Not authenticated'));

      const cmd = createAddCommand();
      await cmd.parseAsync(['--url', 'octocat/my-project'], { from: 'user' });

      expect(process.exitCode).toBe(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('not authenticated'));
    });

    it('catches GitHubUrlParseError and shows URL format help', async () => {
      mockImportExecute.mockRejectedValue(new GitHubUrlParseError('Invalid URL: bad-url'));

      const cmd = createAddCommand();
      await cmd.parseAsync(['--url', 'bad-url'], { from: 'user' });

      expect(process.exitCode).toBe(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid GitHub URL'));
    });

    it('catches GitHubCloneError and shows clone failure message', async () => {
      mockImportExecute.mockRejectedValue(new GitHubCloneError('Clone failed: permission denied'));

      const cmd = createAddCommand();
      await cmd.parseAsync(['--url', 'octocat/my-project'], { from: 'user' });

      expect(process.exitCode).toBe(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Clone failed'));
    });

    it('handles unexpected errors with generic message', async () => {
      mockImportExecute.mockRejectedValue(new Error('Unexpected boom'));

      const cmd = createAddCommand();
      await cmd.parseAsync(['--url', 'octocat/my-project'], { from: 'user' });

      expect(process.exitCode).toBe(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to import repository')
      );
    });

    it('handles ExitPromptError gracefully without error message', async () => {
      const exitError = new Error('User cancelled');
      exitError.name = 'ExitPromptError';
      mockGithubImportWizard.mockRejectedValue(exitError);

      const cmd = createAddCommand();
      await cmd.parseAsync([], { from: 'user' });

      // Should not set exitCode or show error
      expect(process.exitCode).not.toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Success output
  // -------------------------------------------------------------------------

  describe('success output', () => {
    it('shows repo name and path on success', async () => {
      const cmd = createAddCommand();
      await cmd.parseAsync(['--url', 'octocat/my-project'], { from: 'user' });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('my-project'));
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('/home/user/repos/my-project')
      );
    });
  });
});
