/**
 * Integration tests for GitPrService fork-sync and rebase methods.
 *
 * Uses real temporary git repositories to verify actual git state transitions.
 * The gh CLI calls in isFork() are intercepted via a mock exec function;
 * all git commands run against real binaries.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

import { GitPrService } from '@/infrastructure/services/git/git-pr.service.js';
import { GitPrErrorCode } from '@/application/ports/output/services/git-pr-service.interface.js';
import type { ExecFunction } from '@/infrastructure/services/git/worktree.service.js';

const execFileRaw = promisify(execFileCb);

/* ------------------------------------------------------------------ */
/*  ExecFunction helpers                                               */
/* ------------------------------------------------------------------ */

/** Real exec: passes all calls to real git/gh binaries. */
function makeRealExec(): ExecFunction {
  return (file, args, options) =>
    execFileRaw(file, args, options ?? {}) as Promise<{ stdout: string; stderr: string }>;
}

/**
 * Creates an exec that intercepts gh calls with the given mock handler,
 * while passing all git calls through to the real binary.
 */
function makeExecWithGhMock(
  ghHandler: (args: string[]) => Promise<{ stdout: string; stderr: string }>
): ExecFunction {
  const realExec = makeRealExec();
  return (file, args, options) => {
    if (file === 'gh') return ghHandler(args);
    return realExec(file, args, options);
  };
}

/* ------------------------------------------------------------------ */
/*  Git harness builders                                               */
/* ------------------------------------------------------------------ */

interface ForkHarness {
  /** Local clone of origin (simulates user's working directory) */
  cloneDir: string;
  /** Bare repo acting as origin remote */
  originBareDir: string;
  /** Bare repo acting as upstream remote */
  upstreamBareDir: string;
  /** Feature branch name created in cloneDir */
  featureBranch: string;
  runGit: (args: string[], cwd?: string) => Promise<{ stdout: string; stderr: string }>;
}

/**
 * Creates a fork-topology harness:
 *   upstream (bare) ← clone (origin's parent) ← origin (bare) ← cloneDir
 *
 * - upstreamBare: the "real" upstream repository
 * - originBare: the fork's origin (cloned from upstream for simplicity in tests)
 * - cloneDir: the user's local working clone with "origin" pointing at originBare
 *             and "upstream" NOT yet configured (caller must add it if needed)
 */
async function createForkHarness(): Promise<ForkHarness> {
  const realExec = makeRealExec();

  // Create upstream bare repo (with main as the default branch)
  const upstreamBareDir = mkdtempSync(join(tmpdir(), 'shep-upstream-bare-'));
  await realExec('git', ['init', '--bare', '-b', 'main'], { cwd: upstreamBareDir });

  // Create a temporary repo to seed upstream with an initial commit
  const seedDir = mkdtempSync(join(tmpdir(), 'shep-seed-'));
  await realExec('git', ['init', '-b', 'main'], { cwd: seedDir });
  await realExec('git', ['config', 'user.email', 'test@shep.test'], { cwd: seedDir });
  await realExec('git', ['config', 'user.name', 'Shep Test'], { cwd: seedDir });
  await realExec('git', ['remote', 'add', 'origin', upstreamBareDir], { cwd: seedDir });
  writeFileSync(join(seedDir, 'README.md'), '# Upstream Repo\n');
  await realExec('git', ['add', 'README.md'], { cwd: seedDir });
  await realExec('git', ['commit', '-m', 'Initial commit'], { cwd: seedDir });
  await realExec('git', ['push', '-u', 'origin', 'main'], { cwd: seedDir });
  // Clean up seed dir
  rmSync(seedDir, { recursive: true, force: true });

  // Create origin bare repo (simulates the fork's GitHub origin)
  // Use git clone --bare which inherits the HEAD from upstream (main)
  const originBareDir = mkdtempSync(join(tmpdir(), 'shep-origin-bare-'));
  await realExec('git', ['clone', '--bare', upstreamBareDir, originBareDir], {});
  // Ensure HEAD points to main (bare clones may not set this correctly)
  await realExec('git', ['symbolic-ref', 'HEAD', 'refs/heads/main'], { cwd: originBareDir });

  // Clone origin into a working directory
  const cloneDir = mkdtempSync(join(tmpdir(), 'shep-clone-'));
  await realExec('git', ['clone', originBareDir, cloneDir], {});
  await realExec('git', ['config', 'user.email', 'test@shep.test'], { cwd: cloneDir });
  await realExec('git', ['config', 'user.name', 'Shep Test'], { cwd: cloneDir });

  // Create a feature branch in cloneDir
  const featureBranch = `feat/test-${Date.now()}`;
  await realExec('git', ['checkout', '-b', featureBranch], { cwd: cloneDir });
  writeFileSync(join(cloneDir, 'feature.ts'), '// Feature file\nexport {};\n');
  await realExec('git', ['add', 'feature.ts'], { cwd: cloneDir });
  await realExec('git', ['commit', '-m', 'feat: add feature'], { cwd: cloneDir });
  // Go back to main
  await realExec('git', ['checkout', 'main'], { cwd: cloneDir });

  const runGit = (args: string[], cwd = cloneDir) => realExec('git', args, { cwd });

  return { cloneDir, originBareDir, upstreamBareDir, featureBranch, runGit };
}

