/**
 * Merge Step Real-Git Integration Tests
 *
 * Exercises all 8 flag combinations of createMergeNode using real git repositories
 * in isolated temp directories. Tests that expose known bugs are left FAILING (RED)
 * per TDD mandate — they turn GREEN only after the bugs are fixed.
 *
 * Test matrix:
 *   commit-only-with-gate       push=false, openPr=false, allowMerge=false, remote=yes → interrupt
 *   local-merge-no-push         push=false, openPr=false, allowMerge=true,  remote=yes → local merge
 *   push-no-pr-merge            push=true,  openPr=false, allowMerge=true,  remote=yes → push + merge
 *   push-pr-with-gate           push=true,  openPr=true,  allowMerge=false, remote=yes → interrupt
 *   push-pr-auto-merge          push=true,  openPr=true,  allowMerge=true,  remote=yes → PR merge (BUG)
 *   no-remote-override-merge    push=true,  openPr=true,  allowMerge=true,  remote=no  → local merge
 *   no-remote-local-merge       push=false, openPr=false, allowMerge=true,  remote=no  → local merge
 *   undefined-gates-silent-skip approvalGates=undefined → no merge, lifecycle=Review
 */

import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

import { GitPrService } from '@/infrastructure/services/git/git-pr.service.js';
import {
  createMergeNode,
  type MergeNodeDeps,
} from '@/infrastructure/services/agents/feature-agent/nodes/merge/merge.node.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { ExecFunction } from '@/infrastructure/services/git/worktree.service.js';
import { initializeSettings, resetSettings } from '@/infrastructure/services/settings.service.js';
import { createDefaultSettings } from '@/domain/factories/settings-defaults.factory.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type { DiffSummary } from '@/application/ports/output/services/git-pr-service.interface.js';
import type { ApprovalGates } from '@/domain/generated/output.js';

/* ------------------------------------------------------------------ */
/*  Shared promisified execFile adapter                               */
/* ------------------------------------------------------------------ */

const execFileRaw = promisify(execFileCb);

/** Adapter satisfying the ExecFunction type: passes all calls to the real git binary. */
function makeRealExec(): ExecFunction {
  return (file, args, options) =>
    execFileRaw(file, args, options ?? {}) as Promise<{ stdout: string; stderr: string }>;
}

/* ------------------------------------------------------------------ */
/*  Selective ExecFunction wrapper (task-3)                           */
/* ------------------------------------------------------------------ */

/**
 * Returns an ExecFunction that intercepts `gh` CLI commands and returns
 * mock output, while passing all `git` commands through to the real binary.
 *
 * This enables PR-path tests to verify real local git state while simulating
 * the GitHub PR workflow without network access or a real gh CLI installation.
 */
function makeSelectiveExec(realExec: ExecFunction): ExecFunction {
  return async (file, args, options) => {
    if (file !== 'gh') {
      // Pass all git (and other) commands through to the real binary
      return realExec(file, args, options);
    }

    // Intercept gh commands and return mock output
    const [sub, cmd] = args;

    if (sub === 'pr' && cmd === 'create') {
      // Simulate: gh pr create → returns the PR URL
      return { stdout: `${FAKE_PR_URL}\n`, stderr: '' };
    }
    if (sub === 'pr' && cmd === 'merge') {
      // Simulate: gh pr merge → success (empty output)
      // NOTE: This mock does NOT actually merge any git branches.
      // This is intentional: it exposes the unverified-PR-merge bug where
      // the merge node skips verifyMerge() when prUrl is set.
      return { stdout: '', stderr: '' };
    }
    if (sub === 'pr' && cmd === 'view') {
      // Simulate: gh pr view → merged state (for CI watch loop)
      return { stdout: '{"state":"MERGED","statusCheckRollup":[]}\n', stderr: '' };
    }
    if (sub === 'run') {
      // Simulate: gh run list → no runs (CI loop exits early)
      return { stdout: '[]', stderr: '' };
    }

    // Default: return empty success for any other gh command
    return { stdout: '', stderr: '' };
  };
}

/* ------------------------------------------------------------------ */
/*  Shared constants                                                   */
/* ------------------------------------------------------------------ */

