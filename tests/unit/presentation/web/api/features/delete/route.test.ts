import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the server-container resolve before importing the route
const mockExecute = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: () => ({ execute: mockExecute }),
}));

// Must import after mock setup
const { DELETE } =
  await import('../../../../../../../src/presentation/web/app/api/features/[id]/route.js');

/** Helper to build a DELETE Request for a given feature ID. */
function makeRequest(id: string): Request {
  return new Request(`http://localhost/api/features/${id}`, {
    method: 'DELETE',
  });
}

/** Helper to build route params (Next.js 15+ uses Promise-based params). */
function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe('DELETE /api/features/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Success path ---

  it('returns 200 with deleted feature on success', async () => {
    const feature = { id: 'abc-123', name: 'My Feature', slug: 'my-feature' };
    mockExecute.mockResolvedValue(feature);

    const response = await DELETE(makeRequest('abc-123'), makeParams('abc-123'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ feature });
    expect(mockExecute).toHaveBeenCalledWith('abc-123');
  });

  // --- Validation errors (400) ---

  it('returns 400 when id is empty string', async () => {
    const response = await DELETE(makeRequest(''), makeParams(''));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringContaining('id') });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns 400 when id is whitespace-only', async () => {
    const response = await DELETE(makeRequest('   '), makeParams('   '));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringContaining('id') });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  // --- Internal errors (500) ---

  it('returns 500 with error message when use case throws Error', async () => {
    mockExecute.mockRejectedValue(new Error('Feature not found'));

    const response = await DELETE(makeRequest('bad-id'), makeParams('bad-id'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Feature not found' });
  });

  it('returns 500 with generic message when use case throws non-Error', async () => {
    mockExecute.mockRejectedValue('something unexpected');

    const response = await DELETE(makeRequest('bad-id'), makeParams('bad-id'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to delete feature' });
  });
});