/** Destroys all harness directories. */
function destroyDirs(dirs: string[]): void {
  for (const dir of dirs) {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ */
/*  isFork() tests                                                     */
/* ------------------------------------------------------------------ */

describe('GitPrService.isFork()', () => {
  let harness: ForkHarness;
  const dirsToCleanup: string[] = [];

  beforeEach(async () => {
    harness = await createForkHarness();
    dirsToCleanup.push(harness.cloneDir, harness.originBareDir, harness.upstreamBareDir);
  });

  afterEach(() => {
    destroyDirs(dirsToCleanup.splice(0));
  });

  it('returns { isFork: false } when gh exits non-zero', async () => {
    const exec = makeExecWithGhMock(async (_args) => {
      throw Object.assign(new Error('gh: not in a github repo'), {
        stderr: 'gh: not in a github repo',
        stdout: '',
      });
    });
    const service = new GitPrService(exec);
    const result = await service.isFork(harness.cloneDir);
    expect(result).toEqual({ isFork: false });
  });

  it('returns { isFork: false } when gh returns empty output (null parent)', async () => {
    const exec = makeExecWithGhMock(async (_args) => ({ stdout: '', stderr: '' }));
    const service = new GitPrService(exec);
    const result = await service.isFork(harness.cloneDir);
    expect(result).toEqual({ isFork: false });
  });

  it('returns { isFork: false } when gh returns literal "null"', async () => {
    const exec = makeExecWithGhMock(async (_args) => ({ stdout: 'null\n', stderr: '' }));
    const service = new GitPrService(exec);
    const result = await service.isFork(harness.cloneDir);
    expect(result).toEqual({ isFork: false });
  });

  it('returns { isFork: true, upstreamUrl } when parent URL is returned', async () => {
    const parentUrl = 'https://github.com/upstream-org/repo.git';
    const exec = makeExecWithGhMock(async (_args) => ({ stdout: `${parentUrl}\n`, stderr: '' }));
    const service = new GitPrService(exec);
    const result = await service.isFork(harness.cloneDir);
    expect(result).toEqual({ isFork: true, upstreamUrl: parentUrl });
  });

  it('calls gh with the correct arguments', async () => {
    let capturedArgs: string[] = [];
    const exec = makeExecWithGhMock(async (args) => {
      capturedArgs = args;
      return { stdout: '', stderr: '' };
    });
    const service = new GitPrService(exec);
    await service.isFork(harness.cloneDir);
    expect(capturedArgs).toEqual(['repo', 'view', '--json', 'parent', '--jq', '.parent.url']);
  });
});

/* ------------------------------------------------------------------ */
/*  ensureUpstreamRemote() tests                                       */
/* ------------------------------------------------------------------ */

describe('GitPrService.ensureUpstreamRemote()', () => {
  let harness: ForkHarness;
  const dirsToCleanup: string[] = [];

  beforeEach(async () => {
    harness = await createForkHarness();
    dirsToCleanup.push(harness.cloneDir, harness.originBareDir, harness.upstreamBareDir);
  });

  afterEach(() => {
    destroyDirs(dirsToCleanup.splice(0));
  });

  it('adds the upstream remote when it does not exist', async () => {
    const service = new GitPrService(makeRealExec());
    // Verify upstream does not exist yet
    const { stdout: before } = await harness.runGit(['remote']);
    expect(before).not.toContain('upstream');

    await service.ensureUpstreamRemote(harness.cloneDir, harness.upstreamBareDir);

    const { stdout: after } = await harness.runGit(['remote']);
    expect(after).toContain('upstream');

    const { stdout: url } = await harness.runGit(['remote', 'get-url', 'upstream']);
    expect(url.trim()).toBe(harness.upstreamBareDir);
  });

  it('is idempotent: does not throw when upstream remote already exists', async () => {
    const service = new GitPrService(makeRealExec());
    // Add it once
    await service.ensureUpstreamRemote(harness.cloneDir, harness.upstreamBareDir);
    // Call again — should not throw
    await expect(
      service.ensureUpstreamRemote(harness.cloneDir, harness.upstreamBareDir)
    ).resolves.toBeUndefined();

    // Remote still points to the original URL
    const { stdout: url } = await harness.runGit(['remote', 'get-url', 'upstream']);
    expect(url.trim()).toBe(harness.upstreamBareDir);
  });

  it('is a no-op when upstream remote already points to the same URL', async () => {
    // Pre-add the remote
    await harness.runGit(['remote', 'add', 'upstream', harness.upstreamBareDir]);
    const service = new GitPrService(makeRealExec());
    await expect(
      service.ensureUpstreamRemote(harness.cloneDir, harness.upstreamBareDir)
    ).resolves.toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  fetchUpstream() tests                                              */
/* ------------------------------------------------------------------ */

describe('GitPrService.fetchUpstream()', () => {
  let harness: ForkHarness;
  const dirsToCleanup: string[] = [];

  beforeEach(async () => {
    harness = await createForkHarness();
    dirsToCleanup.push(harness.cloneDir, harness.originBareDir, harness.upstreamBareDir);
  });

  afterEach(() => {
    destroyDirs(dirsToCleanup.splice(0));
  });

  it('fetches refs from upstream remote after it is added', async () => {
    const service = new GitPrService(makeRealExec());
    // Add upstream remote first
    await harness.runGit(['remote', 'add', 'upstream', harness.upstreamBareDir]);

    await expect(service.fetchUpstream(harness.cloneDir)).resolves.toBeUndefined();

    // After fetch, upstream/main tracking ref should exist
    const { stdout } = await harness.runGit(['branch', '-r']);
    expect(stdout).toContain('upstream/main');
  });

  it('throws GitPrError when upstream remote does not exist', async () => {
    const service = new GitPrService(makeRealExec());
    await expect(service.fetchUpstream(harness.cloneDir)).rejects.toMatchObject({
      name: 'GitPrError',
    });
  });
});

/* ------------------------------------------------------------------ */
/*  syncForkMain() tests                                               */
/* ------------------------------------------------------------------ */

describe('GitPrService.syncForkMain()', () => {
  let harness: ForkHarness;
  const dirsToCleanup: string[] = [];

  beforeEach(async () => {
    harness = await createForkHarness();
    dirsToCleanup.push(harness.cloneDir, harness.originBareDir, harness.upstreamBareDir);
  });

  afterEach(() => {
    destroyDirs(dirsToCleanup.splice(0));
  });

  async function addUpstreamAndAdvance(): Promise<string> {
    const realExec = makeRealExec();
    // Add upstream remote in clone
    await harness.runGit(['remote', 'add', 'upstream', harness.upstreamBareDir]);

    // Add a new commit directly to upstream bare (simulates upstream advancing)
    const tmpWork = mkdtempSync(join(tmpdir(), 'shep-upwork-'));
    dirsToCleanup.push(tmpWork);
    await realExec('git', ['clone', harness.upstreamBareDir, tmpWork], {});
    await realExec('git', ['config', 'user.email', 'test@shep.test'], { cwd: tmpWork });
    await realExec('git', ['config', 'user.name', 'Shep Test'], { cwd: tmpWork });
    writeFileSync(join(tmpWork, 'upstream-change.txt'), 'upstream new content\n');
    await realExec('git', ['add', 'upstream-change.txt'], { cwd: tmpWork });
    await realExec('git', ['commit', '-m', 'chore: upstream advance'], { cwd: tmpWork });
    await realExec('git', ['push', 'origin', 'main'], { cwd: tmpWork });

    // Get the SHA of upstream main
    const { stdout } = await realExec('git', ['rev-parse', 'main'], { cwd: tmpWork });
    return stdout.trim();
  }

  it('syncs local main to exactly match upstream/main SHA', async () => {
    const upstreamMainSha = await addUpstreamAndAdvance();

    // Verify local main is behind
    const { stdout: localBefore } = await harness.runGit(['rev-parse', 'main']);
    expect(localBefore.trim()).not.toBe(upstreamMainSha);

    const service = new GitPrService(makeRealExec());
    await service.syncForkMain(harness.cloneDir);

    // Local main should now match upstream/main
    const { stdout: localAfter } = await harness.runGit(['rev-parse', 'main']);
    expect(localAfter.trim()).toBe(upstreamMainSha);
  });

  it('restores the previous branch after sync', async () => {
    await addUpstreamAndAdvance();
    // Switch to feature branch before sync
    await harness.runGit(['checkout', harness.featureBranch]);

    const service = new GitPrService(makeRealExec());
    await service.syncForkMain(harness.cloneDir);

    // Should be back on the feature branch
    const { stdout } = await harness.runGit(['symbolic-ref', '--short', 'HEAD']);
    expect(stdout.trim()).toBe(harness.featureBranch);
  });

  it('is idempotent: running sync twice produces the same final state', async () => {
    const upstreamMainSha = await addUpstreamAndAdvance();
    const service = new GitPrService(makeRealExec());

    await service.syncForkMain(harness.cloneDir);
    await service.syncForkMain(harness.cloneDir);

    const { stdout } = await harness.runGit(['rev-parse', 'main']);
    expect(stdout.trim()).toBe(upstreamMainSha);
  });
});

/* ------------------------------------------------------------------ */
/*  rebase() tests                                                     */
/* ------------------------------------------------------------------ */

describe('GitPrService.rebase()', () => {
  let harness: ForkHarness;
  const dirsToCleanup: string[] = [];

  beforeEach(async () => {
    harness = await createForkHarness();
    dirsToCleanup.push(harness.cloneDir, harness.originBareDir, harness.upstreamBareDir);
  });

  afterEach(() => {
    destroyDirs(dirsToCleanup.splice(0));
  });

  async function advanceMain(filename: string, content: string): Promise<void> {
    const realExec = makeRealExec();
    // Add a commit to main in origin bare (via a temp clone)
    const tmpWork = mkdtempSync(join(tmpdir(), 'shep-mainwork-'));
    dirsToCleanup.push(tmpWork);
    await realExec('git', ['clone', harness.originBareDir, tmpWork], {});
    await realExec('git', ['config', 'user.email', 'test@shep.test'], { cwd: tmpWork });
    await realExec('git', ['config', 'user.name', 'Shep Test'], { cwd: tmpWork });
    writeFileSync(join(tmpWork, filename), content);
    await realExec('git', ['add', filename], { cwd: tmpWork });
    await realExec('git', ['commit', '-m', `chore: advance main with ${filename}`], {
      cwd: tmpWork,
    });
    await realExec('git', ['push', 'origin', 'main'], { cwd: tmpWork });
    // Pull into local clone's main
    await harness.runGit(['fetch', 'origin']);
    await harness.runGit(['checkout', 'main']);
    await harness.runGit(['reset', '--hard', 'origin/main']);
  }

  it('successfully rebases a clean feature branch onto main', async () => {
    // Advance main with a non-conflicting file
    await advanceMain('main-only.txt', 'main content\n');

    // The feature branch (created before main advanced) should be rebaseable
    await harness.runGit(['checkout', harness.featureBranch]);

    const service = new GitPrService(makeRealExec());
    await expect(
      service.rebase(harness.cloneDir, harness.featureBranch, 'main')
    ).resolves.toBeUndefined();

    // Feature branch should now be ahead of main
    const { stdout } = await harness.runGit(['log', '--oneline', 'main..HEAD']);
    expect(stdout.trim()).toBeTruthy();
  });

  it('throws GitPrError with REBASE_CONFLICT code when conflicts exist', async () => {
    // Modify the same file on both main and feature branch to force a conflict
    const conflictFile = 'shared.txt';

    // First, add the file on main
    await advanceMain(conflictFile, 'line one: original\nline two: original\n');

    // Create a new feature branch from main (which now has the file)
    const realExec = makeRealExec();
    await harness.runGit(['checkout', 'main']);
    const conflictBranch = `feat/conflict-${Date.now()}`;
    await harness.runGit(['checkout', '-b', conflictBranch]);
    // Feature branch modifies the file
    writeFileSync(
      join(harness.cloneDir, conflictFile),
      'line one: feature change\nline two: original\n'
    );
    await harness.runGit(['add', conflictFile]);
    await harness.runGit(['commit', '-m', 'feat: modify shared file on feature branch']);

    // Now advance main with a conflicting change to same line
    const tmpWork = mkdtempSync(join(tmpdir(), 'shep-conflictwork-'));
    dirsToCleanup.push(tmpWork);
    await realExec('git', ['clone', harness.originBareDir, tmpWork], {});
    await realExec('git', ['config', 'user.email', 'test@shep.test'], { cwd: tmpWork });
    await realExec('git', ['config', 'user.name', 'Shep Test'], { cwd: tmpWork });
    writeFileSync(join(tmpWork, conflictFile), 'line one: main change\nline two: original\n');
    await realExec('git', ['add', conflictFile], { cwd: tmpWork });
    await realExec('git', ['commit', '-m', 'chore: conflicting change on main'], { cwd: tmpWork });
    await realExec('git', ['push', 'origin', 'main'], { cwd: tmpWork });

    // Update local main
    await harness.runGit(['fetch', 'origin']);
    // Note: we stay on conflictBranch, but fetch brings origin/main up to date

    // Rebase should fail with REBASE_CONFLICT
    const service = new GitPrService(makeRealExec());
    const error = await service
      .rebase(harness.cloneDir, conflictBranch, 'origin/main')
      .catch((e) => e);

    expect(error).toMatchObject({
      name: 'GitPrError',
      code: GitPrErrorCode.REBASE_CONFLICT,
    });
    expect(error.message).toContain(conflictFile);
    expect(error.message).toContain('Resolve the conflicts manually');
  });

  it('leaves worktree in a clean state (no REBASE_HEAD) after conflict abort', async () => {
    // Use same conflict setup as above test
    const conflictFile = 'shared2.txt';
    await advanceMain(conflictFile, 'original content\n');

    await harness.runGit(['checkout', 'main']);
    const conflictBranch = `feat/conflict2-${Date.now()}`;
    await harness.runGit(['checkout', '-b', conflictBranch]);
    writeFileSync(join(harness.cloneDir, conflictFile), 'feature content\n');
    await harness.runGit(['add', conflictFile]);
    await harness.runGit(['commit', '-m', 'feat: feature content']);

    // Advance main with conflicting change
    const realExec = makeRealExec();
    const tmpWork = mkdtempSync(join(tmpdir(), 'shep-cleanwork-'));
    dirsToCleanup.push(tmpWork);
    await realExec('git', ['clone', harness.originBareDir, tmpWork], {});
    await realExec('git', ['config', 'user.email', 'test@shep.test'], { cwd: tmpWork });
    await realExec('git', ['config', 'user.name', 'Shep Test'], { cwd: tmpWork });
    writeFileSync(join(tmpWork, conflictFile), 'main content\n');
    await realExec('git', ['add', conflictFile], { cwd: tmpWork });
    await realExec('git', ['commit', '-m', 'chore: main content'], { cwd: tmpWork });
    await realExec('git', ['push', 'origin', 'main'], { cwd: tmpWork });

    await harness.runGit(['fetch', 'origin']);

    const service = new GitPrService(makeRealExec());
    // We expect an error; ignore it — we only care about the worktree state
    await service.rebase(harness.cloneDir, conflictBranch, 'origin/main').catch((_err) => {
      void _err;
    });

    // Worktree must be clean — no REBASE_HEAD file
    const { stdout } = await harness.runGit(['rev-parse', '--git-dir']);
    const gitDir = stdout.trim();
    const { stdout: headCheck } = await realExec(
      'bash',
      ['-c', `test -f "${gitDir}/REBASE_HEAD" && echo "dirty" || echo "clean"`],
      {}
    );
    expect(headCheck.trim()).toBe('clean');
  });

  it('successfully rebases with no conflicts on a non-fast-forward rebase', async () => {
    const realExec = makeRealExec();
    // Start fresh: feature branch created from initial main
    await harness.runGit(['checkout', 'main']);
    const featureBranch = `feat/diverge-${Date.now()}`;
    await harness.runGit(['checkout', '-b', featureBranch]);
    writeFileSync(join(harness.cloneDir, 'feat-file.txt'), 'feature\n');
    await harness.runGit(['add', 'feat-file.txt']);
    await harness.runGit(['commit', '-m', 'feat: add feat-file']);

    // Advance main with a different file
    const tmpWork = mkdtempSync(join(tmpdir(), 'shep-diverge-'));
    dirsToCleanup.push(tmpWork);
    await realExec('git', ['clone', harness.originBareDir, tmpWork], {});
    await realExec('git', ['config', 'user.email', 'test@shep.test'], { cwd: tmpWork });
    await realExec('git', ['config', 'user.name', 'Shep Test'], { cwd: tmpWork });
    writeFileSync(join(tmpWork, 'main-file.txt'), 'main\n');
    await realExec('git', ['add', 'main-file.txt'], { cwd: tmpWork });
    await realExec('git', ['commit', '-m', 'chore: add main-file'], { cwd: tmpWork });
    await realExec('git', ['push', 'origin', 'main'], { cwd: tmpWork });

    // Fetch so local clone knows about the new main
    await harness.runGit(['fetch', 'origin']);
    await harness.runGit(['checkout', featureBranch]);

    const service = new GitPrService(makeRealExec());
    await expect(
      service.rebase(harness.cloneDir, featureBranch, 'origin/main')
    ).resolves.toBeUndefined();

    // After rebase: feature branch should contain both main-file.txt and feat-file.txt
    const { stdout: files } = await harness.runGit(['ls-files']);
    expect(files).toContain('main-file.txt');
    expect(files).toContain('feat-file.txt');
  });
});
