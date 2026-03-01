/**
 * Detect Dev Script
 *
 * Pure utility that reads package.json from a directory, scans for common dev
 * scripts (dev, start, serve), and detects the package manager from lockfile
 * presence. Returns the detected command or an error.
 */
/* eslint-disable no-console */

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

const LOG_PREFIX = '[detectDevScript]';

/**
 * Detect the dev script and package manager for a project directory.
 *
 * @param dirPath - Absolute path to the project directory
 * @returns Detection result with command info, or an error
 */
export function detectDevScript(dirPath: string): DetectDevScriptResult {
  console.info(`${LOG_PREFIX} scanning dirPath="${dirPath}"`);

  // Read and parse package.json
  let packageJson: { scripts?: Record<string, string> };
  try {
    const raw = readFileSync(join(dirPath, 'package.json'), 'utf-8');
    packageJson = JSON.parse(raw);
  } catch (err) {
    const msg = `No package.json found in ${dirPath}`;
    console.error(`${LOG_PREFIX} ${msg}`, err);
    return { success: false, error: msg };
  }

  // Find the first matching script in priority order
  const scripts = packageJson.scripts ?? {};
  const availableScripts = Object.keys(scripts);
  console.info(
    `${LOG_PREFIX} available scripts: [${availableScripts.join(', ')}], looking for: [${SCRIPT_PRIORITY.join(', ')}]`
  );

  const scriptName = SCRIPT_PRIORITY.find((name) => name in scripts);
  if (!scriptName) {
    const msg = `No dev script found in package.json. Expected one of: ${SCRIPT_PRIORITY.join(', ')}`;
    console.warn(`${LOG_PREFIX} ${msg}`);
    return { success: false, error: msg };
  }

  // Detect package manager from lockfile
  const packageManager = detectPackageManager(dirPath);

  // Build the command — pnpm/yarn use `<pm> <script>`, npm uses `npm run <script>`
  const command =
    packageManager === 'npm' ? `npm run ${scriptName}` : `${packageManager} ${scriptName}`;

  console.info(
    `${LOG_PREFIX} detected — packageManager="${packageManager}", scriptName="${scriptName}", command="${command}"`
  );
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
