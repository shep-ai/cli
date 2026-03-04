/**
 * Local merge tests — real git operations via makeGitExecutor.
 *
 * These tests verify that the merge node performs a real local git merge
 * using an executor that runs actual git commands (squash merge).
 *
 * - local-merge-no-push:       push=false, openPr=false, allowMerge=true, remote=yes
 * - no-remote-override-merge:  push=true,  openPr=true,  allowMerge=true, remote=no
 * - no-remote-local-merge:     push=false, openPr=false, allowMerge=true, remote=no
 */

import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMergeNode } from '@/infrastructure/services/agents/feature-agent/nodes/merge/merge.node.js';
import { initializeSettings, resetSettings } from '@/infrastructure/services/settings.service.js';
import { createDefaultSettings } from '@/domain/factories/settings-defaults.factory.js';
import {
  createGitHarness,
  createLocalOnlyHarness,
  destroyHarness,
  makeSpecDir,
  buildDeps,
  makeState,
} from './setup.js';
import { assertMergeLanded } from './helpers.js';

describe('Merge Step — Local Merge', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let harnessToCleanup: string[] = [];

  beforeAll(() => {
    initializeSettings(createDefaultSettings());
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterAll(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    resetSettings();
  });

  afterEach(() => {
    destroyHarness(harnessToCleanup);
    harnessToCleanup = [];
  });

  it('local-merge-no-push: feature branch should be merged into main after node completes', async () => {
    const harness = await createGitHarness();
    harnessToCleanup.push(harness.bareDir, harness.cloneDir);

    const tempDir = mkdtempSync(join(tmpdir(), 'shep-test-spec-'));
    harnessToCleanup.push(tempDir);
    const specDir = makeSpecDir(tempDir);

    const { deps, featureRepository } = buildDeps({
      featureBranch: harness.featureBranch,
      useRealGit: true,
    });

    const state = makeState({
      repositoryPath: harness.cloneDir,
      worktreePath: harness.cloneDir,
      specDir,
      push: false,
      openPr: false,
      approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
    });

    const mergeNode = createMergeNode(deps);

    await mergeNode(state);

    await assertMergeLanded(harness.runGit, harness.featureBranch, 'main');

    expect(featureRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: 'Maintain' })
    );
  });

  it('no-remote-override-merge: should merge locally when remote unavailable (push+openPr overridden)', async () => {
    const { repoDir, featureBranch, runGit } = await createLocalOnlyHarness();
    harnessToCleanup.push(repoDir);

    const tempDir = mkdtempSync(join(tmpdir(), 'shep-test-spec-'));
    harnessToCleanup.push(tempDir);
    const specDir = makeSpecDir(tempDir);

    const { deps, featureRepository } = buildDeps({
      featureBranch,
      useRealGit: true,
    });

    const state = makeState({
      repositoryPath: repoDir,
      worktreePath: repoDir,
      specDir,
      // push+openPr=true, but remote is unavailable → effectiveState overrides both to false
      push: true,
      openPr: true,
      approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
    });

    const mergeNode = createMergeNode(deps);

    await mergeNode(state);

    await assertMergeLanded(runGit, featureBranch, 'main');
    expect(featureRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: 'Maintain' })
    );
  });

  it('no-remote-local-merge: should merge locally without any remote', async () => {
    const { repoDir, featureBranch, runGit } = await createLocalOnlyHarness();
    harnessToCleanup.push(repoDir);

    const tempDir = mkdtempSync(join(tmpdir(), 'shep-test-spec-'));
    harnessToCleanup.push(tempDir);
    const specDir = makeSpecDir(tempDir);

    const { deps, featureRepository } = buildDeps({
      featureBranch,
      useRealGit: true,
    });

    const state = makeState({
      repositoryPath: repoDir,
      worktreePath: repoDir,
      specDir,
      push: false,
      openPr: false,
      approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
    });

    const mergeNode = createMergeNode(deps);

    await mergeNode(state);

    await assertMergeLanded(runGit, featureBranch, 'main');
    expect(featureRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: 'Maintain' })
    );
  });
});
