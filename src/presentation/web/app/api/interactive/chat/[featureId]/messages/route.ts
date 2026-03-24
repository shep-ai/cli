/**
 * Feature-scoped chat messages API.
 *
 * POST - Send a user message. Backend handles session lifecycle.
 * GET  - Get chat state: messages + session status + streaming text.
 *
 * The frontend never manages sessions — it just sends messages for a feature.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { IInteractiveSessionService } from '@shepai/core/application/ports/output/services/interactive-session-service.interface';
import { getShepHomeDir } from '@shepai/core/infrastructure/services/filesystem/shep-directory.service';

export const dynamic = 'force-dynamic';

const MAX_CONTENT_BYTES = 32 * 1024;

interface RouteParams {
  params: Promise<{ featureId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { featureId } = await params;
    const body = (await request.json()) as { content?: string; worktreePath?: string };
    const { content, worktreePath } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'content must be a non-empty string' }, { status: 400 });
    }

    if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_BYTES) {
      return NextResponse.json({ error: 'content exceeds maximum size of 32 KB' }, { status: 400 });
    }

    // worktreePath is optional — defaults to SHEP_HOME for global/repo sessions
    let resolvedWorktreePath = worktreePath;
    if (!resolvedWorktreePath || typeof resolvedWorktreePath !== 'string') {
      resolvedWorktreePath = getShepHomeDir();
    }

    const service = resolve<IInteractiveSessionService>('IInteractiveSessionService');
    const message = await service.sendUserMessage(featureId, content, resolvedWorktreePath);

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('concurrent session limit')) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    // eslint-disable-next-line no-console
    console.error('[POST /api/interactive/chat/:featureId/messages]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { featureId } = await params;
    const service = resolve<IInteractiveSessionService>('IInteractiveSessionService');
    await service.clearMessages(featureId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[DELETE /api/interactive/chat/:featureId/messages]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { featureId } = await params;
    const service = resolve<IInteractiveSessionService>('IInteractiveSessionService');
    const chatState = await service.getChatState(featureId);

    return NextResponse.json(chatState);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[GET /api/interactive/chat/:featureId/messages]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
