/**
 * POST /api/code-server/stop — Integration Tests
 *
 * Tests the stop route handler: validates input, delegates to
 * StopCodeServerUseCase, and returns success or error response.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Mock DI container ---

const mockStopUseCase = {
  execute: vi.fn(),
};

vi.mock('@/lib/server-container', () => ({
  resolve: vi.fn((token: string) => {
    if (token === 'StopCodeServerUseCase') return mockStopUseCase;
    throw new Error(`Unknown token: ${token}`);
  }),
}));

// --- Import route handler after mocks ---
import { POST } from '@/app/api/code-server/stop/route';

describe('POST /api/code-server/stop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 on successful stop', async () => {
    mockStopUseCase.execute.mockResolvedValue(undefined);

    const request = new Request('http://localhost/api/code-server/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featureId: 'feat-1' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockStopUseCase.execute).toHaveBeenCalledWith({ featureId: 'feat-1' });
  });

  it('returns 400 when featureId is missing', async () => {
    const request = new Request('http://localhost/api/code-server/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty('error');
    expect(mockStopUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns 500 on unexpected errors', async () => {
    mockStopUseCase.execute.mockRejectedValue(new Error('Process not found'));

    const request = new Request('http://localhost/api/code-server/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featureId: 'feat-1' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty('error', 'Process not found');
  });

  it('returns 500 with fallback message for non-Error exceptions', async () => {
    mockStopUseCase.execute.mockRejectedValue('unexpected');

    const request = new Request('http://localhost/api/code-server/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featureId: 'feat-1' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty('error');
  });
});
