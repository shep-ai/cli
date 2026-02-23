'use client';

import { ReviewDrawerShell } from '@/components/common/review-drawer-shell';
import { MergeReview } from './merge-review';
import type { MergeReviewDrawerProps } from './merge-review-config';

export function MergeReviewDrawer({
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
}: MergeReviewDrawerProps) {
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
      <MergeReview {...reviewProps} />
    </ReviewDrawerShell>
  );
}
