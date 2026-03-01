'use server';

import { resolve } from '@/lib/server-container';
import type { GetFeatureArtifactUseCase } from '@shepai/core/application/use-cases/features/get-feature-artifact.use-case';
import type { FeatureArtifact } from '@shepai/core/domain/generated/output';
import type { PrdQuestionnaireData } from '@shepai/core/domain/generated/output';
import type { ProductDecisionsSummaryData } from '@/components/common/product-decisions-summary';

interface GetFeatureArtifactResult {
  questionnaire?: PrdQuestionnaireData;
  productDecisions?: ProductDecisionsSummaryData;
  artifact?: FeatureArtifact;
  error?: string;
}

/**
 * Map FeatureArtifact openQuestions into the PrdQuestionnaireData shape
 * expected by the PrdQuestionnaireDrawer component.
 */
function toQuestionnaireData(artifact: FeatureArtifact): PrdQuestionnaireData {
  return {
    question: 'Goal',
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

/**
 * Map FeatureArtifact openQuestions into a read-only summary for the
 * Product Decisions tab in the tech review drawer.
 */
function toProductDecisionsData(artifact: FeatureArtifact): ProductDecisionsSummaryData {
  return {
    question: 'Goal',
    context: artifact.oneLiner,
    questions: artifact.openQuestions
      .filter((oq) => oq.resolved)
      .map((oq) => {
        const selected = oq.options?.find((o) => o.selected);
        return {
          question: oq.question,
          selectedOption: selected?.option ?? oq.answer ?? 'N/A',
          rationale: oq.selectionRationale ?? selected?.description ?? '',
          wasRecommended: false,
        };
      }),
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
    const productDecisions = toProductDecisionsData(artifact);
    return { questionnaire, productDecisions, artifact };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load feature artifact';
    return { error: message };
  }
}
