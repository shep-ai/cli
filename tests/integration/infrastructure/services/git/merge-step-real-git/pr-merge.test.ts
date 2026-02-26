/**
 * PR merge test (KNOWN BUG — it.fails).
 *
 * push=true, openPr=true, allowMerge=true, remote=yes
 * Expected: push + PR + PR merge → merge lands in base.
 * Bug: verifyMerge() is SKIPPED when prUrl is set → merge node reports
 * success without verifying that 'gh pr merge' actually merged the branch.
 *
 * See: merge.node.ts line ~205 — verifyMerge() is guarded by `if (!prUrl)`.
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
import { FAKE_PR_URL } from './fixtures.js';

describe('Merge Step — PR Merge (Known Bug)', () => {
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

  // BUG: verifyMerge() is skipped when prUrl is set, so the node reports
  // merge success without verifying that 'gh pr merge' actually merged the branch.
  // This test turns GREEN only after the fix: call verifyMerge() regardless of prUrl.
  it.fails(
    'push=true, openPr=true, allowMerge=true → BUG: verifyMerge skipped after gh pr merge',
    async () => {
      const harness = await createGitHarness();
      harnessToCleanup.push(harness.bareDir, harness.cloneDir);

      const tempDir = mkdtempSync(join(tmpdir(), 'shep-test-spec-'));
      harnessToCleanup.push(tempDir);

      // Pre-populate completedPhases: ["merge"] to simulate post-Phase-1 state.
      const specDir = makeSpecDir(tempDir, ['merge']);

      const realExec = makeRealExec();
      const selectiveExec = makeSelectiveExec(realExec);

      const { deps, featureRepository } = buildDeps({
        execFn: selectiveExec,
        featureBranch: harness.featureBranch,
        executorOutput: '[feat/test abc1234] feat: implement\nDone.',
      });

      const state = makeState({
        repositoryPath: harness.cloneDir,
        worktreePath: harness.cloneDir,
        specDir,
        push: true,
        openPr: true,
        approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
        prUrl: FAKE_PR_URL,
        prNumber: 42,
      });

      const mergeNode = createMergeNode(deps);

      // The node completes without throwing (gh pr merge mock returns "" — no error).
      // BUT verifyMerge() is SKIPPED because prUrl is set.
      await mergeNode(state);

      // RED: The feature branch is NOT an ancestor of main after node completes.
      await assertMergeLanded(harness.runGit, harness.featureBranch, 'main');

      expect(featureRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: 'Maintain' })
      );
    }
  );
});
