import { NextResponse } from 'next/server';
import { deleteFeature } from '@shepai/core/infrastructure/di/use-cases-bridge';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const feature = await deleteFeature(id);
    return NextResponse.json({ feature });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete feature';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
