/**
 * JSON-Driven IDE Launcher Service
 *
 * Replaces the 5 hard-coded IDE launcher classes with a single service that
 * derives editor commands from the JSON tool metadata files. Reads from the
 * already-loaded TOOL_METADATA record, filters by category "ide" and presence
 * of openDirectory, and performs {dir} placeholder substitution at launch time.
 */

import { injectable } from 'tsyringe';
import { spawn, execFile } from 'node:child_process';
import { platform } from 'node:os';
import type {
  IIdeLauncherService,
  LaunchIdeResult,
} from '../../../application/ports/output/services/ide-launcher-service.interface.js';
import { TOOL_METADATA } from '../tool-installer/tool-metadata.js';

interface IdeEntry {
  name: string;
  binary: string | Record<string, string>;
  openDirectory: string | Record<string, string>;
  terminalCommand?: string | Record<string, string>;
  spawnOptions?: {
    shell?: boolean;
    stdio?: 'ignore' | 'inherit' | 'pipe';
    detached?: boolean;
  };
}

/**
 * Resolve a platform-specific value from a string or per-platform record.
 * When the value is a plain string, returns it directly.
 * When the value is a record, returns the entry for the current os.platform(),
 * falling back to the first value if the current platform is not present.
 */
export function resolvePlatformValue(value: string | Record<string, string>): string {
  if (typeof value === 'string') return value;
  return value[platform()] ?? Object.values(value)[0];
}

@injectable()
export class JsonDrivenIdeLauncherService implements IIdeLauncherService {
  private readonly editors: Map<string, IdeEntry>;

  constructor() {
    this.editors = new Map();
    for (const [id, meta] of Object.entries(TOOL_METADATA)) {
      if (meta.openDirectory != null) {
        this.editors.set(id, {
          name: meta.name,
          binary: meta.binary,
          openDirectory: meta.openDirectory,
          terminalCommand: meta.terminalCommand,
          spawnOptions: meta.spawnOptions,
        });
      }
    }
  }

  async launch(
    editorId: string,
    directoryPath: string,
    options?: { headless?: boolean }
  ): Promise<LaunchIdeResult> {
    const entry = this.editors.get(editorId);
    if (!entry) {
      const available = [...this.editors.keys()].join(', ');
      return {
        ok: false,
        code: 'unknown_editor',
        message: `No launcher found for editor: ${editorId}. Available: ${available}`,
      };
    }

    // In headless mode (web UI), use terminalCommand to open CLI agents
    // in a new terminal window instead of inheriting the server's stdio.
    const useTerminal = options?.headless === true && entry.terminalCommand != null;
    const cmdSource = useTerminal ? entry.terminalCommand! : entry.openDirectory;
    const openCmd = resolvePlatformValue(cmdSource);

    if (!openCmd.includes('{dir}')) {
      return {
        ok: false,
        code: 'launch_failed',
        message: `openDirectory for "${editorId}" is missing {dir} placeholder: "${openCmd}"`,
      };
    }

    const resolved = openCmd.replace('{dir}', directoryPath);

    // Terminal commands always use shell mode and detach
    const useShell = useTerminal || entry.spawnOptions?.shell === true;
    const opts = {
      detached: useTerminal ? true : (entry.spawnOptions?.detached ?? !useShell),
      stdio: (useTerminal ? 'ignore' : (entry.spawnOptions?.stdio ?? 'ignore')) as
        | 'ignore'
        | 'inherit'
        | 'pipe',
      shell: useShell,
    };

    try {
      let child;
      if (useShell) {
        child = spawn(resolved, [], opts);
      } else {
        const [command, ...args] = resolved.split(/\s+/);
        child = spawn(command, args, opts);
      }
      if (opts.detached) child.unref();

      return {
        ok: true,
        editorName: entry.name,
        worktreePath: directoryPath,
      };
    } catch (error) {
      return {
        ok: false,
        code: 'launch_failed',
        message: error instanceof Error ? error.message : 'Failed to launch IDE',
      };
    }
  }

  checkAvailability(editorId: string): Promise<boolean> {
    const entry = this.editors.get(editorId);
    if (!entry) return Promise.resolve(false);

    const binary = resolvePlatformValue(entry.binary);
    return new Promise((resolve) => {
      execFile('which', [binary], (err) => {
        resolve(!err);
      });
    });
  }
}
