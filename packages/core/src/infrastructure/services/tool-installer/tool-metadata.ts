/**
 * Tool Installation Metadata
 *
 * Dynamically loads tool definitions from individual JSON files in the tools/ directory.
 * Each JSON file defines installation commands and metadata for a single development tool.
 *
 * To add a new tool, create a JSON file in tools/ matching the ToolMetadata schema:
 *   tools/<tool-name>.json
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ToolMetadata {
  /** Human-readable display name */
  name: string;

  /** Short one-line summary */
  summary: string;

  /** Detailed description */
  description: string;

  /** Tool category for grouping in listings */
  category: 'ide' | 'cli-agent';

  /** Binary name to check with 'which' command (string or per-platform map) */
  binary: string | Record<string, string>;

  /** Package manager or installation method */
  packageManager: string;

  /** Platform-specific installation commands as shell strings (keyed by os.platform()) */
  commands: Record<string, string>;

  /** Installation timeout in milliseconds */
  timeout: number;

  /** Official documentation URL */
  documentationUrl: string;

  /** Command to verify installation (e.g., "code --version") */
  verifyCommand: string;

  /** Whether the tool supports automated installation (default: true) */
  autoInstall?: boolean;

  /** Command to open a directory in this tool.
   * String format: "code {dir}" — single command for all platforms.
   * Object format: { "linux": "antigravity {dir}", "darwin": "agy {dir}" } — per-platform commands. */
  openDirectory?: string | Record<string, string>;
}

const REQUIRED_FIELDS: (keyof ToolMetadata)[] = [
  'name',
  'summary',
  'description',
  'category',
  'binary',
  'packageManager',
  'commands',
  'timeout',
  'documentationUrl',
  'verifyCommand',
];

function loadToolMetadata(): Record<string, ToolMetadata> {
  const toolsDir = join(fileURLToPath(import.meta.url), '..', 'tools');
  const metadata: Record<string, ToolMetadata> = {};

  let files: string[];
  try {
    files = readdirSync(toolsDir).filter((f) => f.endsWith('.json'));
  } catch {
    return metadata;
  }

  for (const file of files) {
    const toolName = basename(file, '.json');
    try {
      const raw = readFileSync(join(toolsDir, file), 'utf-8');
      const parsed = JSON.parse(raw) as ToolMetadata;

      const missing = REQUIRED_FIELDS.filter((field) => !(field in parsed));
      if (missing.length > 0) {
        continue;
      }

      metadata[toolName] = parsed;
    } catch {
      // Skip malformed JSON files
    }
  }

  return metadata;
}

export const TOOL_METADATA: Record<string, ToolMetadata> = loadToolMetadata();
