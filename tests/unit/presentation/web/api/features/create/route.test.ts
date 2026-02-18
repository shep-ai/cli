import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the server container resolve() before importing the route.
// The route calls resolve(CreateFeatureUseCase) which returns an object with execute().
const mockExecute = vi.fn();
vi.mock('../../../../../../../src/presentation/web/lib/server-container.js', () => ({
  resolve: () => ({ execute: mockExecute }),
}));

// Mock @shepai/core use case import so tsyringe doesn't load
vi.mock('@shepai/core/application/use-cases/features/create/create-feature.use-case', () => ({
  CreateFeatureUseCase: class CreateFeatureUseCase {},
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
    mockExecute.mockResolvedValue({ feature, warning: 'slug was adjusted' });

    const response = await POST(
      makeRequest({ name: 'My Feature', description: 'A description', repositoryPath: '/repo' })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ feature, warning: 'slug was adjusted' });
  });

  it('returns 200 with feature and no warning when warning is absent', async () => {
    const feature = { id: '2', name: 'Another', slug: 'another' };
    mockExecute.mockResolvedValue({ feature });

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
    mockExecute.mockResolvedValue({ feature });

    await POST(
      makeRequest({
        name: 'Auth System',
        description: 'Add login and signup',
        repositoryPath: '/repo',
      })
    );

    expect(mockExecute).toHaveBeenCalledWith({
      userInput: 'Feature: Auth System\n\nAdd login and signup',
      repositoryPath: '/repo',
      approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    });
  });

  it('composes userInput with only name when description is empty', async () => {
    const feature = { id: '4', name: 'Test', slug: 'test' };
    mockExecute.mockResolvedValue({ feature });

    await POST(makeRequest({ name: 'Quick Fix', description: '', repositoryPath: '/repo' }));

    expect(mockExecute).toHaveBeenCalledWith({
      userInput: 'Feature: Quick Fix',
      repositoryPath: '/repo',
      approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    });
  });

  it('composes userInput with only name when description is omitted', async () => {
    const feature = { id: '5', name: 'Test', slug: 'test' };
    mockExecute.mockResolvedValue({ feature });

    await POST(makeRequest({ name: 'No Desc', repositoryPath: '/repo' }));

    expect(mockExecute).toHaveBeenCalledWith({
      userInput: 'Feature: No Desc',
      repositoryPath: '/repo',
      approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    });
  });

  it('appends attachment file paths to userInput', async () => {
    const feature = { id: '6', name: 'Test', slug: 'test' };
    mockExecute.mockResolvedValue({ feature });

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

    expect(mockExecute).toHaveBeenCalledWith({
      userInput:
        'Feature: With Files\n\nSee attached\n\nAttached files:\n- /src/index.ts\n- /src/utils.ts',
      repositoryPath: '/repo',
      approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    });
  });

  it('appends attachments even when description is empty', async () => {
    const feature = { id: '7', name: 'Test', slug: 'test' };
    mockExecute.mockResolvedValue({ feature });

    await POST(
      makeRequest({
        name: 'Files Only',
        repositoryPath: '/repo',
        attachments: [{ path: '/readme.md', name: 'readme.md' }],
      })
    );

    expect(mockExecute).toHaveBeenCalledWith({
      userInput: 'Feature: Files Only\n\nAttached files:\n- /readme.md',
      repositoryPath: '/repo',
      approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    });
  });

  // --- Validation errors (400) ---

  it('returns 400 when name is missing', async () => {
    const response = await POST(makeRequest({ description: 'something', repositoryPath: '/repo' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringContaining('name') });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns 400 when name is empty string', async () => {
    const response = await POST(
      makeRequest({ name: '', description: 'something', repositoryPath: '/repo' })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringContaining('name') });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns 400 when name is whitespace-only', async () => {
    const response = await POST(
      makeRequest({ name: '   ', description: 'something', repositoryPath: '/repo' })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringContaining('name') });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns 400 when repositoryPath is missing', async () => {
    const response = await POST(makeRequest({ name: 'Feature' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringContaining('repositoryPath') });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns 400 when repositoryPath is empty string', async () => {
    const response = await POST(makeRequest({ name: 'Feature', repositoryPath: '' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringContaining('repositoryPath') });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  // --- Internal errors (500) ---

  it('returns 500 with error message when createFeature throws Error', async () => {
    mockExecute.mockRejectedValue(new Error('Worktree creation failed'));

    const response = await POST(makeRequest({ name: 'Broken', repositoryPath: '/repo' }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Worktree creation failed' });
  });

  it('returns 500 with generic message when createFeature throws non-Error', async () => {
    mockExecute.mockRejectedValue('something unexpected');

    const response = await POST(makeRequest({ name: 'Broken', repositoryPath: '/repo' }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to create feature' });
  });

  // --- approvalGates forwarding ---

  describe('approvalGates', () => {
    it('forwards { allowPrd: true, allowPlan: false } to createFeature when provided', async () => {
      mockCreateFeature.mockResolvedValue({ feature: { id: '1' } });

      await POST(
        makeRequest({
          name: 'Test',
          repositoryPath: '/repo',
          approvalGates: { allowPrd: true, allowPlan: false },
        })
      );

      expect(mockCreateFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: true, allowPlan: false, allowMerge: false },
        })
      );
    });

    it('forwards { allowPrd: true, allowPlan: true } to createFeature when provided', async () => {
      mockCreateFeature.mockResolvedValue({ feature: { id: '1' } });

      await POST(
        makeRequest({
          name: 'Test',
          repositoryPath: '/repo',
          approvalGates: { allowPrd: true, allowPlan: true },
        })
      );

      expect(mockCreateFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: true, allowPlan: true, allowMerge: false },
        })
      );
    });

    it('forwards { allowPrd: true, allowPlan: true, allowMerge: true } to createFeature when provided', async () => {
      mockCreateFeature.mockResolvedValue({ feature: { id: '1' } });

      await POST(
        makeRequest({
          name: 'Test',
          repositoryPath: '/repo',
          approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
        })
      );

      expect(mockCreateFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
        })
      );
    });

    it('defaults allowMerge to false when not provided in approvalGates', async () => {
      mockCreateFeature.mockResolvedValue({ feature: { id: '1' } });

      await POST(
        makeRequest({
          name: 'Test',
          repositoryPath: '/repo',
          approvalGates: { allowPrd: true, allowPlan: false },
        })
      );

      expect(mockCreateFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: true, allowPlan: false, allowMerge: false },
        })
      );
    });

    it('defaults to { allowPrd: false, allowPlan: false } when approvalGates is omitted', async () => {
      mockCreateFeature.mockResolvedValue({ feature: { id: '1' } });

      await POST(makeRequest({ name: 'Test', repositoryPath: '/repo' }));

      expect(mockCreateFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
        })
      );
    });

    it('returns 400 when approvalGates is not an object', async () => {
      const response = await POST(
        makeRequest({ name: 'Test', repositoryPath: '/repo', approvalGates: 'invalid' })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: expect.stringContaining('approvalGates') });
      expect(mockCreateFeature).not.toHaveBeenCalled();
    });

    it('returns 400 when approvalGates is an array', async () => {
      const response = await POST(
        makeRequest({ name: 'Test', repositoryPath: '/repo', approvalGates: [true, false] })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: expect.stringContaining('approvalGates') });
      expect(mockCreateFeature).not.toHaveBeenCalled();
    });

    it('returns 400 when approvalGates is a number', async () => {
      const response = await POST(
        makeRequest({ name: 'Test', repositoryPath: '/repo', approvalGates: 42 })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: expect.stringContaining('approvalGates') });
      expect(mockCreateFeature).not.toHaveBeenCalled();
    });

    it('returns 400 when approvalGates.allowPrd is not a boolean', async () => {
      const response = await POST(
        makeRequest({
          name: 'Test',
          repositoryPath: '/repo',
          approvalGates: { allowPrd: 'yes', allowPlan: false },
        })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: expect.stringContaining('approvalGates') });
      expect(mockCreateFeature).not.toHaveBeenCalled();
    });

    it('returns 400 when approvalGates.allowPlan is not a boolean', async () => {
      const response = await POST(
        makeRequest({
          name: 'Test',
          repositoryPath: '/repo',
          approvalGates: { allowPrd: true, allowPlan: 1 },
        })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: expect.stringContaining('approvalGates') });
      expect(mockCreateFeature).not.toHaveBeenCalled();
    });

    it('returns 400 when approvalGates is missing allowPrd', async () => {
      const response = await POST(
        makeRequest({
          name: 'Test',
          repositoryPath: '/repo',
          approvalGates: { allowPlan: false },
        })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: expect.stringContaining('approvalGates') });
      expect(mockCreateFeature).not.toHaveBeenCalled();
    });

    it('returns 400 when approvalGates is missing allowPlan', async () => {
      const response = await POST(
        makeRequest({
          name: 'Test',
          repositoryPath: '/repo',
          approvalGates: { allowPrd: true },
        })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: expect.stringContaining('approvalGates') });
      expect(mockCreateFeature).not.toHaveBeenCalled();
    });

    it('returns 400 when approvalGates.allowMerge is not a boolean', async () => {
      const response = await POST(
        makeRequest({
          name: 'Test',
          repositoryPath: '/repo',
          approvalGates: { allowPrd: true, allowPlan: false, allowMerge: 'yes' },
        })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: expect.stringContaining('approvalGates') });
      expect(mockCreateFeature).not.toHaveBeenCalled();
    });

    it('passes undefined approvalGates for "allow-all" mode (no gates in body)', async () => {
      mockCreateFeature.mockResolvedValue({ feature: { id: '1' } });

      // When the client sends approvalGates: undefined, JSON.stringify omits it
      // which is the same as not sending it at all — so the route defaults.
      // But for "allow-all", the client should explicitly send no approvalGates field.
      // The route defaults to { allowPrd: false, allowPlan: false } when absent.
      // The "allow-all" → undefined mapping happens in the client's submission handler.
      await POST(makeRequest({ name: 'Test', repositoryPath: '/repo' }));

      expect(mockCreateFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
        })
      );
    });
  });
});
