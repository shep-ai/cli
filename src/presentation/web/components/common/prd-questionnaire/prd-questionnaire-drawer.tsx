'use client';

import { Loader2 } from 'lucide-react';
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
  data,
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
      {data ? (
        <PrdQuestionnaire data={data} {...questionnaireProps} />
      ) : (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      )}
    </ReviewDrawerShell>
  );
}
