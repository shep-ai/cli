import { execSync } from 'node:child_process';

export interface FolderDialogDeps {
  platform: NodeJS.Platform;
  exec: (cmd: string, opts?: { encoding: BufferEncoding; timeout?: number }) => string;
}

const defaultDeps: FolderDialogDeps = {
  platform: process.platform,
  exec: (cmd, opts) => execSync(cmd, opts) as unknown as string,
};

/**
 * Platform-specific commands that open a native OS folder picker dialog.
 * Each returns the chosen absolute folder path on stdout, or exits non-zero / returns empty on cancel.
 */
const PLATFORM_COMMANDS: Record<string, string> = {
  darwin: `osascript -e 'POSIX path of (choose folder with prompt "Select a repository folder")'`,
  linux: `zenity --file-selection --directory --title="Select a repository folder" 2>/dev/null`,
  win32: `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select a repository folder'; if ($f.ShowDialog() -eq 'OK') { $f.SelectedPath } else { exit 1 }"`,
};

export class FolderDialogService {
  private deps: FolderDialogDeps;

  constructor(deps: Partial<FolderDialogDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps };
  }

  /** Returns the OS-specific command string, or null if the platform is unsupported. */
  getCommand(): string | null {
    return PLATFORM_COMMANDS[this.deps.platform] ?? null;
  }

  /**
   * Opens a native folder picker dialog and returns the selected absolute path.
   * Returns `null` if the user cancels the dialog.
   * Throws if the platform is unsupported or the command fails unexpectedly.
   */
  pickFolder(): string | null {
    const command = this.getCommand();
    if (!command) {
      throw new Error(`Unsupported platform: ${this.deps.platform}`);
    }

    try {
      const result = this.deps.exec(command, { encoding: 'utf-8', timeout: 60_000 });
      const trimmed = result.trim();
      return trimmed.length > 0 ? trimmed : null;
    } catch (error: unknown) {
      // User cancelled the dialog — exit code 1 from osascript/zenity/powershell
      if (isExecError(error) && error.status === 1) {
        return null;
      }
      throw error;
    }
  }
}

function isExecError(error: unknown): error is { status: number } {
  return typeof error === 'object' && error !== null && 'status' in error;
}