/** Fake PR URL used by all PR-path tests. Intercepted by makeSelectiveExec. */
const FAKE_PR_URL = 'https://github.com/test/repo/pull/42';

/* ------------------------------------------------------------------ */
/*  Mock executor factory (task-3)                                    */
/* ------------------------------------------------------------------ */

/**
 * Creates a mock IAgentExecutor that returns the given output string.
 * The output should contain a realistic commit hash line and, for PR-path
 * tests, a fake GitHub PR URL — these are parsed by parseCommitHash() and
 * parsePrUrl() in the merge node.
 */
function makeMockExecutor(output: string): IAgentExecutor {
  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockResolvedValue({ result: output }),
    executeStream: vi.fn() as IAgentExecutor['executeStream'],
    supportsFeature: vi.fn().mockReturnValue(false),
  } as IAgentExecutor;
}

/* ------------------------------------------------------------------ */
/*  Git harness (task-2)                                              */
/* ------------------------------------------------------------------ */

interface GitHarness {
  /** Path to the bare repository acting as the local remote */
  bareDir: string;
  /** Path to the working clone with origin pointing to bareDir */
  cloneDir: string;
  /** The feature branch name (feat/test-<timestamp>) */
  featureBranch: string;
  /**
   * Promisified execFile bound to cloneDir.
   * Use for assertion commands (git merge-base, git log, etc.).
   */
  runGit: (args: string[]) => Promise<{ stdout: string; stderr: string }>;
}

/**
 * Creates an isolated git test harness with:
 * - A bare repository as the local remote (`git init --bare`)
 * - A clone of it as the working copy (origin is set automatically)
 * - An initial commit on main, pushed to origin
 * - A feature branch with one commit, pushed to origin
 * - Returns pointing HEAD back at main in the clone
 */
async function createGitHarness(): Promise<GitHarness> {
  const realExec = makeRealExec();

  // Create bare repo (acts as the remote/origin)
  const bareDir = mkdtempSync(join(tmpdir(), 'shep-merge-bare-'));
  await realExec('git', ['init', '--bare'], { cwd: bareDir });

  // Clone bare repo (acts as the working copy)
  const cloneDir = mkdtempSync(join(tmpdir(), 'shep-merge-clone-'));
  await realExec('git', ['clone', bareDir, cloneDir], {});

  // Configure git user (required for commits)
  await realExec('git', ['config', 'user.email', 'test@shep.test'], { cwd: cloneDir });
  await realExec('git', ['config', 'user.name', 'Shep Test'], { cwd: cloneDir });

  // Initial commit on main (rename default branch to main for consistency across git versions)
  writeFileSync(join(cloneDir, 'README.md'), '# Test Repo\n');
  await realExec('git', ['add', 'README.md'], { cwd: cloneDir });
  await realExec('git', ['commit', '-m', 'Initial commit'], { cwd: cloneDir });
  await realExec('git', ['branch', '-M', 'main'], { cwd: cloneDir });
  await realExec('git', ['push', '-u', 'origin', 'main'], { cwd: cloneDir });

  // Create feature branch with one commit
  const featureBranch = `feat/test-${Date.now()}`;
  await realExec('git', ['checkout', '-b', featureBranch], { cwd: cloneDir });
  writeFileSync(join(cloneDir, 'feature.ts'), '// Feature implementation\nexport {};\n');
  await realExec('git', ['add', 'feature.ts'], { cwd: cloneDir });
  await realExec('git', ['commit', '-m', 'feat: add feature implementation'], { cwd: cloneDir });
  await realExec('git', ['push', '-u', 'origin', featureBranch], { cwd: cloneDir });

  // Switch back to main (Phase 2 merge runs in repositoryPath, checks out main to merge into it)
  await realExec('git', ['checkout', 'main'], { cwd: cloneDir });

  const runGit = (args: string[]) => realExec('git', args, { cwd: cloneDir });

  return { bareDir, cloneDir, featureBranch, runGit };
}

/**
 * Creates an isolated local-only git repo (no remote) for no-remote test scenarios.
 * The repo has main + a feature branch with one commit.
 */
