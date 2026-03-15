import { expect } from 'vitest';

/**
 * Asserts that featureBranch has been merged into baseBranch using real git.
 * Supports both true merges (--is-ancestor) and squash merges (no diff).
 * Fails the test with a descriptive message if the merge did not land.
 */
export async function assertMergeLanded(
  runGit: (args: string[]) => Promise<{ stdout: string; stderr: string }>,
  featureBranch: string,
  baseBranch: string
): Promise<void> {
  // Check true merge first
  try {
    await runGit(['merge-base', '--is-ancestor', featureBranch, baseBranch]);
    return; // true merge confirmed
  } catch {
    // Not a true merge — check squash merge
  }

  // Check squash merge: no diff means all changes are incorporated.
  // If the feature branch was deleted (e.g., by localMergeSquash), try the
  // remote tracking ref or fall back to checking the git log for the squash
  // merge commit message pattern.
  let squashMerged = false;
  try {
    await runGit(['diff', '--quiet', featureBranch, baseBranch]);
    squashMerged = true;
  } catch {
    // Branch ref may have been deleted — try origin/ tracking ref
    try {
      await runGit(['diff', '--quiet', `origin/${featureBranch}`, baseBranch]);
      squashMerged = true;
    } catch {
      // Neither local nor remote ref available — check if the squash merge
      // commit exists on the base branch via log grep
      try {
        const { stdout } = await runGit([
          'log',
          baseBranch,
          '--oneline',
          '--grep',
          'squash merge',
          '-n',
          '1',
        ]);
        squashMerged = stdout.trim().length > 0;
      } catch {
        squashMerged = false;
      }
    }
  }

  expect(
    squashMerged,
    `Expected ${featureBranch} to be merged into ${baseBranch} (true merge or squash), but changes are still missing`
  ).toBe(true);
}

/**
 * Asserts that featureBranch has NOT been merged into baseBranch.
 * Used to verify that the unverified-PR-merge bug is present (merge skipped verifyMerge).
 */
export async function assertMergeNotLanded(
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
