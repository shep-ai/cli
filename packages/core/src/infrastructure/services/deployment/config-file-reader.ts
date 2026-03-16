/**
 * Config File Reader
 *
 * Pre-reads a fixed list of known config files from a repository path
 * and produces a shallow directory listing for inclusion in agent prompts.
 * Files are truncated to a maximum character limit to keep prompt sizes manageable.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Maximum characters to read from each config file. */
const MAX_FILE_CHARS = 2000;

/** Truncation notice appended when a file exceeds the character limit. */
const TRUNCATION_NOTICE = '\n... [truncated]';

/** Known config files to pre-read from any repository. */
export const CONFIG_FILES = [
  'package.json',
  'tsconfig.json',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'Makefile',
  'pyproject.toml',
  'requirements.txt',
  'setup.py',
  'setup.cfg',
  'Cargo.toml',
  'go.mod',
  'go.sum',
  'Gemfile',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'CMakeLists.txt',
  '.env.example',
  'Procfile',
  'Pipfile',
] as const;

/** Directories to exclude from the shallow directory listing. */
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.venv',
  'venv',
  '.tox',
  'target',
  '.cache',
]);

/** A config file that was successfully read from the repository. */
export interface ConfigFileEntry {
  filename: string;
  content: string;
}

/** Result of reading config files and directory listing from a repository. */
export interface RepoContext {
  files: ConfigFileEntry[];
  directoryListing: string[];
}

/**
 * Read all known config files from a repository path.
 * Files that do not exist or cannot be read are silently skipped.
 * Files larger than MAX_FILE_CHARS are truncated with a notice.
 */
export async function readConfigFiles(repoPath: string): Promise<ConfigFileEntry[]> {
  const results: ConfigFileEntry[] = [];

  const reads = CONFIG_FILES.map(async (filename) => {
    try {
      let content = await readFile(join(repoPath, filename), 'utf-8');
      if (content.length > MAX_FILE_CHARS) {
        content = content.slice(0, MAX_FILE_CHARS) + TRUNCATION_NOTICE;
      }
      return { filename, content };
    } catch {
      return null;
    }
  });

  const settled = await Promise.all(reads);
  for (const entry of settled) {
    if (entry) {
      results.push(entry);
    }
  }

  return results;
}

/**
 * Get a shallow directory listing (depth 1) of a repository path.
 * Excludes common artifact/dependency directories.
 * Returns an empty array for non-existent or empty directories.
 */
export async function getDirectoryListing(repoPath: string): Promise<string[]> {
  try {
    const entries = await readdir(repoPath, { withFileTypes: true });
    return entries
      .filter((e) => !EXCLUDED_DIRS.has(e.name))
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Read the full repository context: config files + directory listing.
 * Convenience function combining readConfigFiles and getDirectoryListing.
 */
export async function readRepoContext(repoPath: string): Promise<RepoContext> {
  const [files, directoryListing] = await Promise.all([
    readConfigFiles(repoPath),
    getDirectoryListing(repoPath),
  ]);
  return { files, directoryListing };
}
