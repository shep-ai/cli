/**
 * Gate tests: verify interrupt behavior when allowMerge=false.
 *
 * - commit-only-with-gate:  push=false, openPr=false, allowMerge=false → interrupt
 * - push-pr-with-gate:      push=true,  openPr=true,  allowMerge=false → interrupt
 */

import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMergeNode } from '@/infrastructure/services/agents/feature-agent/nodes/merge/merge.node.js';
import { initializeSettings, resetSettings } from '@/infrastructure/services/settings.service.js';
import { createDefaultSettings } from '@/domain/factories/settings-defaults.factory.js';
import type { ApprovalGates } from '@/domain/generated/output.js';
import {
  createGitHarness,
  destroyHarness,
  makeRealExec,
  makeSelectiveExec,
  makeSpecDir,
  buildDeps,
  makeState,
} from './setup.js';
import { assertMergeNotLanded } from './helpers.js';
import { FAKE_PR_URL } from './fixtures.js';

describe('Merge Step — Gate Tests', () => {
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

  it('commit-only-with-gate: should interrupt at merge gate when allowMerge=false', async () => {
    const harness = await createGitHarness();
    harnessToCleanup.push(harness.bareDir, harness.cloneDir);

    const tempDir = mkdtempSync(join(tmpdir(), 'shep-test-spec-'));
    harnessToCleanup.push(tempDir);
    const specDir = makeSpecDir(tempDir);

    const { deps, executor } = buildDeps({
      featureBranch: harness.featureBranch,
    });

    const approvalGates: ApprovalGates = {
      allowPrd: true,
      allowPlan: true,
      allowMerge: false,
    };

    const state = makeState({
      repositoryPath: harness.cloneDir,
      worktreePath: harness.cloneDir,
      specDir,
      push: false,
      openPr: false,
      approvalGates,
    });

    const mergeNode = createMergeNode(deps);

    // Node should interrupt (throws LangGraph bubble-up error)
    await expect(mergeNode(state)).rejects.toThrow();

    // Phase 1 agent was called (commit+push+PR prompt)
    expect(executor.execute).toHaveBeenCalledTimes(1);
  });

  it('push-pr-with-gate: should interrupt at merge gate when allowMerge=false (PR path)', async () => {
    const harness = await createGitHarness();
    harnessToCleanup.push(harness.bareDir, harness.cloneDir);

    const tempDir = mkdtempSync(join(tmpdir(), 'shep-test-spec-'));
    harnessToCleanup.push(tempDir);
    const specDir = makeSpecDir(tempDir);

    const realExec = makeRealExec();
    const selectiveExec = makeSelectiveExec(realExec);

    const { deps, executor } = buildDeps({
      execFn: selectiveExec,
      featureBranch: harness.featureBranch,
      executorOutput: `[feat/test abc1234] feat: implement\n${FAKE_PR_URL}\nDone.`,
    });

    const approvalGates: ApprovalGates = {
      allowPrd: true,
      allowPlan: true,
      allowMerge: false,
    };

    const state = makeState({
      repositoryPath: harness.cloneDir,
      worktreePath: harness.cloneDir,
      specDir,
      push: true,
      openPr: true,
      approvalGates,
    });

    const mergeNode = createMergeNode(deps);

    // Should interrupt (LangGraph bubble-up error)
    await expect(mergeNode(state)).rejects.toThrow();

    // Agent was called once for commit+push+PR (no Phase 2 since interrupted)
    expect(executor.execute).toHaveBeenCalledTimes(1);

    // Feature branch should be visible on origin (harness pushed it in setup)
    await harness.runGit(['fetch', 'origin']);
    const { stdout: logOut } = await harness.runGit([
      'log',
      `origin/${harness.featureBranch}`,
      '--oneline',
    ]);
    expect(logOut.trim().split('\n').filter(Boolean).length).toBeGreaterThanOrEqual(1);

    // No merge should have occurred — interrupt fired before Phase 2
    await assertMergeNotLanded(harness.runGit, harness.featureBranch, 'main');
  });
});
