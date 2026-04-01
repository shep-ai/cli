'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { FeatureTreeTable } from '@/components/features/feature-tree-table';
import type { FeatureTreeRow } from '@/components/features/feature-tree-table';
import { PageHeader } from '@/components/common/page-header';

export interface FeatureTreePageClientProps {
  features: FeatureTreeRow[];
}

export function FeatureTreePageClient({ features }: FeatureTreePageClientProps) {
  const router = useRouter();

  const handleFeatureClick = useCallback(
    (featureId: string) => {
      router.push(`/feature/${featureId}/overview`);
    },
    [router]
  );

  return (
    <div data-testid="feature-tree-page" className="flex h-full flex-col gap-4">
      <PageHeader title="Features" description="All features organized as a tree view" />
      <div className="min-h-0 flex-1">
        <FeatureTreeTable data={features} onFeatureClick={handleFeatureClick} />
      </div>
    </div>
  );
}
