'use server';

import { resolve } from '@/lib/server-container';
import type { GetResearchArtifactUseCase } from '@shepai/core/application/use-cases/features/get-research-artifact.use-case';
import type { ResearchArtifact, TechDecision } from '@shepai/core/domain/generated/output';

export interface TechDecisionsReviewData {
  name: string;
  summary: string;
  decisions: TechDecision[];
  technologies: string[];
}

interface GetResearchArtifactResult {
  techDecisions?: TechDecisionsReviewData;
  error?: string;
}

function toTechDecisionsData(artifact: ResearchArtifact): TechDecisionsReviewData {
  return {
    name: artifact.name,
    summary: artifact.summary,
    decisions: artifact.decisions,
    technologies: artifact.technologies,
  };
}

export async function getResearchArtifact(featureId: string): Promise<GetResearchArtifactResult> {
  if (!featureId.trim()) {
    return { error: 'Feature id is required' };
  }

  try {
    const useCase = resolve<GetResearchArtifactUseCase>('GetResearchArtifactUseCase');
    const artifact = await useCase.execute(featureId);
    const techDecisions = toTechDecisionsData(artifact);
    return { techDecisions };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load research artifact';
    return { error: message };
  }
}
