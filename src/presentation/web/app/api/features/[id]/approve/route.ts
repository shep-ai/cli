import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { ApproveAgentRunUseCase } from '@shepai/core/application/use-cases/agents/approve-agent-run.use-case';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json({ error: 'Feature id is required' }, { status: 400 });
  }

  try {
    const featureRepo = resolve<IFeatureRepository>('IFeatureRepository');
    const feature = await featureRepo.findById(id);

    if (!feature) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    if (!feature.agentRunId) {
      return NextResponse.json({ error: 'Feature has no agent run' }, { status: 400 });
    }

    const approveUseCase = resolve<ApproveAgentRunUseCase>('ApproveAgentRunUseCase');
    const result = await approveUseCase.execute(feature.agentRunId);

    if (!result.approved) {
      return NextResponse.json({ error: result.reason }, { status: 409 });
    }

    return NextResponse.json({ approved: true, featureId: id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to approve feature';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
