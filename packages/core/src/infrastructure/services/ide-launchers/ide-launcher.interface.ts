/**
 * Interface for IDE launcher implementations.
 *
 * Each supported IDE (VS Code, Cursor, Windsurf, Zed, Antigravity) provides
 * its own implementation of this interface. Launchers are responsible for
 * spawning a detached editor process and checking binary availability.
 */

import type { EditorType } from '../../../domain/generated/output';

export interface IdeLauncher {
  /** Display name shown to the user (e.g., "VS Code"). */
  readonly name: string;

  /** Editor identifier matching the EditorType enum value. */
  readonly editorId: EditorType;

  /** CLI binary used to launch the editor (e.g., "code"). */
  readonly binary: string;

  /**
   * Open the IDE at the given filesystem path.
   *
   * Spawns a detached process so the CLI does not block.
   *
   * @param path - Absolute path to the file or directory to open.
   */
  launch(path: string): Promise<void>;

  /**
   * Check whether the IDE binary is available on the system PATH.
   *
   * @returns `true` if the binary can be found and executed, `false` otherwise.
   */
  checkAvailable(): Promise<boolean>;
}
