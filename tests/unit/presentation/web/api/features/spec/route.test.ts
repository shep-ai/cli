import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the server-container resolve before importing the route
const mockExecute = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: () => ({ execute: mockExecute }),
}));

// Mock fs and js-yaml for spec file reading
const mockReadFileSync = vi.fn();
vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const mod = {
    ...actual,
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  };
  return { ...mod, default: mod };
});

const mockYamlLoad = vi.fn();
vi.mock('js-yaml', () => ({
  default: { load: (...args: unknown[]) => mockYamlLoad(...args) },
  load: (...args: unknown[]) => mockYamlLoad(...args),
}));

// Must import after mock setup
const { GET } = await import(
  '../../../../../../../src/presentation/web/app/api/features/[id]/spec/route.js'
);

/** Helper to build a GET Request for a given feature ID. */
function makeRequest(id: string): Request {
  return new Request(`http://localhost/api/features/${id}/spec`, {
    method: 'GET',
  });
}

/** Helper to build route params (Next.js 15+ uses Promise-based params). */
function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

const SAMPLE_SPEC = {
  name: 'test-feature',
  number: 1,
  branch: 'feat/001-test',
  oneLiner: 'A test feature',
  summary: 'This is a test summary',
  content: '## Problem\n\nSome content here',
  technologies: ['TypeScript'],
  relatedFeatures: [],
  relatedLinks: [],
  openQuestions: [
    { question: 'Is this resolved?', resolved: true, answer: 'Yes' },
    { question: 'Is this open?', resolved: false },
  ],
  phase: 'Requirements',
  sizeEstimate: 'S',
};

describe('GET /api/features/[id]/spec', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Success path ---

  it('returns 200 with parsed FeatureSpec JSON when spec.yaml exists', async () => {
    const feature = { id: 'abc-123', specPath: '/path/to/spec-dir' };
    mockExecute.mockResolvedValue(feature);
    mockReadFileSync.mockReturnValue('name: test-feature');
    mockYamlLoad.mockReturnValue(SAMPLE_SPEC);

    const response = await GET(makeRequest('abc-123'), makeParams('abc-123'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(SAMPLE_SPEC);
    expect(mockExecute).toHaveBeenCalledWith('abc-123');
    expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/spec-dir/spec.yaml', 'utf-8');
    expect(mockYamlLoad).toHaveBeenCalledWith('name: test-feature');
  });

  // --- Validation errors (400) ---

  it('returns 400 when id is empty string', async () => {
    const response = await GET(makeRequest(''), makeParams(''));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringContaining('id') });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns 400 when id is whitespace-only', async () => {
    const response = await GET(makeRequest('   '), makeParams('   '));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringContaining('id') });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  // --- Not found (404) ---

  it('returns 404 when feature has no specPath', async () => {
    const feature = { id: 'abc-123', specPath: undefined };
    mockExecute.mockResolvedValue(feature);

    const response = await GET(makeRequest('abc-123'), makeParams('abc-123'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Spec not found' });
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  it('returns 404 when spec.yaml file does not exist on disk', async () => {
    const feature = { id: 'abc-123', specPath: '/path/to/missing-dir' };
    mockExecute.mockResolvedValue(feature);
    mockReadFileSync.mockImplementation(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });

    const response = await GET(makeRequest('abc-123'), makeParams('abc-123'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Spec not found' });
  });

  // --- Internal errors (500) ---

  it('returns 500 with error message when use case throws Error', async () => {
    mockExecute.mockRejectedValue(new Error('Feature not found'));

    const response = await GET(makeRequest('bad-id'), makeParams('bad-id'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Feature not found' });
  });

  it('returns 500 with generic message when use case throws non-Error', async () => {
    mockExecute.mockRejectedValue('something unexpected');

    const response = await GET(makeRequest('bad-id'), makeParams('bad-id'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to load spec' });
  });

  it('returns 500 when YAML parsing fails', async () => {
    const feature = { id: 'abc-123', specPath: '/path/to/spec-dir' };
    mockExecute.mockResolvedValue(feature);
    mockReadFileSync.mockReturnValue('invalid: yaml: content: [');
    mockYamlLoad.mockImplementation(() => {
      throw new Error('YAML parse error');
    });

    const response = await GET(makeRequest('abc-123'), makeParams('abc-123'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'YAML parse error' });
  });
});
