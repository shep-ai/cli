/**
 * Shared IDE launch logic used by both CLI and Web presentation layers.
 *
 * Returns a discriminated union so callers can map errors to their own format
 * (CLI messages vs HTTP status codes).
 */

import type { EditorType } from '../../../domain/generated/output';
import { createLauncherRegistry } from './ide-launcher.registry';
import { computeWorktreePath } from './compute-worktree-path';

export interface LaunchIdeInput {
  /** Which editor to launch. */
  editorId: EditorType;
  /** Absolute path to the repository root. */
  repositoryPath: string;
  /** Git branch name. When omitted, repositoryPath is used directly. */
  branch?: string;
  /** Whether to verify binary availability before launching. Default: false. */
  checkAvailability?: boolean;
}

export interface LaunchIdeSuccess {
  ok: true;
  editorName: string;
  worktreePath: string;
}

export interface LaunchIdeFailed {
  ok: false;
  code: 'unknown_editor' | 'editor_unavailable' | 'launch_failed';
  message: string;
}

export type LaunchIdeResult = LaunchIdeSuccess | LaunchIdeFailed;

export async function launchIde(input: LaunchIdeInput): Promise<LaunchIdeResult> {
  const registry = createLauncherRegistry();
  const launcher = registry.get(input.editorId);

  if (!launcher) {
    return {
      ok: false,
      code: 'unknown_editor',
      message: `No launcher found for editor: ${input.editorId}. Supported: ${[...registry.keys()].join(', ')}`,
    };
  }

  if (input.checkAvailability) {
    const available = await launcher.checkAvailable();
    if (!available) {
      return {
        ok: false,
        code: 'editor_unavailable',
        message: `${launcher.name} is not available — ensure "${launcher.binary}" is installed and on your PATH`,
      };
    }
  }

  try {
    const worktreePath = input.branch
      ? computeWorktreePath(input.repositoryPath, input.branch)
      : input.repositoryPath;
    await launcher.launch(worktreePath);
    return { ok: true, editorName: launcher.name, worktreePath };
  } catch (error) {
    return {
      ok: false,
      code: 'launch_failed',
      message: error instanceof Error ? error.message : 'Failed to launch IDE',
    };
  }
}
