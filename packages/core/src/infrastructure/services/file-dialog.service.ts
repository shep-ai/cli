import { execSync } from 'node:child_process';
import { statSync } from 'node:fs';

export interface FileAttachment {
  path: string;
  name: string;
  size: number;
}

export interface FileDialogDeps {
  platform: NodeJS.Platform;
  exec: (cmd: string, opts?: { encoding: BufferEncoding; timeout?: number }) => string;
  stat: (filePath: string) => { size: number };
}

const defaultDeps: FileDialogDeps = {
  platform: process.platform,
  exec: (cmd, opts) => execSync(cmd, opts) as unknown as string,
  stat: (filePath) => statSync(filePath),
};

/**
 * Platform-specific commands that open a native OS file picker dialog.
 * Each returns newline-separated absolute file paths on stdout, or exits non-zero on cancel.
 */
const PLATFORM_COMMANDS: Record<string, string> = {
  darwin: `osascript -e 'set f to (choose file with prompt "Select files" with multiple selections allowed)' -e 'set paths to {}' -e 'repeat with i in f' -e 'copy POSIX path of i to end of paths' -e 'end repeat' -e 'set text item delimiters to "\n"' -e 'paths as text'`,
  linux: `zenity --file-selection --multiple --separator="\\n" --title="Select files" 2>/dev/null`,
  win32: `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Multiselect = $true; $d.Title = 'Select files'; if ($d.ShowDialog() -eq 'OK') { $d.FileNames -join [char]10 } else { exit 1 }"`,
};

export class FileDialogService {
  private deps: FileDialogDeps;

  constructor(deps: Partial<FileDialogDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps };
  }

  /** Returns the OS-specific command string, or null if the platform is unsupported. */
  getCommand(): string | null {
    return PLATFORM_COMMANDS[this.deps.platform] ?? null;
  }

  /**
   * Opens a native file picker dialog and returns metadata for each selected file.
   * Returns `null` if the user cancels the dialog.
   * Throws if the platform is unsupported or the command fails unexpectedly.
   */
  pickFiles(): FileAttachment[] | null {
    const command = this.getCommand();
    if (!command) {
      throw new Error(`Unsupported platform: ${this.deps.platform}`);
    }

    try {
      const result = this.deps.exec(command, { encoding: 'utf-8', timeout: 60_000 });
      const paths = result
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (paths.length === 0) return null;

      return paths.map((filePath) => {
        const stats = this.deps.stat(filePath);
        return {
          path: filePath,
          name: filePath.split(/[/\\]/).pop()!,
          size: stats.size,
        };
      });
    } catch (error: unknown) {
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
