import { NextResponse } from 'next/server';
import { getGraphData } from '@/app/(dashboard)/get-graph-data';

/** Prevent Next.js from statically prerendering this route at build time. */
export const dynamic = 'force-dynamic';

/**
 * Returns fresh graph nodes and edges for the control-center canvas.
 *
 * Used by the client-side polling fallback instead of a server action
 * so that periodic syncs don't trigger the Next.js "Rendering…" indicator.
 */
export async function GET() {
  const data = await getGraphData();
  return NextResponse.json(data);
}
