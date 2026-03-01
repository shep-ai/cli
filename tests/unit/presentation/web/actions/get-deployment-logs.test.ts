// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetLogs = vi.fn();
const mockResolve = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => mockResolve(token),
}));

const { getDeploymentLogs } = await import(
  '../../../../../src/presentation/web/app/actions/get-deployment-logs.js'
);

describe('getDeploymentLogs server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolve.mockImplementation((token: string) => {
      if (token === 'IDeploymentService') {
        return { getLogs: mockGetLogs };
      }
      return {};
    });
  });

  it('returns null when targetId is empty string', async () => {
    const result = await getDeploymentLogs('');

    expect(result).toBeNull();
    expect(mockGetLogs).not.toHaveBeenCalled();
  });

  it('returns null when targetId is whitespace-only', async () => {
    const result = await getDeploymentLogs('   ');

    expect(result).toBeNull();
    expect(mockGetLogs).not.toHaveBeenCalled();
  });

  it('calls resolve and getLogs with correct targetId', async () => {
    mockGetLogs.mockReturnValue([]);

    await getDeploymentLogs('feat-123');

    expect(mockResolve).toHaveBeenCalledWith('IDeploymentService');
    expect(mockGetLogs).toHaveBeenCalledWith('feat-123');
  });

  it('returns LogEntry array from service', async () => {
    const mockLogs = [
      { targetId: 'feat-123', stream: 'stdout', line: 'hello', timestamp: 1000 },
      { targetId: 'feat-123', stream: 'stderr', line: 'error', timestamp: 1001 },
    ];
    mockGetLogs.mockReturnValue(mockLogs);

    const result = await getDeploymentLogs('feat-123');

    expect(result).toEqual(mockLogs);
  });

  it('returns null when service returns null (unknown deployment)', async () => {
    mockGetLogs.mockReturnValue(null);

    const result = await getDeploymentLogs('nonexistent');

    expect(mockGetLogs).toHaveBeenCalledWith('nonexistent');
    expect(result).toBeNull();
  });
});
