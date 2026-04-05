/**
 * UpdateFeatureParentUseCase
 *
 * Re-parents an existing feature by setting or changing its parentId.
 * Supports both setting a new parent and removing an existing parent
 * (orphaning the feature back to the repository root).
 *
 * Business Rules:
 * - Cycle detection: walks the ancestor chain to prevent circular dependencies.
 * - Gate check: if the new parent is not in POST_IMPLEMENTATION, the child
 *   transitions to Blocked and its agent is stopped.
 * - If the child was Blocked with no parent (or a different parent) and the
 *   new parent is in POST_IMPLEMENTATION, the child is unblocked.
 * - Removing a parent (parentId = null) unblocks a Blocked child.
 * - A feature cannot be its own parent.
 * - Both features must belong to the same repository.
 */

import { injectable, inject } from 'tsyringe';
import { SdlcLifecycle } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import { POST_IMPLEMENTATION } from '../../../domain/lifecycle-gates.js';

export interface UpdateFeatureParentInput {
  /** The feature whose parent is being changed. */
  featureId: string;
  /** The new parent feature ID, or null to remove the parent. */
  parentId: string | null;
}

export interface UpdateFeatureParentResult {
  /** Whether the child was blocked as a result of this re-parenting. */
  blocked: boolean;
  /** Whether the child was unblocked as a result of this re-parenting. */
  unblocked: boolean;
}

@injectable()
export class UpdateFeatureParentUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepo: IFeatureRepository
  ) {}

  async execute(input: UpdateFeatureParentInput): Promise<UpdateFeatureParentResult> {
    const { featureId, parentId } = input;

    // Self-reference guard
    if (parentId === featureId) {
      throw new Error('A feature cannot be its own parent');
    }

    // Load the child feature
    const child = await this.featureRepo.findById(featureId);
    if (!child) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    // No change — early return
    if ((child.parentId ?? null) === parentId) {
      return { blocked: false, unblocked: false };
    }

    let blocked = false;
    let unblocked = false;

    if (parentId === null) {
      // Removing parent — unblock if currently Blocked
      child.parentId = undefined;
      if (child.lifecycle === SdlcLifecycle.Blocked) {
        child.lifecycle = SdlcLifecycle.Started;
        unblocked = true;
      }
    } else {
      // Setting or changing parent
      const parent = await this.featureRepo.findById(parentId);
      if (!parent) {
        throw new Error(`Parent feature not found: ${parentId}`);
      }

      // Same-repository check
      if (parent.repositoryPath !== child.repositoryPath) {
        throw new Error('Parent and child features must belong to the same repository');
      }

      // Cycle detection — walk the ancestor chain of the new parent
      const visited = new Set<string>([featureId]);
      let cursor: string | undefined = parentId;
      while (cursor) {
        if (visited.has(cursor)) {
          throw new Error(`Cycle detected in feature dependency chain at feature: ${cursor}`);
        }
        visited.add(cursor);
        const ancestor = await this.featureRepo.findById(cursor);
        cursor = ancestor?.parentId ?? undefined;
      }

      child.parentId = parentId;

      // Gate check: should the child be blocked or unblocked?
      if (
        parent.lifecycle === SdlcLifecycle.Blocked ||
        !POST_IMPLEMENTATION.has(parent.lifecycle)
      ) {
        // Parent not ready yet — block the child if it's in an early state
        if (
          child.lifecycle !== SdlcLifecycle.Blocked &&
          child.lifecycle !== SdlcLifecycle.Pending &&
          !POST_IMPLEMENTATION.has(child.lifecycle) &&
          child.lifecycle !== SdlcLifecycle.Maintain
        ) {
          child.lifecycle = SdlcLifecycle.Blocked;
          blocked = true;
        }
      } else {
        // Parent is ready — unblock if currently blocked
        if (child.lifecycle === SdlcLifecycle.Blocked) {
          child.lifecycle = SdlcLifecycle.Started;
          unblocked = true;
        }
      }
    }

    child.updatedAt = new Date();
    await this.featureRepo.update(child);

    return { blocked, unblocked };
  }
}
