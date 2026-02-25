// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStart = vi.fn();
const mockResolve = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => mockResolve(token),
}));

const mockExistsSync = vi.fn<(path: string) => boolean>();
vi.mock('node:fs', () => ({
  existsSync: (path: string) => mockExistsSync(path),
}));

const { deployRepository } = await import(
  '../../../../../src/presentation/web/app/actions/deploy-repository.js'
);

describe('deployRepository server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockResolve.mockImplementation((token: string) => {
      if (token === 'IDeploymentService') {
        return { start: mockStart };
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
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('returns error for empty repositoryPath', async () => {
    const result = await deployRepository('');

    expect(result).toEqual({
      success: false,
      error: 'repositoryPath must be an absolute path',
    });
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('returns error when directory does not exist', async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await deployRepository('/nonexistent/path');

    expect(result.success).toBe(false);
    expect(result.error).toContain('does not exist');
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('calls service.start with repositoryPath as both targetId and path', async () => {
    const result = await deployRepository('/home/user/project');

    expect(mockResolve).toHaveBeenCalledWith('IDeploymentService');
    expect(mockExistsSync).toHaveBeenCalledWith('/home/user/project');
    expect(mockStart).toHaveBeenCalledWith('/home/user/project', '/home/user/project');
    expect(result).toEqual({ success: true, state: 'Booting' });
  });

  it('returns error when service.start throws', async () => {
    mockStart.mockImplementation(() => {
      throw new Error('No dev script found in package.json');
    });

    const result = await deployRepository('/home/user/project');

    expect(result).toEqual({
      success: false,
      error: 'No dev script found in package.json',
    });
  });

  it('returns generic error for non-Error throws', async () => {
    mockStart.mockImplementation(() => {
      throw 'unexpected';
    });

    const result = await deployRepository('/home/user/project');

    expect(result).toEqual({ success: false, error: 'Failed to deploy repository' });
  });
});
