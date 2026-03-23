// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolve = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: (...args: unknown[]) => mockResolve(...args),
}));

const { getViewerPermission } = await import(
  '../../../../../src/presentation/web/app/actions/get-viewer-permission.js'
);

describe('getViewerPermission server action', () => {
  let mockService: { getViewerPermission: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = { getViewerPermission: vi.fn() };
    mockResolve.mockReturnValue(mockService);
  });

  it('returns canPushDirectly=true for ADMIN permission', async () => {
    mockService.getViewerPermission.mockResolvedValue('ADMIN');

    const result = await getViewerPermission('/path/to/repo');

    expect(result).toEqual({ canPushDirectly: true });
  });

  it('returns canPushDirectly=true for MAINTAIN permission', async () => {
    mockService.getViewerPermission.mockResolvedValue('MAINTAIN');

    const result = await getViewerPermission('/path/to/repo');

    expect(result).toEqual({ canPushDirectly: true });
  });

  it('returns canPushDirectly=true for WRITE permission', async () => {
    mockService.getViewerPermission.mockResolvedValue('WRITE');

    const result = await getViewerPermission('/path/to/repo');

    expect(result).toEqual({ canPushDirectly: true });
  });

  it('returns canPushDirectly=false for READ permission', async () => {
    mockService.getViewerPermission.mockResolvedValue('READ');

    const result = await getViewerPermission('/path/to/repo');

    expect(result).toEqual({ canPushDirectly: false });
  });

  it('returns canPushDirectly=false for TRIAGE permission', async () => {
    mockService.getViewerPermission.mockResolvedValue('TRIAGE');

    const result = await getViewerPermission('/path/to/repo');

    expect(result).toEqual({ canPushDirectly: false });
  });

  it('returns canPushDirectly=false when service throws', async () => {
    mockService.getViewerPermission.mockRejectedValue(new Error('gh not installed'));

    const result = await getViewerPermission('/path/to/repo');

    expect(result).toEqual({ canPushDirectly: false });
  });

  it('resolves IGitHubRepositoryService from DI container', async () => {
    mockService.getViewerPermission.mockResolvedValue('ADMIN');

    await getViewerPermission('/path/to/repo');

    expect(mockResolve).toHaveBeenCalledWith('IGitHubRepositoryService');
  });

  it('passes repoPath to service.getViewerPermission', async () => {
    mockService.getViewerPermission.mockResolvedValue('ADMIN');

    await getViewerPermission('/my/repo/path');

    expect(mockService.getViewerPermission).toHaveBeenCalledWith('/my/repo/path');
  });
});
