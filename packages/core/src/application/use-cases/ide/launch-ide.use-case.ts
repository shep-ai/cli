/**
 * LaunchIdeUseCase
 *
 * Orchestrates IDE launching: computes the target directory path (worktree when
 * a branch is specified), optionally checks editor availability, and delegates
 * to IIdeLauncherService for the actual spawn.
 */

import { injectable, inject } from 'tsyringe';
import type {
  IIdeLauncherService,
  LaunchIdeInput,
  LaunchIdeResult,
} from '../../ports/output/services/ide-launcher-service.interface.js';
import { computeWorktreePath } from '../../../infrastructure/services/ide-launchers/compute-worktree-path.js';

@injectable()
export class LaunchIdeUseCase {
  constructor(
    @inject('IIdeLauncherService')
    private readonly ideLauncherService: IIdeLauncherService
  ) {}

  /**
   * Launch an IDE editor for the given repository/branch.
   *
   * @param input - Editor ID, repository path, optional branch and availability check flag
   * @returns Launch result indicating success or failure with error details
   */
  async execute(input: LaunchIdeInput): Promise<LaunchIdeResult> {
    const { editorId, repositoryPath, branch, checkAvailability } = input;

    const directoryPath = branch ? computeWorktreePath(repositoryPath, branch) : repositoryPath;

    if (checkAvailability) {
      const available = await this.ideLauncherService.checkAvailability(editorId);
      if (!available) {
        return {
          ok: false,
          code: 'editor_unavailable',
          message: `Editor '${editorId}' is not available on the system PATH`,
        };
      }
    }

    return this.ideLauncherService.launch(editorId, directoryPath);
  }
}
