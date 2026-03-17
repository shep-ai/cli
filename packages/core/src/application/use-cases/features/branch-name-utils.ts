/**
 * Pure utility functions for deriving feature metadata from git branch names.
 *
 * Used by the AdoptBranchUseCase to generate a human-readable feature name
 * and a URL-safe slug from any git branch name.
 */

/**
 * Common branch name prefixes that are stripped when deriving a feature name.
 * These are conventional prefixes from gitflow, conventional commits, etc.
 */
const KNOWN_PREFIXES = [
  'feat/',
  'fix/',
  'chore/',
  'refactor/',
  'docs/',
  'test/',
  'ci/',
  'build/',
  'perf/',
  'style/',
  'revert/',
  'hotfix/',
  'release/',
];

/**
 * Derive a human-readable feature name from a git branch name.
 *
 * Strips known prefixes (feat/, fix/, etc.), replaces hyphens and underscores
 * with spaces, and title-cases each word.
 *
 * @example deriveName('fix/login-bug')        → "Login Bug"
 * @example deriveName('feat/user-auth')        → "User Auth"
 * @example deriveName('my-cool-feature')       → "My Cool Feature"
 * @example deriveName('feat/auth/login-bug')   → "Auth Login Bug"
 * @example deriveName('release/v1.0.0')        → "V1.0.0"
 */
export function deriveName(branch: string): string {
  let remaining = branch;

  // Strip known prefix (only the first matching one)
  for (const prefix of KNOWN_PREFIXES) {
    if (remaining.startsWith(prefix)) {
      remaining = remaining.slice(prefix.length);
      break;
    }
  }

  // Replace slashes, hyphens, and underscores with spaces
  const words = remaining
    .replace(/[/_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) {
    return branch;
  }

  // Title-case each word
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Derive a URL-safe slug from a git branch name.
 *
 * Lowercases the full branch name, converts slashes and special characters
 * to hyphens, collapses consecutive hyphens, and trims leading/trailing hyphens.
 *
 * @example deriveSlug('fix/login-bug')        → "fix-login-bug"
 * @example deriveSlug('feat/user-auth')        → "feat-user-auth"
 * @example deriveSlug('my-cool-feature')       → "my-cool-feature"
 * @example deriveSlug('release/v1.0.0')        → "release-v1-0-0"
 * @example deriveSlug('feat/auth/login-bug')   → "feat-auth-login-bug"
 */
export function deriveSlug(branch: string): string {
  return branch
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric chars (except hyphens) with hyphens
    .replace(/-+/g, '-') // Collapse consecutive hyphens
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
}
