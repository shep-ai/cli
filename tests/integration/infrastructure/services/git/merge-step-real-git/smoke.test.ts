/**
 * Smoke tests for the merge-step test infrastructure:
 * - createGitHarness / createLocalOnlyHarness
 * - makeSelectiveExec (gh CLI interceptor)
 * - makeSpecDir (spec directory scaffolding)
 */

import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeSettings, resetSettings } from '@/infrastructure/services/settings.service.js';
import { createDefaultSettings } from '@/domain/factories/settings-defaults.factory.js';
import {
  createGitHarness,
  createLocalOnlyHarness,
  destroyHarness,
  makeRealExec,
  makeSelectiveExec,
  makeSpecDir,
} from './setup.js';
import { FAKE_PR_URL } from './fixtures.js';

describe('Merge Step — Smoke Tests', () => {
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

  describe('createGitHarness', () => {
    it('should create a bare repo and clone with main + feature branch', async () => {
      const harness = await createGitHarness();
      harnessToCleanup.push(harness.bareDir, harness.cloneDir);

      const { stdout } = await harness.runGit(['log', '--all', '--oneline']);
      const commitLines = stdout.trim().split('\n').filter(Boolean);
      expect(commitLines).toHaveLength(2);

      const { stdout: branches } = await harness.runGit(['branch', '-a']);
      expect(branches).toContain(harness.featureBranch);

      const { stdout: remoteUrl } = await harness.runGit(['remote', 'get-url', 'origin']);
      expect(remoteUrl.trim()).toBe(harness.bareDir);
    });

    it('createLocalOnlyHarness: should create a local repo with no remote', async () => {
      const { repoDir, featureBranch, runGit } = await createLocalOnlyHarness();
      harnessToCleanup.push(repoDir);

      const { stdout: remotes } = await runGit(['remote']);
      expect(remotes.trim()).toBe('');

      await runGit(['checkout', featureBranch]);
      const { stdout: log } = await runGit(['log', '--oneline']);
      expect(log.trim().split('\n').filter(Boolean)).toHaveLength(2);
      await runGit(['checkout', 'main']);
    });
  });

  describe('makeSelectiveExec', () => {
    it('should return fake PR URL for gh pr create', async () => {
      const selectiveExec = makeSelectiveExec(makeRealExec());
      const result = await selectiveExec('gh', ['pr', 'create', '--title', 'test'], {});
      expect(result.stdout).toContain(FAKE_PR_URL);
    });

    it('should return empty success for gh pr merge', async () => {
      const selectiveExec = makeSelectiveExec(makeRealExec());
      const result = await selectiveExec('gh', ['pr', 'merge', '42', '--squash'], {});
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
    });

    it('should pass git commands through to real binary', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'shep-selective-test-'));
      harnessToCleanup.push(tempDir);
      const realExec = makeRealExec();
      await realExec('git', ['init'], { cwd: tempDir });
      const selectiveExec = makeSelectiveExec(realExec);
      const { stdout } = await selectiveExec('git', ['status', '--short'], { cwd: tempDir });
      expect(typeof stdout).toBe('string');
    });
  });

  describe('makeSpecDir', () => {
    it('should create specDir with feature.yaml containing empty completedPhases', () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'shep-specdir-test-'));
      harnessToCleanup.push(tempDir);

      const specDir = makeSpecDir(tempDir);
      const content = readFileSync(join(specDir, 'feature.yaml'), 'utf-8');
      expect(content).toContain('completedPhases: []');
    });

    it('should write completedPhases when specified', () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'shep-specdir-test-'));
      harnessToCleanup.push(tempDir);

      const specDir = makeSpecDir(tempDir, ['merge']);
      const content = readFileSync(join(specDir, 'feature.yaml'), 'utf-8');
      expect(content).toContain('"merge"');
    });
  });
});
