import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the use-cases bridge before importing the route
const mockCreateFeature = vi.fn();
vi.mock('@shepai/core/infrastructure/di/use-cases-bridge', () => ({
  createFeature: mockCreateFeature,
}));

// Must import after mock setup
const { POST } = await import(
  '../../../../../../../src/presentation/web/app/api/features/create/route.js'
);

/** Helper to build a Request with JSON body. */
function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/features/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/features/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Success paths ---

  it('returns 200 with feature and warning on success', async () => {
    const feature = { id: '1', name: 'My Feature', slug: 'my-feature' };
    mockCreateFeature.mockResolvedValue({ feature, warning: 'slug was adjusted' });

    const response = await POST(
      makeRequest({ name: 'My Feature', description: 'A description', repositoryPath: '/repo' })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ feature, warning: 'slug was adjusted' });
  });

  it('returns 200 with feature and no warning when warning is absent', async () => {
    const feature = { id: '2', name: 'Another', slug: 'another' };
    mockCreateFeature.mockResolvedValue({ feature });

    const response = await POST(
      makeRequest({ name: 'Another', description: '', repositoryPath: '/repo' })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ feature });
  });

  // --- userInput composition ---

  it('composes userInput from name and description', async () => {
    const feature = { id: '3', name: 'Test', slug: 'test' };
    mockCreateFeature.mockResolvedValue({ feature });

    await POST(
      makeRequest({
        name: 'Auth System',
        description: 'Add login and signup',
        repositoryPath: '/repo',
      })
    );

    expect(mockCreateFeature).toHaveBeenCalledWith({
      userInput: 'Feature: Auth System\n\nAdd login and signup',
      repositoryPath: '/repo',
    });
  });

  it('composes userInput with only name when description is empty', async () => {
    const feature = { id: '4', name: 'Test', slug: 'test' };
    mockCreateFeature.mockResolvedValue({ feature });

    await POST(makeRequest({ name: 'Quick Fix', description: '', repositoryPath: '/repo' }));

    expect(mockCreateFeature).toHaveBeenCalledWith({
      userInput: 'Feature: Quick Fix',
      repositoryPath: '/repo',
    });
  });

  it('composes userInput with only name when description is omitted', async () => {
    const feature = { id: '5', name: 'Test', slug: 'test' };
    mockCreateFeature.mockResolvedValue({ feature });

    await POST(makeRequest({ name: 'No Desc', repositoryPath: '/repo' }));

    expect(mockCreateFeature).toHaveBeenCalledWith({
      userInput: 'Feature: No Desc',
      repositoryPath: '/repo',
    });
  });

  it('appends attachment file paths to userInput', async () => {
    const feature = { id: '6', name: 'Test', slug: 'test' };
    mockCreateFeature.mockResolvedValue({ feature });

    await POST(
      makeRequest({
        name: 'With Files',
        description: 'See attached',
        repositoryPath: '/repo',
        attachments: [
          { path: '/src/index.ts', name: 'index.ts' },
          { path: '/src/utils.ts', name: 'utils.ts' },
        ],
      })
    );

    expect(mockCreateFeature).toHaveBeenCalledWith({
      userInput:
        'Feature: With Files\n\nSee attached\n\nAttached files:\n- /src/index.ts\n- /src/utils.ts',
      repositoryPath: '/repo',
    });
  });

  it('appends attachments even when description is empty', async () => {
    const feature = { id: '7', name: 'Test', slug: 'test' };
    mockCreateFeature.mockResolvedValue({ feature });

    await POST(
      makeRequest({
        name: 'Files Only',
        repositoryPath: '/repo',
        attachments: [{ path: '/readme.md', name: 'readme.md' }],
      })
    );

    expect(mockCreateFeature).toHaveBeenCalledWith({
      userInput: 'Feature: Files Only\n\nAttached files:\n- /readme.md',
      repositoryPath: '/repo',
    });
  });

  // --- Validation errors (400) ---

  it('returns 400 when name is missing', async () => {
    const response = await POST(makeRequest({ description: 'something', repositoryPath: '/repo' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringContaining('name') });
    expect(mockCreateFeature).not.toHaveBeenCalled();
  });

  it('returns 400 when name is empty string', async () => {
    const response = await POST(
      makeRequest({ name: '', description: 'something', repositoryPath: '/repo' })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringContaining('name') });
    expect(mockCreateFeature).not.toHaveBeenCalled();
  });

  it('returns 400 when name is whitespace-only', async () => {
    const response = await POST(
      makeRequest({ name: '   ', description: 'something', repositoryPath: '/repo' })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringContaining('name') });
    expect(mockCreateFeature).not.toHaveBeenCalled();
  });

  it('returns 400 when repositoryPath is missing', async () => {
    const response = await POST(makeRequest({ name: 'Feature' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringContaining('repositoryPath') });
    expect(mockCreateFeature).not.toHaveBeenCalled();
  });

  it('returns 400 when repositoryPath is empty string', async () => {
    const response = await POST(makeRequest({ name: 'Feature', repositoryPath: '' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringContaining('repositoryPath') });
    expect(mockCreateFeature).not.toHaveBeenCalled();
  });

  // --- Internal errors (500) ---

  it('returns 500 with error message when bridge throws Error', async () => {
    mockCreateFeature.mockRejectedValue(new Error('Worktree creation failed'));

    const response = await POST(makeRequest({ name: 'Broken', repositoryPath: '/repo' }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Worktree creation failed' });
  });

  it('returns 500 with generic message when bridge throws non-Error', async () => {
    mockCreateFeature.mockRejectedValue('something unexpected');

    const response = await POST(makeRequest({ name: 'Broken', repositoryPath: '/repo' }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to create feature' });
  });
});
