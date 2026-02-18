import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { DeleteFeatureUseCase } from '@shepai/core/application/use-cases/features/delete-feature.use-case';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const deleteFeature = resolve<DeleteFeatureUseCase>('DeleteFeatureUseCase');
    const feature = await deleteFeature.execute(id);
    return NextResponse.json({ feature });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete feature';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
