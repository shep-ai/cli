/**
 * Server Container Accessor
 *
 * Provides a `resolve()` helper for server components and API routes to
 * obtain DI-managed instances. The tsyringe container is placed on globalThis
 * by the CLI bootstrap (`shep ui`) or the dev-server (`pnpm dev:web`).
 */

import type { DependencyContainer, InjectionToken } from 'tsyringe';

const CONTAINER_KEY = '__shepContainer';

/**
 * Resolve a dependency from the DI container.
 *
 * Usage in server components / API routes:
 * ```ts
 * import { resolve } from '@/lib/server-container';
 * import { ListFeaturesUseCase } from '@shepai/core/application/use-cases/features/list-features.use-case';
 *
 * const features = await resolve(ListFeaturesUseCase).execute();
 * ```
 */
export function resolve<T>(token: InjectionToken<T>): T {
  const container = (globalThis as Record<string, unknown>)[CONTAINER_KEY] as
    | DependencyContainer
    | undefined;

  if (!container) {
    throw new Error(
      'DI container not available. Ensure the CLI bootstrap or dev-server has initialized it.'
    );
  }

  return container.resolve(token);
}
