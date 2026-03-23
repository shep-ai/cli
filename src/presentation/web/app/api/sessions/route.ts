import { NextResponse } from 'next/server';
import { scanSessionsForPath } from '@/lib/session-scanner';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sessions?repositoryPath=<path>&limit=<n>
 *
 * Returns agent sessions from all supported providers (Claude Code, Cursor)
 * filtered by repository path, merged and sorted by recency.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const repositoryPath = url.searchParams.get('repositoryPath');
  const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
  const includeWorktrees = url.searchParams.get('includeWorktrees') === 'true';

  if (!repositoryPath?.trim()) {
    return NextResponse.json({ error: 'repositoryPath is required' }, { status: 400 });
  }

  try {
    const allSessions = await scanSessionsForPath(repositoryPath, limit, includeWorktrees);

    return NextResponse.json({
      sessions: allSessions.map(({ _mtime, ...s }) => s),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API] GET /api/sessions error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
