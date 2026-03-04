/**
 * Integration tests for GitPrService.verifyMerge() with real git repos.
 *
 * Validates that verifyMerge correctly detects:
 * - True merges (feature branch is ancestor of base)
 * - Squash merges (no ancestry link, but all changes incorporated)
 * - Unmerged branches (neither ancestor nor squash-equivalent)
 */

import 'reflect-metadata';
import { describe, it, expect, afterEach } from 'vitest';
import { GitPrService } from '@/infrastructure/services/git/git-pr.service.js';
import { createGitHarness, createLocalOnlyHarness, destroyHarness, makeRealExec } from './setup.js';

describe('GitPrService.verifyMerge — real git', () => {
  let harnessToCleanup: string[] = [];
  const realExec = makeRealExec();
  const service = new GitPrService(realExec);

  afterEach(() => {
    destroyHarness(harnessToCleanup);
    harnessToCleanup = [];
  });

  it('should return true after a true merge (git merge)', async () => {
    const { repoDir, featureBranch, runGit } = await createLocalOnlyHarness();
    harnessToCleanup.push(repoDir);

    await runGit(['merge', featureBranch]);

    const result = await service.verifyMerge(repoDir, featureBranch, 'main');
    expect(result).toBe(true);
  });

  it('should return true after a squash merge (git merge --squash)', async () => {
    const { repoDir, featureBranch, runGit } = await createLocalOnlyHarness();
    harnessToCleanup.push(repoDir);

    await runGit(['merge', '--squash', featureBranch]);
    await runGit(['commit', '-m', 'squash merge feature']);

    const result = await service.verifyMerge(repoDir, featureBranch, 'main');
    expect(result).toBe(true);
  });

  it('should return false when branch has not been merged', async () => {
    const { repoDir, featureBranch } = await createLocalOnlyHarness();
    harnessToCleanup.push(repoDir);

    const result = await service.verifyMerge(repoDir, featureBranch, 'main');
    expect(result).toBe(false);
  });

  it('should return false when main has extra commits after squash but feature has diverged', async () => {
    const { repoDir, featureBranch, runGit } = await createLocalOnlyHarness();
    harnessToCleanup.push(repoDir);

    // Add a different file on main so there's a diff between branches
    const { writeFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    writeFileSync(join(repoDir, 'main-only.ts'), '// main only\n');
    await runGit(['add', 'main-only.ts']);
    await runGit(['commit', '-m', 'main-only commit']);

    // Feature branch doesn't have main-only.ts, and main doesn't have feature.ts
    const result = await service.verifyMerge(repoDir, featureBranch, 'main');
    expect(result).toBe(false);
  });

  it('should return true after squash merge even when local branch is deleted (remote fallback)', async () => {
    const harness = await createGitHarness();
    harnessToCleanup.push(harness.bareDir, harness.cloneDir);

    // Squash merge the feature branch
    await harness.runGit(['merge', '--squash', harness.featureBranch]);
    await harness.runGit(['commit', '-m', 'squash merge feature']);

    // Delete the local branch (succeeds because it was pushed to remote)
    await harness.runGit(['branch', '-d', harness.featureBranch]);

    // verifyMerge should fall back to origin/<branch> and still detect the merge
    const result = await service.verifyMerge(harness.cloneDir, harness.featureBranch, 'main');
    expect(result).toBe(true);
  });
});
