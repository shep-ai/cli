import { FeatureTreePageClient } from './feature-tree-page-client';
import { getFeatureTreeData } from './get-feature-tree-data';

/** Skip static pre-rendering since we need runtime DI container and server context. */
export const dynamic = 'force-dynamic';

export default async function FeaturesPage() {
  const features = await getFeatureTreeData();

  return (
    <div className="flex h-full flex-col p-6">
      <FeatureTreePageClient features={features} />
    </div>
  );
}
