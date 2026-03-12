/**
 * Cross-platform process tree termination.
 *
 * Re-exports the npm `tree-kill` package for use by the presentation layer,
 * which cannot resolve packages installed in packages/core/node_modules
 * directly (pnpm workspace isolation).
 *
 * Uses taskkill /T /F on Windows, kill/ps/pgrep on Unix.
 */

import treeKill from 'tree-kill';

export { treeKill };
