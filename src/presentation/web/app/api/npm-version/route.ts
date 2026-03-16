import { NextResponse } from 'next/server';

const CACHE_TTL_MS = 5 * 60_000; // 5 minutes
let cachedVersion: { latest: string | null; fetchedAt: number } | null = null;

export async function GET(): Promise<NextResponse> {
  // Return cached value if fresh
  if (cachedVersion && Date.now() - cachedVersion.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({ latest: cachedVersion.latest });
  }

  const packageName = '@shepai/cli';
  try {
    const res = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `npm registry returned ${res.status}` }, { status: 502 });
    }
    const data = (await res.json()) as { version?: string };
    const latest = data.version ?? null;
    cachedVersion = { latest, fetchedAt: Date.now() };
    return NextResponse.json({ latest });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check npm version';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
