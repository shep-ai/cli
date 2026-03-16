// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDeploy = vi.fn();
const mockResolve = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => mockResolve(token),
}));

const mockExistsSync = vi.fn<(path: string) => boolean>();
vi.mock('node:fs', () => ({
  existsSync: (path: string) => mockExistsSync(path),
}));

const mockIsAbsolute = vi.fn<(p: string) => boolean>();
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return { ...actual, isAbsolute: (p: string) => mockIsAbsolute(p) };
});

const { deployRepository } = await import(
  '../../../../../src/presentation/web/app/actions/deploy-repository.js'
);

describe('deployRepository server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockIsAbsolute.mockImplementation((p: string) => /^\//.test(p));
    mockDeploy.mockResolvedValue({ success: true, state: 'Booting' });
    mockResolve.mockImplementation((token: string) => {
      if (token === 'IAgentDeploymentService') {
        return { deploy: mockDeploy };
      }
      return {};
    });
  });

  it('validates repositoryPath is an absolute path', async () => {
    const result = await deployRepository('relative/path');

    expect(result).toEqual({
      success: false,
      error: 'repositoryPath must be an absolute path',
    });
    expect(mockDeploy).not.toHaveBeenCalled();
  });

  it('returns error for empty repositoryPath', async () => {
    const result = await deployRepository('');

    expect(result).toEqual({
      success: false,
      error: 'repositoryPath must be an absolute path',
    });
    expect(mockDeploy).not.toHaveBeenCalled();
  });

  it('accepts Windows-style absolute paths when path.isAbsolute recognizes them', async () => {
    mockIsAbsolute.mockReturnValue(true);

    const result = await deployRepository('C:\\Projects\\repo');

    expect(mockExistsSync).toHaveBeenCalledWith('C:\\Projects\\repo');
    expect(mockDeploy).toHaveBeenCalledWith('C:\\Projects\\repo', 'C:\\Projects\\repo');
    expect(result).toEqual({ success: true, state: 'Booting' });
  });

  it('returns error when directory does not exist', async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await deployRepository('/nonexistent/path');

    expect(result.success).toBe(false);
    expect(result.error).toContain('does not exist');
    expect(mockDeploy).not.toHaveBeenCalled();
  });

  it('calls agentDeploymentService.deploy with repositoryPath as both targetId and path', async () => {
    const result = await deployRepository('/home/user/project');

    expect(mockResolve).toHaveBeenCalledWith('IAgentDeploymentService');
    expect(mockExistsSync).toHaveBeenCalledWith('/home/user/project');
    expect(mockDeploy).toHaveBeenCalledWith('/home/user/project', '/home/user/project');
    expect(result).toEqual({ success: true, state: 'Booting' });
  });

  it('returns error when agent reports repo is not deployable', async () => {
    mockDeploy.mockResolvedValue({
      success: false,
      error: 'This is a data-only repository with no server to start',
      analysis: { reason: 'Data repo — no server' },
    });

    const result = await deployRepository('/home/user/project');

    expect(result).toEqual({
      success: false,
      error: 'This is a data-only repository with no server to start',
      reason: 'Data repo — no server',
    });
  });

  it('returns error when deploy throws', async () => {
    mockDeploy.mockRejectedValue(new Error('Agent unavailable'));

    const result = await deployRepository('/home/user/project');

    expect(result).toEqual({
      success: false,
      error: 'Agent unavailable',
    });
  });

  it('returns generic error for non-Error throws', async () => {
    mockDeploy.mockRejectedValue('unexpected');

    const result = await deployRepository('/home/user/project');

    expect(result).toEqual({ success: false, error: 'Failed to deploy repository' });
  });
});
