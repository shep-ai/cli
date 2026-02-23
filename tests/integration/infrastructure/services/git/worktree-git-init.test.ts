/**
 * WorktreeService Git Init Integration Tests
 *
 * Validates ensureGitRepository with real git commands in isolated temp directories.
 * No mocks — exercises actual git operations end-to-end.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { WorktreeService } from '../../../../../packages/core/src/infrastructure/services/git/worktree.service.js';

const execFile = promisify(execFileCb);

describe('WorktreeService.ensureGitRepository (integration)', () => {
  let tempDir: string;
  let service: WorktreeService;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'shep-git-init-test-'));
    service = new WorktreeService(
      (file, args, options) =>
        execFile(file, args, options ?? {}) as Promise<{ stdout: string; stderr: string }>
    );
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should initialize a non-git directory with git init and initial commit', async () => {
    await service.ensureGitRepository(tempDir);

    // Verify .git directory was created
    expect(existsSync(join(tempDir, '.git'))).toBe(true);

    // Verify there is at least one commit
    const { stdout } = await execFile('git', ['log', '--oneline'], { cwd: tempDir });
    expect(stdout.trim()).toContain('Initial commit');
  });

  it('should not re-initialize an existing git repository', async () => {
    // Manually init the repo with a custom commit message
    await execFile('git', ['init'], { cwd: tempDir });
    await execFile('git', ['config', 'user.name', 'Test'], { cwd: tempDir });
    await execFile('git', ['config', 'user.email', 'test@test.com'], { cwd: tempDir });
    await execFile('git', ['commit', '--allow-empty', '-m', 'Pre-existing commit'], {
      cwd: tempDir,
    });

    // Call ensureGitRepository — should be a no-op
    await service.ensureGitRepository(tempDir);

    // Verify only the original commit exists (no extra "Initial commit")
    const { stdout } = await execFile('git', ['log', '--oneline'], { cwd: tempDir });
    const commits = stdout.trim().split('\n');
    expect(commits).toHaveLength(1);
    expect(commits[0]).toContain('Pre-existing commit');
  });

  it('should create an initial commit with the correct message', async () => {
    await service.ensureGitRepository(tempDir);

    const { stdout } = await execFile('git', ['log', '--format=%s'], { cwd: tempDir });
    expect(stdout.trim()).toBe('Initial commit');
  });

  it('should allow worktree creation after auto-initialization', async () => {
    await service.ensureGitRepository(tempDir);

    // Create a worktree — this requires a valid git repo with at least one commit
    const wtPath = join(tempDir, '.worktrees', 'test-branch');
    const result = await service.create(tempDir, 'test-branch', wtPath);

    expect(result.branch).toBe('test-branch');
    expect(existsSync(wtPath)).toBe(true);

    // Clean up worktree (use execFile directly since service.remove doesn't set cwd)
    await execFile('git', ['worktree', 'remove', wtPath], { cwd: tempDir });
  });
});
