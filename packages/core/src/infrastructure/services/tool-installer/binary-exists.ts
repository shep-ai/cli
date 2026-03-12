/**
 * Cross-platform binary existence check.
 *
 * Wraps the npm `which` package to provide a single cross-platform API
 * for checking if a binary exists in the system PATH. Works on Unix
 * (which) and Windows (where.exe + PATHEXT resolution) without platform
 * branching.
 */

import which from 'which';

/**
 * Check if a binary exists in the system PATH.
 *
 * Uses the npm `which` package which handles Windows PATHEXT resolution
 * internally (.exe, .cmd, .bat extensions).
 *
 * Returns:
 * - `{ found: true }` when the binary is on PATH
 * - `{ found: false, notInPath: true }` when the binary is not on PATH
 * - `{ found: false, error }` for genuine errors (e.g. permission denied)
 */
export const checkBinaryExists = async (
  binary: string
): Promise<{ found: boolean; notInPath?: boolean; error?: Error }> => {
  try {
    const result = await which(binary, { nothrow: true });
    if (result !== null) {
      return { found: true };
    }
    return { found: false, notInPath: true };
  } catch (error) {
    return { found: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
};
