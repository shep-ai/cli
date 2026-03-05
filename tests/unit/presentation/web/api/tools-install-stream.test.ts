// @vitest-environment node

/**
 * API Route Tests: GET /api/tools/[id]/install/stream
 *
 * Tests for the SSE tool installation streaming endpoint that delegates
 * to InstallToolUseCase via the DI container with an onOutput callback.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

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

function makeRequest(id = 'tmux'): Request {
  return new Request(`http://localhost:3000/api/tools/${id}/install/stream`);
}

// --- Tests ---

describe('GET /api/tools/[id]/install/stream', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let routeModule: typeof import('@/app/api/tools/[id]/install/stream/route');

  beforeEach(async () => {
    vi.clearAllMocks();
    routeModule = await import(
      '../../../../../src/presentation/web/app/api/tools/[id]/install/stream/route.js'
    );
  });

  it('returns SSE content-type headers', async () => {
    mockExecute.mockResolvedValue({ status: 'available', toolName: 'tmux' });

    const response = await routeModule.GET(makeRequest(), makeParams('tmux'));

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Connection')).toBe('keep-alive');
  });

  it('streams output events and done event', async () => {
    mockExecute.mockImplementation(async (toolName: string, onOutput?: (data: string) => void) => {
      onOutput?.('Installing tmux...\n');
      onOutput?.('Done.\n');
      return { status: 'available', toolName };
    });

    const response = await routeModule.GET(makeRequest(), makeParams('tmux'));
    const text = await response.text();

    expect(text).toContain('data: Installing tmux...');
    expect(text).toContain('event: done');
    expect(text).toContain('"status":"available"');
  });

  it('passes the dynamic route id to the use case', async () => {
    mockExecute.mockResolvedValue({ status: 'available', toolName: 'vscode' });

    await routeModule.GET(makeRequest('vscode'), makeParams('vscode'));

    expect(mockExecute).toHaveBeenCalledWith('vscode', expect.any(Function));
  });

  it('streams error event when use case throws', async () => {
    mockExecute.mockRejectedValue(new Error('Installation failed'));

    const response = await routeModule.GET(makeRequest(), makeParams('tmux'));
    const text = await response.text();

    expect(text).toContain('event: done');
    expect(text).toContain('"status":"error"');
    expect(text).toContain('"errorMessage":"Installation failed"');
  });
});
