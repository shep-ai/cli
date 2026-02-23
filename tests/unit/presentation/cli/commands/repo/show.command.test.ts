/**
 * Repo Show Command Unit Tests
 *
 * Tests for the repo show command that displays details of a
 * tracked repository using renderDetailView.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repository } from '@/domain/generated/output.js';

const { mockResolveRepository } = vi.hoisted(() => ({
  mockResolveRepository: vi.fn(),
}));

vi.mock('../../../../../../src/presentation/cli/commands/repo/resolve-repository.js', () => ({
  resolveRepository: mockResolveRepository,
}));

import { createShowCommand } from '../../../../../../src/presentation/cli/commands/repo/show.command.js';

function makeRepository(overrides?: Partial<Repository>): Repository {
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'my-project',
    path: '/home/user/my-project',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
    ...overrides,
  };
}

describe('repo show command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    process.exitCode = undefined;
  });

  it('should create a command named "show" with argument <id>', () => {
    const cmd = createShowCommand();
    expect(cmd.name()).toBe('show');
    expect(cmd.description()).toBe('Display details of a tracked repository');
  });

  it('should render repository details when resolved successfully', async () => {
    const repo = makeRepository();
    mockResolveRepository.mockResolvedValue({ repository: repo });

    const cmd = createShowCommand();
    await cmd.parseAsync(['a1b2c3d4'], { from: 'user' });

    expect(mockResolveRepository).toHaveBeenCalledWith('a1b2c3d4');
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(output).toContain('my-project');
    expect(output).toContain('/home/user/my-project');
  });

  it('should display timestamps section', async () => {
    const repo = makeRepository();
    mockResolveRepository.mockResolvedValue({ repository: repo });

    const cmd = createShowCommand();
    await cmd.parseAsync(['a1b2c3d4'], { from: 'user' });

    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('Timestamps');
    expect(output).toContain('Created');
    expect(output).toContain('Updated');
  });

  it('should show error and set exitCode when repository not found', async () => {
    mockResolveRepository.mockResolvedValue({ error: 'Repository not found: xyz123' });

    const cmd = createShowCommand();
    await cmd.parseAsync(['xyz123'], { from: 'user' });

    expect(process.exitCode).toBe(1);
    const output = consoleErrorSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('Repository not found: xyz123');
  });

  it('should show error and set exitCode when multiple matches (ambiguous)', async () => {
    mockResolveRepository.mockResolvedValue({
      error: 'Multiple repositories match prefix "a1b2": a1b2c3d4, a1b2dead',
    });

    const cmd = createShowCommand();
    await cmd.parseAsync(['a1b2'], { from: 'user' });

    expect(process.exitCode).toBe(1);
    const output = consoleErrorSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('Multiple repositories match');
  });

  it('should handle unexpected errors with try/catch', async () => {
    mockResolveRepository.mockRejectedValue(new Error('Unexpected DB failure'));

    const cmd = createShowCommand();
    await cmd.parseAsync(['a1b2c3d4'], { from: 'user' });

    expect(process.exitCode).toBe(1);
    const output = consoleErrorSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('Failed to show repository');
  });

  it('should show deletedAt when present', async () => {
    const repo = makeRepository({ deletedAt: new Date('2025-02-01') });
    mockResolveRepository.mockResolvedValue({ repository: repo });

    const cmd = createShowCommand();
    await cmd.parseAsync(['a1b2c3d4'], { from: 'user' });

    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('Deleted');
  });
});
