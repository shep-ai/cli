/**
 * POST /api/code-server/start — Integration Tests
 *
 * Tests the start route handler: validates input, delegates to
 * StartCodeServerUseCase, and returns the code-server URL/port.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Mock DI container ---

const mockStartUseCase = {
  execute: vi.fn(),
};

vi.mock('@/lib/server-container', () => ({
  resolve: vi.fn((token: string) => {
    if (token === 'StartCodeServerUseCase') return mockStartUseCase;
    throw new Error(`Unknown token: ${token}`);
  }),
}));

// --- Import route handler after mocks ---
import { POST } from '@/app/api/code-server/start/route';

describe('POST /api/code-server/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with url and port on success', async () => {
    mockStartUseCase.execute.mockResolvedValue({
      url: 'http://127.0.0.1:13370',
      port: 13370,
    });

    const request = new Request('http://localhost/api/code-server/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featureId: 'feat-1',
        repositoryPath: '/tmp/repo',
        branch: 'feat/my-feature',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ url: 'http://127.0.0.1:13370', port: 13370 });
    expect(mockStartUseCase.execute).toHaveBeenCalledWith({
      featureId: 'feat-1',
      repositoryPath: '/tmp/repo',
      branch: 'feat/my-feature',
    });
  });

  it('returns 400 when featureId is missing', async () => {
    const request = new Request('http://localhost/api/code-server/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryPath: '/tmp/repo',
        branch: 'feat/my-feature',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty('error');
    expect(mockStartUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns 400 when repositoryPath is missing', async () => {
    const request = new Request('http://localhost/api/code-server/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featureId: 'feat-1',
        branch: 'feat/my-feature',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty('error');
    expect(mockStartUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns 400 when branch is missing', async () => {
    const request = new Request('http://localhost/api/code-server/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featureId: 'feat-1',
        repositoryPath: '/tmp/repo',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty('error');
    expect(mockStartUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns 404 when feature is not found', async () => {
    mockStartUseCase.execute.mockRejectedValue(new Error('Feature not found: feat-unknown'));

    const request = new Request('http://localhost/api/code-server/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featureId: 'feat-unknown',
        repositoryPath: '/tmp/repo',
        branch: 'feat/my-feature',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toHaveProperty('error');
  });

  it('returns 500 on unexpected errors', async () => {
    mockStartUseCase.execute.mockRejectedValue(new Error('Spawn failed'));

    const request = new Request('http://localhost/api/code-server/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featureId: 'feat-1',
        repositoryPath: '/tmp/repo',
        branch: 'feat/my-feature',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty('error', 'Spawn failed');
  });

  it('returns 500 with fallback message for non-Error exceptions', async () => {
    mockStartUseCase.execute.mockRejectedValue('something went wrong');

    const request = new Request('http://localhost/api/code-server/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featureId: 'feat-1',
        repositoryPath: '/tmp/repo',
        branch: 'feat/my-feature',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty('error');
  });
});
