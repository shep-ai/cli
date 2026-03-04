/**
 * Push + merge test — real git operations via makeGitExecutor.
 *
 * push=true, openPr=false, allowMerge=true, remote=yes
 * Expected: commit via agent + local squash merge into base branch.
 *
 * Uses makeSelectiveExec to intercept `gh` CLI commands (for CI status checks)
 * while allowing real git operations through.
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
  destroyHarness,
  makeRealExec,
  makeSelectiveExec,
  makeSpecDir,
  buildDeps,
  makeState,
} from './setup.js';
import { assertMergeLanded } from './helpers.js';

describe('Merge Step — Push Merge', () => {
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

  it('push-no-pr-merge: feature branch should be merged into main after push+merge', async () => {
    const harness = await createGitHarness();
    harnessToCleanup.push(harness.bareDir, harness.cloneDir);

    const tempDir = mkdtempSync(join(tmpdir(), 'shep-test-spec-'));
    harnessToCleanup.push(tempDir);
    const specDir = makeSpecDir(tempDir);

    const realExec = makeRealExec();
    const selectiveExec = makeSelectiveExec(realExec);

    const { deps, featureRepository } = buildDeps({
      execFn: selectiveExec,
      featureBranch: harness.featureBranch,
      useRealGit: true,
    });

    const state = makeState({
      repositoryPath: harness.cloneDir,
      worktreePath: harness.cloneDir,
      specDir,
      push: true,
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
});
