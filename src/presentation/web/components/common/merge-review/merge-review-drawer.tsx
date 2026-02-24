'use client';

import { Loader2 } from 'lucide-react';
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
  data,
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
    >
      {data ? (
        <MergeReview data={data} {...reviewProps} />
      ) : (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      )}
    </ReviewDrawerShell>
  );
}
