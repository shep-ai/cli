import { NextResponse } from 'next/server';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const dynamic = 'force-dynamic';

/** Compute the Claude Code session file path from repository path and session ID */
function getSessionFilePath(repositoryPath: string, sessionId: string): string {
  const encoded = repositoryPath.replace(/[/\\.]/g, '-');
  return join(homedir(), '.claude', 'projects', encoded, `${sessionId}.jsonl`);
}

/**
 * GET /api/sessions?repositoryPath=<path>&limit=<n>
 *
 * Returns agent sessions filtered by repository path.
 * Used by the feature node sessions dropdown.
 *
 * Uses dynamic import to avoid tsyringe/reflect-metadata being pulled
 * into the Next.js production build at compile time.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const repositoryPath = url.searchParams.get('repositoryPath');
  const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);

  if (!repositoryPath?.trim()) {
    return NextResponse.json({ error: 'repositoryPath is required' }, { status: 400 });
  }

  try {
    const { ClaudeCodeSessionRepository } = await import(
      '@shepai/core/infrastructure/services/agents/sessions/claude-code-session.repository'
    );
    const sessionRepo = new ClaudeCodeSessionRepository();
    const sessions = await sessionRepo.list({
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
        filePath: getSessionFilePath(repositoryPath, s.id),
      })),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API] GET /api/sessions error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
