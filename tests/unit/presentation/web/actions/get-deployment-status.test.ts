// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetStatus = vi.fn();
const mockResolve = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => mockResolve(token),
}));

const { getDeploymentStatus } = await import(
  '../../../../../src/presentation/web/app/actions/get-deployment-status.js'
);

describe('getDeploymentStatus server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolve.mockImplementation((token: string) => {
      if (token === 'IDeploymentService') {
        return { getStatus: mockGetStatus };
      }
      return {};
    });
  });

  it('returns state and url for tracked deployment', async () => {
    mockGetStatus.mockReturnValue({ state: 'Ready', url: 'http://localhost:3000' });

    const result = await getDeploymentStatus('feat-123');

    expect(mockResolve).toHaveBeenCalledWith('IDeploymentService');
    expect(mockGetStatus).toHaveBeenCalledWith('feat-123');
    expect(result).toEqual({ state: 'Ready', url: 'http://localhost:3000' });
  });

  it('returns state with null url for booting deployment', async () => {
    mockGetStatus.mockReturnValue({ state: 'Booting', url: null });

    const result = await getDeploymentStatus('feat-123');

    expect(result).toEqual({ state: 'Booting', url: null });
  });

  it('returns null for unknown targetId', async () => {
    mockGetStatus.mockReturnValue(null);

    const result = await getDeploymentStatus('nonexistent-id');

    expect(mockGetStatus).toHaveBeenCalledWith('nonexistent-id');
    expect(result).toBeNull();
  });

  it('works with repositoryPath as targetId', async () => {
    mockGetStatus.mockReturnValue({ state: 'Ready', url: 'http://localhost:5173' });

    const result = await getDeploymentStatus('/home/user/project');

    expect(mockGetStatus).toHaveBeenCalledWith('/home/user/project');
    expect(result).toEqual({ state: 'Ready', url: 'http://localhost:5173' });
  });

  it('returns null for empty targetId', async () => {
    const result = await getDeploymentStatus('');

    expect(result).toBeNull();
    expect(mockGetStatus).not.toHaveBeenCalled();
  });
});
