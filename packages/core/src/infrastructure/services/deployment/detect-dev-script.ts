/**
 * Detect Dev Script
 *
 * Pure utility that reads package.json from a directory, scans for common dev
 * scripts (dev, start, serve), and detects the package manager from lockfile
 * presence. Returns the detected command or an error.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** Script names to search for, in priority order */
const SCRIPT_PRIORITY = ['dev', 'start', 'serve'] as const;

/** Lockfile-to-package-manager mapping, checked in order */
const LOCKFILE_MANAGERS = [
  { lockfile: 'pnpm-lock.yaml', manager: 'pnpm' },
  { lockfile: 'yarn.lock', manager: 'yarn' },
  { lockfile: 'package-lock.json', manager: 'npm' },
] as const;

export interface DetectDevScriptSuccess {
  success: true;
  packageManager: string;
  scriptName: string;
  command: string;
}

export interface DetectDevScriptError {
  success: false;
  error: string;
}

export type DetectDevScriptResult = DetectDevScriptSuccess | DetectDevScriptError;

/**
 * Detect the dev script and package manager for a project directory.
 *
 * @param dirPath - Absolute path to the project directory
 * @returns Detection result with command info, or an error
 */
export function detectDevScript(dirPath: string): DetectDevScriptResult {
  // Read and parse package.json
  let packageJson: { scripts?: Record<string, string> };
  try {
    const raw = readFileSync(join(dirPath, 'package.json'), 'utf-8');
    packageJson = JSON.parse(raw);
  } catch {
    return { success: false, error: `No package.json found in ${dirPath}` };
  }

  // Find the first matching script in priority order
  const scripts = packageJson.scripts ?? {};
  const scriptName = SCRIPT_PRIORITY.find((name) => name in scripts);
  if (!scriptName) {
    return {
      success: false,
      error: `No dev script found in package.json. Expected one of: ${SCRIPT_PRIORITY.join(', ')}`,
    };
  }

  // Detect package manager from lockfile
  const packageManager = detectPackageManager(dirPath);

  // Build the command — pnpm/yarn use `<pm> <script>`, npm uses `npm run <script>`
  const command =
    packageManager === 'npm' ? `npm run ${scriptName}` : `${packageManager} ${scriptName}`;

  return { success: true, packageManager, scriptName, command };
}

/**
 * Detect the package manager by checking for lockfile presence.
 */
function detectPackageManager(dirPath: string): string {
  for (const { lockfile, manager } of LOCKFILE_MANAGERS) {
    if (existsSync(join(dirPath, lockfile))) {
      return manager;
    }
  }
  return 'npm';
}
