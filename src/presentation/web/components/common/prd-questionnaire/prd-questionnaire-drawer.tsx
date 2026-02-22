'use client';

import { ReviewDrawerShell } from '@/components/common/review-drawer-shell';
import { PrdQuestionnaire } from './prd-questionnaire';
import type { PrdQuestionnaireDrawerProps } from './prd-questionnaire-config';

export function PrdQuestionnaireDrawer({
  open,
  onClose,
  featureName,
  featureDescription,
  featureId,
  repositoryPath,
  branch,
  specPath,
  onDelete,
  ...questionnaireProps
}: PrdQuestionnaireDrawerProps) {
  return (
    <ReviewDrawerShell
      open={open}
      onClose={onClose}
      featureName={featureName}
      featureDescription={featureDescription}
      featureId={featureId}
      repositoryPath={repositoryPath}
      branch={branch}
      specPath={specPath}
      onDelete={onDelete}
    >
      <PrdQuestionnaire {...questionnaireProps} />
    </ReviewDrawerShell>
  );
}