async function createLocalOnlyHarness(): Promise<{
  repoDir: string;
  featureBranch: string;
  runGit: (args: string[]) => Promise<{ stdout: string; stderr: string }>;
}> {
  const realExec = makeRealExec();
  const repoDir = mkdtempSync(join(tmpdir(), 'shep-merge-local-'));

  await realExec('git', ['init'], { cwd: repoDir });
  await realExec('git', ['config', 'user.email', 'test@shep.test'], { cwd: repoDir });
  await realExec('git', ['config', 'user.name', 'Shep Test'], { cwd: repoDir });

  // Initial commit on main (rename default branch to main for consistency across git versions)
  writeFileSync(join(repoDir, 'README.md'), '# Test Repo\n');
  await realExec('git', ['add', 'README.md'], { cwd: repoDir });
  await realExec('git', ['commit', '-m', 'Initial commit'], { cwd: repoDir });
  await realExec('git', ['branch', '-M', 'main'], { cwd: repoDir });

  // Feature branch
  const featureBranch = `feat/test-${Date.now()}`;
  await realExec('git', ['checkout', '-b', featureBranch], { cwd: repoDir });
  writeFileSync(join(repoDir, 'feature.ts'), '// Feature implementation\nexport {};\n');
  await realExec('git', ['add', 'feature.ts'], { cwd: repoDir });
  await realExec('git', ['commit', '-m', 'feat: add feature implementation'], { cwd: repoDir });

  // Switch back to main
  await realExec('git', ['checkout', 'main'], { cwd: repoDir });

  const runGit = (args: string[]) => realExec('git', args, { cwd: repoDir });

  return { repoDir, featureBranch, runGit };
}

/**
 * Removes the harness temp directories.
 * Called in afterEach — runs even when tests fail.
 */
