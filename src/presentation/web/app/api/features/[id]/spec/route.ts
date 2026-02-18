import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { resolve } from '@/lib/server-container';
import type { ShowFeatureUseCase } from '@shepai/core/application/use-cases/features/show-feature.use-case';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const showFeature = resolve<ShowFeatureUseCase>('ShowFeatureUseCase');
    const feature = await showFeature.execute(id);

    if (!feature.specPath) {
      return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
    }

    const raw = readFileSync(join(feature.specPath, 'spec.yaml'), 'utf-8');
    const spec = yaml.load(raw);

    return NextResponse.json(spec);
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : 'Failed to load spec';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
