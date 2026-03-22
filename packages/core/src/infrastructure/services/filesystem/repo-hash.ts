/**
 * Repository Hash Utility
 *
 * Computes a deterministic hash prefix from a repository path.
 * Used to create unique per-repo directories under ~/.shep/repos/<hash>/.
 *
 * Normalizes path separators before hashing so the same repository
 * produces the same hash on both Unix and Windows.
 */

import { createHash } from 'node:crypto';

/**
 * Compute a 16-character hex hash prefix for a repository path.
 *
 * @param repoPath - Absolute path to the repository root
 * @returns First 16 hex characters of the SHA-256 hash
 */
export function computeRepoHash(repoPath: string): string {
  // Normalize separators before hashing so C:\foo and C:/foo produce the same hash
  const normalizedRepoPath = repoPath.replace(/\\/g, '/');
  return createHash('sha256').update(normalizedRepoPath).digest('hex').slice(0, 16);
}
