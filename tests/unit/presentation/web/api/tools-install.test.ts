// @vitest-environment node

/**
 * API Route Tests: POST /api/tools/[id]/install
 *
 * Tests for the tool installation endpoint that delegates to InstallToolUseCase
 * via the DI container.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ToolInstallationStatus } from '@shepai/core/domain/generated/output';

// --- Mock DI container ---

const mockExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: vi.fn((token: string) => {
    if (token === 'InstallToolUseCase') {
      return { execute: mockExecute };
    }
    throw new Error(`Unknown token: ${token}`);
  }),
}));

// --- Helpers ---

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(): Request {
  return new Request('http://localhost:3000/api/tools/zed/install', {
    method: 'POST',
  });
}

function makeStatus(overrides?: Partial<ToolInstallationStatus>): ToolInstallationStatus {
  return {
    status: 'available',
    toolName: 'zed',
    ...overrides,
  } as ToolInstallationStatus;
}

// --- Tests ---

describe('POST /api/tools/[id]/install', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let routeModule: typeof import('@/app/api/tools/[id]/install/route');

  beforeEach(async () => {
    vi.clearAllMocks();
    routeModule = await import(
      '../../../../../src/presentation/web/app/api/tools/[id]/install/route.js'
    );
  });

  it('returns 200 with installation status for a valid tool', async () => {
    const status = makeStatus({ status: 'available', toolName: 'zed' });
    mockExecute.mockResolvedValueOnce(status);

    const response = await routeModule.POST(makeRequest(), makeParams('zed'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toEqual(status);
    expect(mockExecute).toHaveBeenCalledWith('zed');
  });

  it('returns 500 when use case returns error status', async () => {
    const status = makeStatus({
      status: 'error',
      toolName: 'zed',
      errorMessage: 'Installation failed with exit code 1',
    });
    mockExecute.mockResolvedValueOnce(status);

    const response = await routeModule.POST(makeRequest(), makeParams('zed'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Installation failed with exit code 1');
  });

  it('returns 500 when use case throws', async () => {
    mockExecute.mockRejectedValueOnce(new Error('DI container unavailable'));

    const response = await routeModule.POST(makeRequest(), makeParams('zed'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('DI container unavailable');
  });

  it('passes the dynamic route id to the use case', async () => {
    mockExecute.mockResolvedValueOnce(makeStatus({ toolName: 'vscode' }));

    await routeModule.POST(makeRequest(), makeParams('vscode'));

    expect(mockExecute).toHaveBeenCalledWith('vscode');
  });
});
