'use client';

import { ReviewDrawerShell } from '@/components/common/review-drawer-shell';
import { TechDecisionsReview } from './tech-decisions-review';
import type { TechDecisionsDrawerProps } from './tech-decisions-review-config';

export function TechDecisionsDrawer({
  open,
  onClose,
  featureName,
  featureId,
  repositoryPath,
  branch,
  specPath,
  onDelete,
  isDeleting,
  ...reviewProps
}: TechDecisionsDrawerProps) {
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
      <TechDecisionsReview {...reviewProps} />
    </ReviewDrawerShell>
  );
}
