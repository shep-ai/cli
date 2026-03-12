// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindById = vi.fn();
const mockFindRunById = vi.fn();
const mockFindByPath = vi.fn();
const mockGetDefaultBranch = vi.fn();
const mockGetRemoteUrl = vi.fn();
const mockGetMergeableStatus = vi.fn();
const mockGetCiStatus = vi.fn();
const mockGetArtifactExecute = vi.fn();
const mockFeatureUpdate = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'IFeatureRepository')
      return { findById: mockFindById, update: mockFeatureUpdate };
    if (token === 'IAgentRunRepository') return { findById: mockFindRunById };
    if (token === 'IRepositoryRepository') return { findByPath: mockFindByPath };
    if (token === 'IGitPrService')
      return {
        getDefaultBranch: mockGetDefaultBranch,
        getRemoteUrl: mockGetRemoteUrl,
        getMergeableStatus: mockGetMergeableStatus,
        getCiStatus: mockGetCiStatus,
      };
    if (token === 'GetFeatureArtifactUseCase') return { execute: mockGetArtifactExecute };
    throw new Error(`Unknown token: ${token}`);
  },
}));

vi.mock('@/app/build-feature-node-data', () => ({
  buildFeatureNodeData: vi.fn(
    (feature: { id: string; name: string }, _run: unknown, options: Record<string, unknown>) => ({
      featureId: feature.id,
      name: feature.name,
      state: 'running',
      lifecycle: 'requirements',
      ...options,
    })
  ),
}));

const { getFeatureDrawerData } = await import(
  '../../../../../src/presentation/web/app/actions/get-feature-drawer-data.js'
);

describe('getFeatureDrawerData server action', () => {
  const baseFeature = {
    id: 'feat-123',
    name: 'Test Feature',
    repositoryPath: '/home/user/repo',
    branch: 'feat/test',
    agentRunId: 'run-1',
    pr: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockResolvedValue(baseFeature);
    mockFindRunById.mockResolvedValue({ id: 'run-1', status: 'running' });
    mockFindByPath.mockResolvedValue({ name: 'my-repo' });
    mockGetDefaultBranch.mockResolvedValue('main');
    mockGetArtifactExecute.mockResolvedValue({ oneLiner: 'A test feature' });
    mockGetRemoteUrl.mockResolvedValue('https://github.com/user/repo');
    mockGetMergeableStatus.mockResolvedValue(undefined);
    mockGetCiStatus.mockResolvedValue(undefined);
  });

  it('returns null when feature not found', async () => {
    mockFindById.mockResolvedValue(null);

    const result = await getFeatureDrawerData('nonexistent');

    expect(result).toBeNull();
  });

  it('returns FeatureNodeData for a valid feature', async () => {
    const result = await getFeatureDrawerData('feat-123');

    expect(result).toMatchObject({
      featureId: 'feat-123',
      name: 'Test Feature',
    });
    expect(mockFindById).toHaveBeenCalledWith('feat-123');
    expect(mockFindRunById).toHaveBeenCalledWith('run-1');
  });

  it('handles feature without agentRunId', async () => {
    mockFindById.mockResolvedValue({ ...baseFeature, agentRunId: null });

    const result = await getFeatureDrawerData('feat-123');

    expect(result).not.toBeNull();
    expect(mockFindRunById).not.toHaveBeenCalled();
  });

  it('fetches repository, branch, artifact, and remote URL in parallel', async () => {
    await getFeatureDrawerData('feat-123');

    expect(mockFindByPath).toHaveBeenCalledWith('/home/user/repo');
    expect(mockGetDefaultBranch).toHaveBeenCalledWith('/home/user/repo');
    expect(mockGetArtifactExecute).toHaveBeenCalledWith('feat-123');
    expect(mockGetRemoteUrl).toHaveBeenCalledWith('/home/user/repo');
  });

  it('returns null on unexpected errors', async () => {
    mockFindById.mockRejectedValue(new Error('DB connection failed'));

    const result = await getFeatureDrawerData('feat-123');

    expect(result).toBeNull();
  });

  it('handles graceful failures in parallel fetches', async () => {
    mockFindByPath.mockRejectedValue(new Error('not found'));
    mockGetDefaultBranch.mockRejectedValue(new Error('no remote'));
    mockGetArtifactExecute.mockRejectedValue(new Error('no artifact'));
    mockGetRemoteUrl.mockRejectedValue(new Error('no remote'));

    const result = await getFeatureDrawerData('feat-123');

    expect(result).not.toBeNull();
  });
});
