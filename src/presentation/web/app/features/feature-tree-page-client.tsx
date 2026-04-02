'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { FeatureTreeTable } from '@/components/features/feature-tree-table';
import type { FeatureTreeRow, InventoryRepo } from '@/components/features/feature-tree-table';
import { PageHeader } from '@/components/common/page-header';

export interface FeatureTreePageClientProps {
  features: FeatureTreeRow[];
  repos: InventoryRepo[];
}

export function FeatureTreePageClient({ features, repos }: FeatureTreePageClientProps) {
  const router = useRouter();

  const handleFeatureClick = useCallback(
    (featureId: string) => {
      router.push(`/feature/${featureId}/overview`);
    },
    [router]
  );

  return (
    <div data-testid="feature-tree-page" className="flex h-full flex-col gap-4">
      <PageHeader title="Inventory" description="All repositories and features" />
      <div className="min-h-0 flex-1">
        <FeatureTreeTable data={features} repos={repos} onFeatureClick={handleFeatureClick} />
      </div>
    </div>
  );
}
