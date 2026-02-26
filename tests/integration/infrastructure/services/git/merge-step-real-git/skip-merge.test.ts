/**
 * Skip merge test: approvalGates=undefined → no merge, lifecycle=Review.
 *
 * Verifies the node completes without error when no gates are defined,
 * no merge is attempted, and verifyMerge is never called.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMergeNode } from '@/infrastructure/services/agents/feature-agent/nodes/merge/merge.node.js';
import { initializeSettings, resetSettings } from '@/infrastructure/services/settings.service.js';
import { createDefaultSettings } from '@/domain/factories/settings-defaults.factory.js';
import { createGitHarness, destroyHarness, makeSpecDir, buildDeps, makeState } from './setup.js';
import { assertMergeNotLanded } from './helpers.js';

describe('Merge Step — Skip Merge', () => {
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

  it('undefined-gates-silent-skip: should skip merge silently when approvalGates is undefined', async () => {
    const harness = await createGitHarness();
    harnessToCleanup.push(harness.bareDir, harness.cloneDir);

    const tempDir = mkdtempSync(join(tmpdir(), 'shep-test-spec-'));
    harnessToCleanup.push(tempDir);
    const specDir = makeSpecDir(tempDir);

    const { deps, featureRepository } = buildDeps({
      featureBranch: harness.featureBranch,
    });

    const verifyMergeSpy = vi.spyOn(deps, 'verifyMerge');

    const state = makeState({
      repositoryPath: harness.cloneDir,
      worktreePath: harness.cloneDir,
      specDir,
      push: false,
      openPr: false,
      approvalGates: undefined,
    });

    const mergeNode = createMergeNode(deps);

    await mergeNode(state);

    expect(verifyMergeSpy).not.toHaveBeenCalled();

    expect(featureRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: 'Review' })
    );

    await assertMergeNotLanded(harness.runGit, harness.featureBranch, 'main');
  });
});
