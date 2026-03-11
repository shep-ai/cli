import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  const packageName = '@shepai/cli';
  try {
    const res = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `npm registry returned ${res.status}` }, { status: 502 });
    }
    const data = (await res.json()) as { version?: string };
    return NextResponse.json({ latest: data.version ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check npm version';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
