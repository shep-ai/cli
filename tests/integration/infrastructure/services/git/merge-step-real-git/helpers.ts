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

  // Check squash merge: no diff means all changes are incorporated
  let squashMerged = false;
  try {
    await runGit(['diff', '--quiet', featureBranch, baseBranch]);
    squashMerged = true;
  } catch {
    squashMerged = false;
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
