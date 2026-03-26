/**
 * Bulk turn-status API.
 *
 * GET /api/interactive/chat/turn-statuses?featureIds=id1,id2,...
 *
 * Returns a map of featureId → turnStatus ('idle' | 'processing' | 'unread')
 * for all requested features. Used by UI dot indicators on chat buttons.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { IInteractiveSessionService } from '@shepai/core/application/ports/output/services/interactive-session-service.interface';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const featureIdsParam = request.nextUrl.searchParams.get('featureIds');
    if (!featureIdsParam) {
      return NextResponse.json({});
    }

    const featureIds = featureIdsParam.split(',').filter(Boolean);
    if (featureIds.length === 0) {
      return NextResponse.json({});
    }

    const service = resolve<IInteractiveSessionService>('IInteractiveSessionService');
    const statuses = await service.getTurnStatuses(featureIds);

    // Convert Map to plain object for JSON serialization
    const result: Record<string, string> = {};
    for (const [id, status] of statuses) {
      result[id] = status;
    }

    return NextResponse.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[GET /api/interactive/chat/turn-statuses]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
