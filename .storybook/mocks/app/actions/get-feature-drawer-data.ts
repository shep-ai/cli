import type { FeatureNodeData } from '@/components/common/feature-node';

export async function getFeatureDrawerData(_featureId: string): Promise<FeatureNodeData | null> {
  return {
    featureId: 'mock-feature-id',
    name: 'Mock Feature',
    description: 'A mock feature for Storybook',
    state: 'running',
    lifecycle: 'requirements',
    progress: 0,
    repositoryPath: '/mock/repo',
    branch: 'feat/mock',
  };
}
