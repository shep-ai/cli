import { expect } from 'vitest';

/**
 * Asserts that featureBranch has been merged into baseBranch using real git.
 * Fails the test with a descriptive message if the merge did not land.
 */
export async function assertMergeLanded(
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
