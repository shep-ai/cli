import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { ListRepositoriesUseCase } from '@shepai/core/application/use-cases/repositories/list-repositories.use-case';
import type { ListFeaturesUseCase } from '@shepai/core/application/use-cases/features/list-features.use-case';
import { scanSessionsForPath, type SessionResult } from '@/lib/session-scanner';

export const dynamic = 'force-dynamic';

type SessionSummaryFromBatch = Omit<SessionResult, '_mtime'>;

const SESSIONS_PER_PATH = 5;

// ── Server-side cache ─────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000;
let cache: { data: Record<string, SessionSummaryFromBatch[]>; createdAt: number } | null = null;

// ── Route handler ─────────────────────────────────────────────────────

/**
 * GET /api/sessions-batch
 *
 * No parameters needed — resolves all repos and features from the DI container,
 * scans sessions for each, and returns { sessionsByPath: Record<string, SessionSummary[]> }.
 */
export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.createdAt < CACHE_TTL_MS) {
    return NextResponse.json({ sessionsByPath: cache.data });
  }

  try {
    const listRepos = resolve<ListRepositoriesUseCase>('ListRepositoriesUseCase');
    const listFeatures = resolve<ListFeaturesUseCase>('ListFeaturesUseCase');

    const [repositories, features] = await Promise.all([
      listRepos.execute(),
      listFeatures.execute({ includeArchived: false }),
    ]);

    // Build unique path specs: repos with includeWorktrees, features with their worktree path
    const pathSpecs: { path: string; includeWorktrees: boolean }[] = [];
    const seen = new Set<string>();

    for (const repo of repositories) {
      if (repo.path && !seen.has(repo.path)) {
        seen.add(repo.path);
        pathSpecs.push({ path: repo.path, includeWorktrees: true });
      }
    }

    for (const feature of features) {
      const sessionPath = feature.worktreePath ?? feature.repositoryPath;
      if (sessionPath && !seen.has(sessionPath)) {
        seen.add(sessionPath);
        pathSpecs.push({ path: sessionPath, includeWorktrees: false });
      }
    }

    // Scan all paths in parallel
    const results = await Promise.all(
      pathSpecs.map(async ({ path, includeWorktrees }) => {
        const sessions = await scanSessionsForPath(path, SESSIONS_PER_PATH, includeWorktrees);
        return { path, sessions: sessions.map(({ _mtime, ...s }) => s) };
      })
    );

    const sessionsByPath: Record<string, SessionSummaryFromBatch[]> = {};
    for (const { path, sessions } of results) {
      sessionsByPath[path] = sessions;
    }

    cache = { data: sessionsByPath, createdAt: Date.now() };
    return NextResponse.json({ sessionsByPath });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API] GET /api/sessions-batch error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
