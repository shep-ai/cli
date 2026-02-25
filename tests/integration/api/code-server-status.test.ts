/**
 * GET /api/code-server/status — Integration Tests
 *
 * Tests the status route handler: validates featureId query param,
 * delegates to GetCodeServerStatusUseCase, and returns instance data.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Mock DI container ---

const mockStatusUseCase = {
  execute: vi.fn(),
};

vi.mock('@/lib/server-container', () => ({
  resolve: vi.fn((token: string) => {
    if (token === 'GetCodeServerStatusUseCase') return mockStatusUseCase;
    throw new Error(`Unknown token: ${token}`);
  }),
}));

// --- Import route handler after mocks ---
import { GET } from '@/app/api/code-server/status/route';

describe('GET /api/code-server/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with running status data', async () => {
    mockStatusUseCase.execute.mockResolvedValue({
      status: 'running',
      url: 'http://127.0.0.1:13370',
      port: 13370,
    });

    const request = new Request('http://localhost/api/code-server/status?featureId=feat-1');

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'running',
      url: 'http://127.0.0.1:13370',
      port: 13370,
    });
    expect(mockStatusUseCase.execute).toHaveBeenCalledWith({ featureId: 'feat-1' });
  });

  it('returns 200 with null when no instance exists', async () => {
    mockStatusUseCase.execute.mockResolvedValue(null);

    const request = new Request('http://localhost/api/code-server/status?featureId=feat-1');

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toBeNull();
  });

  it('returns 200 with stopped status', async () => {
    mockStatusUseCase.execute.mockResolvedValue({
      status: 'stopped',
    });

    const request = new Request('http://localhost/api/code-server/status?featureId=feat-1');

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'stopped' });
  });

  it('returns 400 when featureId query param is missing', async () => {
    const request = new Request('http://localhost/api/code-server/status');

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty('error');
    expect(mockStatusUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns 500 on unexpected errors', async () => {
    mockStatusUseCase.execute.mockRejectedValue(new Error('DB connection failed'));

    const request = new Request('http://localhost/api/code-server/status?featureId=feat-1');

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty('error', 'DB connection failed');
  });

  it('returns 500 with fallback message for non-Error exceptions', async () => {
    mockStatusUseCase.execute.mockRejectedValue('unexpected');

    const request = new Request('http://localhost/api/code-server/status?featureId=feat-1');

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty('error');
  });
});
