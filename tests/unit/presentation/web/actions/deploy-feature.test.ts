// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDeploy = vi.fn();
const mockResolve = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => mockResolve(token),
}));

const mockComputeWorktreePath = vi.fn();
vi.mock('@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path', () => ({
  computeWorktreePath: (...args: unknown[]) => mockComputeWorktreePath(...args),
}));

const mockExistsSync = vi.fn<(path: string) => boolean>();
vi.mock('node:fs', () => ({
  existsSync: (path: string) => mockExistsSync(path),
}));

const { deployFeature } = await import(
  '../../../../../src/presentation/web/app/actions/deploy-feature.js'
);

const MOCK_FEATURE = {
  id: 'feat-123',
  repositoryPath: '/home/user/project',
  branch: 'feat/my-feature',
};

const MOCK_WORKTREE_PATH = '/mock/.shep/repos/abc123/wt/feat-my-feature';

describe('deployFeature server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockComputeWorktreePath.mockReturnValue(MOCK_WORKTREE_PATH);
    mockExistsSync.mockReturnValue(true);
    mockDeploy.mockResolvedValue({ success: true, state: 'Booting' });
    mockResolve.mockImplementation((token: string) => {
      if (token === 'IFeatureRepository') {
        return { findById: vi.fn().mockResolvedValue(MOCK_FEATURE) };
      }
      if (token === 'IAgentDeploymentService') {
        return { deploy: mockDeploy };
      }
      return {};
    });
  });

  it('resolves feature, computes worktree path, and calls agentDeploymentService.deploy', async () => {
    const result = await deployFeature('feat-123');

    expect(mockResolve).toHaveBeenCalledWith('IFeatureRepository');
    expect(mockResolve).toHaveBeenCalledWith('IAgentDeploymentService');
    expect(mockComputeWorktreePath).toHaveBeenCalledWith('/home/user/project', 'feat/my-feature');
    expect(mockExistsSync).toHaveBeenCalledWith(MOCK_WORKTREE_PATH);
    expect(mockDeploy).toHaveBeenCalledWith('feat-123', MOCK_WORKTREE_PATH);
    expect(result).toEqual({ success: true, state: 'Booting' });
  });

  it('returns error when featureId is empty', async () => {
    const result = await deployFeature('');

    expect(result).toEqual({ success: false, error: 'featureId is required' });
    expect(mockDeploy).not.toHaveBeenCalled();
  });

  it('returns error when feature is not found', async () => {
    mockResolve.mockImplementation((token: string) => {
      if (token === 'IFeatureRepository') {
        return { findById: vi.fn().mockResolvedValue(null) };
      }
      if (token === 'IAgentDeploymentService') {
        return { deploy: mockDeploy };
      }
      return {};
    });

    const result = await deployFeature('nonexistent-id');

    expect(result).toEqual({ success: false, error: 'Feature not found: nonexistent-id' });
    expect(mockDeploy).not.toHaveBeenCalled();
  });

  it('returns error when worktree directory does not exist', async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await deployFeature('feat-123');

    expect(result.success).toBe(false);
    expect(result.error).toContain('does not exist');
    expect(result.error).toContain(MOCK_WORKTREE_PATH);
    expect(mockDeploy).not.toHaveBeenCalled();
  });

  it('returns error when agent reports repo is not deployable', async () => {
    mockDeploy.mockResolvedValue({
      success: false,
      error: 'This is a CLI utility with no web server',
      analysis: { reason: 'CLI utility — no server to start' },
    });

    const result = await deployFeature('feat-123');

    expect(result).toEqual({
      success: false,
      error: 'This is a CLI utility with no web server',
      reason: 'CLI utility — no server to start',
    });
  });

  it('returns error when deploy throws', async () => {
    mockDeploy.mockRejectedValue(new Error('Agent unavailable'));

    const result = await deployFeature('feat-123');

    expect(result).toEqual({
      success: false,
      error: 'Agent unavailable',
    });
  });

  it('returns generic error for non-Error throws', async () => {
    mockDeploy.mockRejectedValue('unexpected');

    const result = await deployFeature('feat-123');

    expect(result).toEqual({ success: false, error: 'Failed to deploy feature' });
  });
});
