import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import { AgentSessionRepositoryRegistry } from '@shepai/core/application/services/agents/agent-session-repository.registry';
import type { AgentType } from '@shepai/core/domain/generated/output';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sessions?repositoryPath=<path>&limit=<n>
 *
 * Returns agent sessions filtered by repository path.
 * Used by the feature node sessions dropdown.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const repositoryPath = url.searchParams.get('repositoryPath');
  const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);

  if (!repositoryPath?.trim()) {
    return NextResponse.json({ error: 'repositoryPath is required' }, { status: 400 });
  }

  try {
    const registry = resolve(AgentSessionRepositoryRegistry);
    const repo = registry.getRepository('claude-code' as AgentType);

    if (!repo.isSupported()) {
      return NextResponse.json({ sessions: [] });
    }

    const sessions = await repo.list({
      limit: Math.min(limit, 50),
      projectPath: repositoryPath,
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        preview: s.preview,
        messageCount: s.messageCount,
        firstMessageAt: s.firstMessageAt?.toISOString() ?? null,
        lastMessageAt: s.lastMessageAt?.toISOString() ?? null,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
        projectPath: s.projectPath,
      })),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API] GET /api/sessions error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
