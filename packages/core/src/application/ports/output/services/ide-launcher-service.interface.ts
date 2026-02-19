/**
 * IDE Launcher Service Interface
 *
 * Output port for launching IDE editors in a target directory.
 * Implementations resolve editor commands from metadata and spawn detached processes.
 */

/**
 * Input for the LaunchIdeUseCase.
 */
export interface LaunchIdeInput {
  /** Which editor to launch (e.g., "vscode", "cursor"). */
  editorId: string;
  /** Absolute path to the repository root. */
  repositoryPath: string;
  /** Git branch name. When omitted, repositoryPath is used directly. */
  branch?: string;
  /** Whether to verify binary availability before launching. Default: false. */
  checkAvailability?: boolean;
}

/**
 * Successful IDE launch result.
 */
export interface LaunchIdeSuccess {
  ok: true;
  /** Display name of the editor that was launched. */
  editorName: string;
  /** Absolute path that was opened in the editor. */
  worktreePath: string;
}

/**
 * Failed IDE launch result.
 */
export interface LaunchIdeFailed {
  ok: false;
  /** Error classification for consumer error handling. */
  code: 'unknown_editor' | 'editor_unavailable' | 'launch_failed';
  /** Human-readable error description. */
  message: string;
}

/**
 * Discriminated union result for IDE launch operations.
 */
export type LaunchIdeResult = LaunchIdeSuccess | LaunchIdeFailed;

/**
 * Service interface for launching IDE editors.
 */
export interface IIdeLauncherService {
  /**
   * Launch an IDE editor in the specified directory.
   *
   * @param editorId - Editor identifier (e.g., "vscode", "cursor")
   * @param directoryPath - Absolute path to open in the editor
   * @returns Launch result indicating success or failure with error details
   */
  launch(editorId: string, directoryPath: string): Promise<LaunchIdeResult>;

  /**
   * Check whether an editor's binary is available on the system PATH.
   *
   * @param editorId - Editor identifier (e.g., "vscode", "cursor")
   * @returns True if the editor binary is found and executable
   */
  checkAvailability(editorId: string): Promise<boolean>;
}
