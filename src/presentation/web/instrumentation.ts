/**
 * Next.js Instrumentation — intentionally empty.
 *
 * The DI container is initialized BEFORE Next.js starts:
 * - Production: CLI bootstrap (src/presentation/cli/index.ts) → `shep ui`
 * - Dev mode: dev-server.ts → `pnpm dev:web`
 * - E2E tests: Playwright webServer command uses dev-server.ts
 *
 * Turbopack cannot bundle tsyringe, reflect-metadata, or better-sqlite3,
 * so container initialization must happen outside the Next.js bundle.
 */
export function register() {
  // no-op: container already on globalThis.__shepContainer
}