function destroyHarness(dirs: string[]): void {
  for (const dir of dirs) {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ */
/*  SpecDir utility (task-1)                                          */
/* ------------------------------------------------------------------ */

/**
 * Creates a real specDir inside tempDir with a valid feature.yaml and stub YAML files.
 * The merge node calls markPhaseComplete(specDir, 'merge', log) which writes to disk.
 *
 * @param tempDir - Parent temp directory to create specDir inside
 * @param completedPhases - Phases already completed (defaults to []).
 *   Pass ['merge'] to simulate post-Phase-1 state (skips commit+push in Phase 1).
 */
function makeSpecDir(tempDir: string, completedPhases: string[] = []): string {
  const specDir = join(tempDir, 'spec');
  mkdirSync(specDir, { recursive: true });

  const phasesYaml =
    completedPhases.length > 0 ? `[${completedPhases.map((p) => `"${p}"`).join(', ')}]` : '[]';

  writeFileSync(join(specDir, 'feature.yaml'), `status:\n  completedPhases: ${phasesYaml}\n`);

  // Stub files required by spec file validators in other nodes
  writeFileSync(
    join(specDir, 'spec.yaml'),
    [
      'name: test-feature',
      'oneLiner: test feature',
      'summary: test feature summary',
      'phase: implementation',
      'sizeEstimate: S',
      'content: test',
      'technologies: []',
      'openQuestions: []',
    ]
      .join('\n')
      .concat('\n')
  );
  writeFileSync(
    join(specDir, 'research.yaml'),
    'name: test\nsummary: test\ncontent: test\ndecisions: []\n'
  );
  writeFileSync(join(specDir, 'plan.yaml'), 'content: test\nphases: []\nfilesToCreate: []\n');
  writeFileSync(join(specDir, 'tasks.yaml'), 'tasks: []\n');

  return specDir;
}

/* ------------------------------------------------------------------ */
/*  MergeNodeDeps factory                                             */
/* ------------------------------------------------------------------ */

interface BuildDepsOptions {
  /** ExecFunction to use for GitPrService (defaults to real exec) */
  execFn?: ExecFunction;
  /** Mock executor output string (parsed for commit hash / PR URL) */
  executorOutput?: string;
  /** Feature branch that the mock featureRepository.findById returns */
  featureBranch?: string;
}

interface BuiltDeps {
  deps: MergeNodeDeps;
  featureRepository: MergeNodeDeps['featureRepository'];
  executor: IAgentExecutor;
}

/**
 * Builds MergeNodeDeps with a real GitPrService (using the provided ExecFunction)
 * and a mock IAgentExecutor. The featureRepository is fully mocked.
 */
function buildDeps(opts: BuildDepsOptions = {}): BuiltDeps {
  const execFn = opts.execFn ?? makeRealExec();
  const gitPrService = new GitPrService(execFn);

  const featureRepository = {
    findById: vi.fn().mockResolvedValue({
      id: 'test-feature-123',
      lifecycle: 'Implementation',
      branch: opts.featureBranch ?? 'feat/test-branch',
    }),
    update: vi.fn().mockResolvedValue(undefined),
  } as unknown as MergeNodeDeps['featureRepository'];

  // Default executor output: contains a commit hash (parsed by parseCommitHash)
  // but no PR URL (openPr=false tests). PR-path tests pass a URL in the output.
  const executorOutput =
    opts.executorOutput ?? '[feat/test abc1234] feat: implement feature\nDone.';
  const executor = makeMockExecutor(executorOutput);

  const deps: MergeNodeDeps = {
    executor,
    getDiffSummary: vi.fn().mockResolvedValue({
      filesChanged: 1,
      additions: 10,
      deletions: 2,
      commitCount: 1,
    } satisfies DiffSummary),
    hasRemote: (cwd) => gitPrService.hasRemote(cwd),
    getDefaultBranch: (cwd) => gitPrService.getDefaultBranch(cwd),
    featureRepository,
    verifyMerge: (cwd, fb, bb) => gitPrService.verifyMerge(cwd, fb, bb),
    gitPrService,
  };

  return { deps, featureRepository, executor };
}

/* ------------------------------------------------------------------ */
/*  State factory                                                      */
/* ------------------------------------------------------------------ */

/**
 * Builds a minimal FeatureAgentState with all defaults filled in.
 * Override fields as needed per test scenario.
 */
function makeState(overrides: Partial<FeatureAgentState>): FeatureAgentState {
  return {
    featureId: 'test-feature-123',
    repositoryPath: '',
    specDir: '',
    worktreePath: '',
    currentNode: 'merge',
    error: null,
    approvalGates: undefined,
    messages: [],
    validationRetries: 0,
    lastValidationTarget: '',
    lastValidationErrors: [],
    _approvalAction: null,
    _rejectionFeedback: null,
    _needsReexecution: false,
    prUrl: null,
    prNumber: null,
    commitHash: null,
    ciStatus: null,
    push: false,
    openPr: false,
    ciFixAttempts: 0,
    ciFixHistory: [],
    ciFixStatus: 'idle',
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Assertion helper: verify a branch IS ancestor of another         */
/* ------------------------------------------------------------------ */

/**
 * Asserts that featureBranch has been merged into baseBranch using real git.
 * Fails the test with a descriptive message if the merge did not land.
 */
async function assertMergeLanded(
  runGit: (args: string[]) => Promise<{ stdout: string; stderr: string }>,
  featureBranch: string,
  baseBranch: string
): Promise<void> {
  let landed = false;
  try {
    await runGit(['merge-base', '--is-ancestor', featureBranch, baseBranch]);
    landed = true;
  } catch {
    landed = false;
  }
  expect(
    landed,
    `Expected ${featureBranch} to be an ancestor of ${baseBranch} after merge, but it was not`
  ).toBe(true);
}

/**
 * Asserts that featureBranch has NOT been merged into baseBranch.
 * Used to verify that the unverified-PR-merge bug is present (merge skipped verifyMerge).
 */
async function assertMergeNotLanded(
  runGit: (args: string[]) => Promise<{ stdout: string; stderr: string }>,
  featureBranch: string,
  baseBranch: string
): Promise<void> {
  let landed = false;
  try {
    await runGit(['merge-base', '--is-ancestor', featureBranch, baseBranch]);
    landed = true;
  } catch {
    landed = false;
  }
  expect(
    landed,
    `Expected ${featureBranch} to NOT be an ancestor of ${baseBranch} (merge skipped verifyMerge), but it was`
  ).toBe(false);
}

/* ================================================================== */
/*  Test suite                                                         */
/* ================================================================== */

describe('Merge Step — Real Git Integration Tests', () => {
  // Suppress stdout/stderr from merge node logging
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  // Track harness dirs for cleanup in afterEach
  let harnessToCleanup: string[] = [];

  beforeAll(() => {
    // Initialize the settings singleton required by the CI watch/fix loop.
    // This must be initialized before any test runs (even tests that don't exercise CI).
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
    // Clean up all temp directories even if the test failed
    destroyHarness(harnessToCleanup);
    harnessToCleanup = [];
  });

  /* ---------------------------------------------------------------- */
  /*  Infrastructure smoke test: verify harness setup works          */
  /* ---------------------------------------------------------------- */

  describe('createGitHarness smoke test', () => {
    it('should create a bare repo and clone with main + feature branch', async () => {
      const harness = await createGitHarness();
      harnessToCleanup.push(harness.bareDir, harness.cloneDir);

      // Two commits total across all branches: initial (main) + feature commit
      const { stdout } = await harness.runGit(['log', '--all', '--oneline']);
      const commitLines = stdout.trim().split('\n').filter(Boolean);
      expect(commitLines).toHaveLength(2);

      // Feature branch exists
      const { stdout: branches } = await harness.runGit(['branch', '-a']);
      expect(branches).toContain(harness.featureBranch);

      // Origin is set to bareDir
      const { stdout: remoteUrl } = await harness.runGit(['remote', 'get-url', 'origin']);
      expect(remoteUrl.trim()).toBe(harness.bareDir);
    });

    it('createLocalOnlyHarness: should create a local repo with no remote', async () => {
      const { repoDir, featureBranch, runGit } = await createLocalOnlyHarness();
      harnessToCleanup.push(repoDir);

      // No remote configured
      const { stdout: remotes } = await runGit(['remote']);
      expect(remotes.trim()).toBe('');

      // Feature branch exists
      await runGit(['checkout', featureBranch]);
      const { stdout: log } = await runGit(['log', '--oneline']);
      expect(log.trim().split('\n').filter(Boolean)).toHaveLength(2);
      await runGit(['checkout', 'main']);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  makeSelectiveExec smoke test                                    */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /*  makeSpecDir smoke test                                          */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /*  Test 1: commit-only-with-gate                                  */
  /*  push=false, openPr=false, allowMerge=false, remote=yes         */
  /*  Expected: Phase 1 runs (commit via agent), then interrupts      */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /*  Test 2: local-merge-no-push (KNOWN BUG — expected RED)        */
  /*  push=false, openPr=false, allowMerge=true, remote=yes          */
  /*  Expected: commit via agent + local merge into base branch       */
  /*  Bug: mock executor doesn't run real git merge →                 */
  /*       verifyMerge() throws "Merge verification failed"           */
  /* ---------------------------------------------------------------- */

  it('local-merge-no-push: feature branch should be merged into main after node completes', async () => {
    const harness = await createGitHarness();
    harnessToCleanup.push(harness.bareDir, harness.cloneDir);

    const tempDir = mkdtempSync(join(tmpdir(), 'shep-test-spec-'));
    harnessToCleanup.push(tempDir);
    const specDir = makeSpecDir(tempDir);

    const { deps, featureRepository } = buildDeps({
      featureBranch: harness.featureBranch,
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

    // RED: On the unmodified codebase, the mock executor does not run real git merge.
    // verifyMerge() will find the branch was not merged and throw "Merge verification failed".
    // This test is expected to FAIL until the merge bug is fixed.
    await mergeNode(state);

    // Assert the merge actually landed in the git repo
    await assertMergeLanded(harness.runGit, harness.featureBranch, 'main');

    // Lifecycle should be Maintain (merged)
    expect(featureRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: 'Maintain' })
    );
  });

  /* ---------------------------------------------------------------- */
  /*  Test 3: push-no-pr-merge (KNOWN BUG — expected RED)           */
  /*  push=true, openPr=false, allowMerge=true, remote=yes           */
  /*  Expected: push via agent + local merge into base branch         */
  /* ---------------------------------------------------------------- */

  it('push-no-pr-merge: feature branch should be merged into main after push+merge', async () => {
    const harness = await createGitHarness();
    harnessToCleanup.push(harness.bareDir, harness.cloneDir);

    const tempDir = mkdtempSync(join(tmpdir(), 'shep-test-spec-'));
    harnessToCleanup.push(tempDir);
    const specDir = makeSpecDir(tempDir);

    // Use selective exec so that gh run list returns [] (no CI runs)
    const realExec = makeRealExec();
    const selectiveExec = makeSelectiveExec(realExec);

    const { deps, featureRepository } = buildDeps({
      execFn: selectiveExec,
      featureBranch: harness.featureBranch,
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

    // RED: Mock executor does not run real git merge. verifyMerge() throws.
    await mergeNode(state);

    await assertMergeLanded(harness.runGit, harness.featureBranch, 'main');
    expect(featureRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: 'Maintain' })
    );
  });

  /* ---------------------------------------------------------------- */
  /*  Test 4: push-pr-with-gate                                      */
  /*  push=true, openPr=true, allowMerge=false, remote=yes           */
  /*  Expected: push + PR created via agent, then interrupt           */
  /* ---------------------------------------------------------------- */

  it('push-pr-with-gate: should interrupt at merge gate when allowMerge=false (PR path)', async () => {
    const harness = await createGitHarness();
    harnessToCleanup.push(harness.bareDir, harness.cloneDir);

    const tempDir = mkdtempSync(join(tmpdir(), 'shep-test-spec-'));
    harnessToCleanup.push(tempDir);
    const specDir = makeSpecDir(tempDir);

    // PR-path: executor returns output with commit hash + fake PR URL
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

  /* ---------------------------------------------------------------- */
  /*  Test 5: push-pr-auto-merge (KNOWN BUG — expected RED)         */
  /*  push=true, openPr=true, allowMerge=true, remote=yes            */
  /*  Expected: push + PR + PR merge → merge lands in base           */
  /*  Bug: verifyMerge() is SKIPPED when prUrl is set                */
  /*       → merge node reports success but merge never landed        */
  /* ---------------------------------------------------------------- */

  // BUG: This test is expected to FAIL (RED) until verifyMerge() is called on the PR path.
  // See: packages/core/src/infrastructure/services/agents/feature-agent/nodes/merge/merge.node.ts
  // Bug location: line ~205 — verifyMerge() is skipped when prUrl is set, so the node reports
  // merge success without verifying that 'gh pr merge' actually merged the local git branch.
  // This test turns GREEN only after the fix: call verifyMerge() regardless of prUrl.
  it('push=true, openPr=true, allowMerge=true → BUG: verifyMerge skipped after gh pr merge', async () => {
    const harness = await createGitHarness();
    harnessToCleanup.push(harness.bareDir, harness.cloneDir);

    const tempDir = mkdtempSync(join(tmpdir(), 'shep-test-spec-'));
    harnessToCleanup.push(tempDir);

    // Pre-populate completedPhases: ["merge"] to simulate post-Phase-1 state.
    // NOTE: Due to the isResumeAfterInterrupt logic in merge.node.ts, this only
    // skips Phase 1 when allowMerge=false (gate scenario). With allowMerge=true,
    // Phase 1 still runs, but prUrl is pre-set in state so the executor output
    // does not need to contain a PR URL — Phase 2 uses the pre-set prUrl directly.
    const specDir = makeSpecDir(tempDir, ['merge']);

    // PR-path: selective exec intercepts gh commands.
    // gh pr merge returns "" (success) WITHOUT performing a real local git merge.
    // This is intentional — it exposes the bug where the node skips verifyMerge().
    const realExec = makeRealExec();
    const selectiveExec = makeSelectiveExec(realExec);

    const { deps, featureRepository } = buildDeps({
      execFn: selectiveExec,
      featureBranch: harness.featureBranch,
      // Executor output contains only commit hash — no PR URL.
      // prUrl comes from state (pre-set below), not from executor output.
      executorOutput: '[feat/test abc1234] feat: implement\nDone.',
    });

    const state = makeState({
      repositoryPath: harness.cloneDir,
      worktreePath: harness.cloneDir,
      specDir,
      push: true,
      openPr: true,
      approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
      // Pre-set prUrl to simulate post-Phase-1 state where a PR was already created.
      // Phase 2 uses this to choose the gh pr merge code path.
      prUrl: FAKE_PR_URL,
      prNumber: 42,
    });

    const mergeNode = createMergeNode(deps);

    // The node completes without throwing (gh pr merge mock returns "" — no error).
    // BUT verifyMerge() is SKIPPED because prUrl is set (merge.node.ts line ~205).
    // The node reports lifecycle=Maintain without the merge actually landing.
    await mergeNode(state);

    // RED: This assertion FAILS on the unmodified codebase because:
    //   - The selective exec's gh pr merge mock returns "" (no real git merge happens)
    //   - verifyMerge() is skipped when prUrl is set → no verification of actual merge
    //   - The feature branch is NOT an ancestor of main after node completes
    // Human-readable failure: "Expected feat/... to be an ancestor of main after merge, but it was not"
    await assertMergeLanded(harness.runGit, harness.featureBranch, 'main');

    // Secondary assertion: node reports lifecycle=Maintain (it believes the merge succeeded)
    expect(featureRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: 'Maintain' })
    );
  });

  /* ---------------------------------------------------------------- */
  /*  Test 6: no-remote-override-merge (KNOWN BUG — expected RED)  */
  /*  push=true, openPr=true, allowMerge=true, remote=no            */
  /*  Expected: remote unavailable → effectiveState overrides to     */
  /*  push=false, openPr=false → commit only + local merge           */
  /* ---------------------------------------------------------------- */

  it('no-remote-override-merge: should merge locally when remote unavailable (push+openPr overridden)', async () => {
    const { repoDir, featureBranch, runGit } = await createLocalOnlyHarness();
    harnessToCleanup.push(repoDir);

    const tempDir = mkdtempSync(join(tmpdir(), 'shep-test-spec-'));
    harnessToCleanup.push(tempDir);
    const specDir = makeSpecDir(tempDir);

    const { deps, featureRepository } = buildDeps({
      featureBranch,
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

    // RED: Mock executor does not run real git merge. verifyMerge() throws.
    await mergeNode(state);

    await assertMergeLanded(runGit, featureBranch, 'main');
    expect(featureRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: 'Maintain' })
    );
  });

  /* ---------------------------------------------------------------- */
  /*  Test 7: no-remote-local-merge (KNOWN BUG — expected RED)     */
  /*  push=false, openPr=false, allowMerge=true, remote=no          */
  /*  Expected: no remote, commit + local merge                      */
  /* ---------------------------------------------------------------- */

  it('no-remote-local-merge: should merge locally without any remote', async () => {
    const { repoDir, featureBranch, runGit } = await createLocalOnlyHarness();
    harnessToCleanup.push(repoDir);

    const tempDir = mkdtempSync(join(tmpdir(), 'shep-test-spec-'));
    harnessToCleanup.push(tempDir);
    const specDir = makeSpecDir(tempDir);

    const { deps, featureRepository } = buildDeps({
      featureBranch,
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

    // RED: Mock executor does not run real git merge. verifyMerge() throws.
    await mergeNode(state);

    await assertMergeLanded(runGit, featureBranch, 'main');
    expect(featureRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: 'Maintain' })
    );
  });

  /* ---------------------------------------------------------------- */
  /*  Test 8: undefined-gates-silent-skip                            */
  /*  approvalGates=undefined → no gate, no merge, lifecycle=Review   */
  /*  Expected: node completes, no merge attempted, no error          */
  /* ---------------------------------------------------------------- */

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
      approvalGates: undefined, // No gates defined
    });

    const mergeNode = createMergeNode(deps);

    // Node should complete without error (no interrupt, no merge attempted)
    await mergeNode(state);

    // verifyMerge must NOT be called (merge was silently skipped)
    expect(verifyMergeSpy).not.toHaveBeenCalled();

    // Lifecycle stays at Review (not Maintain — no merge happened)
    expect(featureRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: 'Review' })
    );

    // Feature branch is NOT merged into main
    await assertMergeNotLanded(harness.runGit, harness.featureBranch, 'main');
  });
});
