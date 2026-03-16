/**
 * Server Container Accessor
 *
 * Provides a `resolve()` helper for server components and API routes to
 * obtain DI-managed instances. The tsyringe container is placed on globalThis
 * by the CLI bootstrap (`shep ui`) or the dev-server (`pnpm dev:web`).
 */

const CONTAINER_KEY = '__shepContainer';

/** Minimal DI container interface (avoids importing tsyringe types). */
interface MinimalContainer {
  resolve<T>(token: string | symbol | (new (...args: unknown[]) => T)): T;
}

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
export function resolve<T>(token: string | symbol | (new (...args: unknown[]) => T)): T {
  const container = (globalThis as Record<string, unknown>)[CONTAINER_KEY] as
    | MinimalContainer
    | undefined;

  if (!container) {
    throw new Error(
      'DI container not available. Ensure the CLI bootstrap or dev-server has initialized it.'
    );
  }

  return container.resolve<T>(token);
}
