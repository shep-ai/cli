/**
 * Lifecycle gate constants for feature dependency blocking logic.
 *
 * Centralises the POST_IMPLEMENTATION membership check used by both
 * CreateFeatureUseCase (gate evaluation at creation time) and
 * CheckAndUnblockFeaturesUseCase (gate evaluation at unblock time).
 */

import { SdlcLifecycle } from './generated/output';

/**
 * Lifecycle values at or beyond the Implementation gate.
 *
 * A parent whose lifecycle is a member of this set satisfies Gate 1:
 * directly-blocked children may transition from Blocked to Started.
 */
export const POST_IMPLEMENTATION = new Set<SdlcLifecycle>([
  SdlcLifecycle.Implementation,
  SdlcLifecycle.Review,
  SdlcLifecycle.Maintain,
]);
