'use client';

import { ReviewDrawerShell } from '@/components/common/review-drawer-shell';
import { PrdQuestionnaire } from './prd-questionnaire';
import type { PrdQuestionnaireDrawerProps } from './prd-questionnaire-config';

export function PrdQuestionnaireDrawer({
  open,
  onClose,
  featureName,
  featureId,
  repositoryPath,
  branch,
  specPath,
  onDelete,
  isDeleting,
  ...questionnaireProps
}: PrdQuestionnaireDrawerProps) {
  return (
    <ReviewDrawerShell
      open={open}
      onClose={onClose}
      featureName={featureName}
      featureId={featureId}
      repositoryPath={repositoryPath}
      branch={branch}
      specPath={specPath}
      onDelete={onDelete}
      isDeleting={isDeleting}
    >
      <PrdQuestionnaire {...questionnaireProps} />
    </ReviewDrawerShell>
  );
}
