'use server';

import { resolve } from '@/lib/server-container';
import type { GetFeatureArtifactUseCase } from '@shepai/core/application/use-cases/features/get-feature-artifact.use-case';
import type { FeatureArtifact } from '@shepai/core/domain/generated/output';
import type { PrdQuestionnaireData } from '@shepai/core/domain/generated/output';

interface GetFeatureArtifactResult {
  questionnaire?: PrdQuestionnaireData;
  artifact?: FeatureArtifact;
  error?: string;
}

/**
 * Map FeatureArtifact openQuestions into the PrdQuestionnaireData shape
 * expected by the PrdQuestionnaireDrawer component.
 */
function toQuestionnaireData(artifact: FeatureArtifact): PrdQuestionnaireData {
  return {
    question: 'Review Feature Requirements',
    context: artifact.oneLiner,
    questions: artifact.openQuestions.map((oq, idx) => ({
      id: `q-${idx}`,
      question: oq.question,
      type: 'select' as const,
      options: (oq.options ?? []).map((opt, optIdx) => ({
        id: `q-${idx}-opt-${optIdx}`,
        label: opt.option,
        rationale: opt.description,
        ...(opt.selected ? { recommended: true } : {}),
      })),
    })),
    finalAction: {
      id: 'approve-reqs',
      label: 'Approve Requirements',
      description: 'Finalize and lock the requirements for implementation',
    },
  };
}

export async function getFeatureArtifact(featureId: string): Promise<GetFeatureArtifactResult> {
  if (!featureId.trim()) {
    return { error: 'Feature id is required' };
  }

  try {
    const useCase = resolve<GetFeatureArtifactUseCase>('GetFeatureArtifactUseCase');
    const artifact = await useCase.execute(featureId);
    const questionnaire = toQuestionnaireData(artifact);
    return { questionnaire, artifact };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load feature artifact';
    return { error: message };
  }
}
