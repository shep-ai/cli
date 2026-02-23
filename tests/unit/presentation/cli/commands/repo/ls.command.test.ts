/**
 * Repo List Command Unit Tests
 *
 * Tests for the repo ls command that lists tracked repositories
 * in a table view using renderListView.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repository } from '@/domain/generated/output.js';

const { mockResolve, mockExecute } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockExecute: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock('@/application/use-cases/repositories/list-repositories.use-case.js', () => ({
  ListRepositoriesUseCase: class {
    execute = mockExecute;
  },
}));

import { createLsCommand } from '../../../../../../src/presentation/cli/commands/repo/ls.command.js';

function makeRepository(overrides?: Partial<Repository>): Repository {
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'my-project',
    path: '/home/user/my-project',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('repo ls command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
    mockResolve.mockReturnValue({ execute: mockExecute });
    process.exitCode = undefined;
  });

  it('should create a command named "ls" with correct description', () => {
    const cmd = createLsCommand();
    expect(cmd.name()).toBe('ls');
    expect(cmd.description()).toBe('List tracked repositories');
  });

  it('should resolve ListRepositoriesUseCase from container', async () => {
    mockExecute.mockResolvedValue([]);
    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(mockResolve).toHaveBeenCalled();
  });

  it('should render table with repository data', async () => {
    const repo = makeRepository();
    mockExecute.mockResolvedValue([repo]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('a1b2c3d4');
    expect(output).toContain('my-project');
    expect(output).toContain('/home/user/my-project');
  });

  it('should show "No repositories found" when list is empty', async () => {
    mockExecute.mockResolvedValue([]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    // renderListView calls messages.info for empty state which uses console.log
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('No repositories found');
  });

  it('should show 8-char ID prefix in table', async () => {
    const repo = makeRepository({ id: 'deadbeef-1234-5678-abcd-ef1234567890' });
    mockExecute.mockResolvedValue([repo]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('deadbeef');
  });

  it('should set process.exitCode = 1 on error', async () => {
    mockExecute.mockRejectedValue(new Error('DB connection failed'));

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });
});
