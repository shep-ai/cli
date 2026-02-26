// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStop = vi.fn();
const mockResolve = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => mockResolve(token),
}));

const { stopDeployment } = await import(
  '../../../../../src/presentation/web/app/actions/stop-deployment.js'
);

describe('stopDeployment server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStop.mockResolvedValue(undefined);
    mockResolve.mockImplementation((token: string) => {
      if (token === 'IDeploymentService') {
        return { stop: mockStop };
      }
      return {};
    });
  });

  it('calls service.stop with targetId', async () => {
    const result = await stopDeployment('feat-123');

    expect(mockResolve).toHaveBeenCalledWith('IDeploymentService');
    expect(mockStop).toHaveBeenCalledWith('feat-123');
    expect(result).toEqual({ success: true });
  });

  it('works with repositoryPath as targetId', async () => {
    const result = await stopDeployment('/home/user/project');

    expect(mockStop).toHaveBeenCalledWith('/home/user/project');
    expect(result).toEqual({ success: true });
  });

  it('returns error for empty targetId', async () => {
    const result = await stopDeployment('');

    expect(result).toEqual({ success: false, error: 'targetId is required' });
    expect(mockStop).not.toHaveBeenCalled();
  });

  it('returns error when service.stop throws', async () => {
    mockStop.mockRejectedValue(new Error('Process already exited'));

    const result = await stopDeployment('feat-123');

    expect(result).toEqual({ success: false, error: 'Process already exited' });
  });

  it('returns generic error for non-Error throws', async () => {
    mockStop.mockRejectedValue('unexpected');

    const result = await stopDeployment('feat-123');

    expect(result).toEqual({ success: false, error: 'Failed to stop deployment' });
  });
});
