// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock node:fs
const mockExistsSync = vi.fn<(path: string) => boolean>();
vi.mock('node:fs', () => ({
  existsSync: (path: string) => mockExistsSync(path),
}));

// Mock node:child_process
const mockUnref = vi.fn();
const mockSpawn = vi.fn();
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// Store original platform
const originalPlatform = process.platform;

// Import after mocks
const { POST } = await import('../../../../../src/presentation/web/app/api/folder/open/route.js');

function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/folder/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/folder/open', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockSpawn.mockReturnValue({ unref: mockUnref });
    // Reset platform
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('returns 400 for invalid JSON body', async () => {
    const request = new Request('http://localhost/api/folder/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid or missing JSON body');
  });

  it('returns 400 for invalid inputs', async () => {
    const request = createRequest({ repositoryPath: '' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('repositoryPath');
  });

  it('returns 400 for path with traversal', async () => {
    const request = createRequest({ repositoryPath: '/home/../etc/passwd' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('path traversal');
  });

  it('returns 404 when directory does not exist', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockExistsSync.mockReturnValue(false);

    const request = createRequest({ repositoryPath: '/nonexistent' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Directory not found');
  });

  it('returns 501 on unsupported platform', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });

    const request = createRequest({ repositoryPath: '/home/user/project' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.error).toContain('win32');
  });

  it('spawns correct command on darwin', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });

    const request = createRequest({ repositoryPath: '/home/user/project' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSpawn).toHaveBeenCalledWith('open', ['/home/user/project'], {
      detached: true,
      stdio: 'ignore',
    });
    expect(mockUnref).toHaveBeenCalled();
  });

  it('spawns correct command on linux', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });

    const request = createRequest({ repositoryPath: '/home/user/project' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSpawn).toHaveBeenCalledWith('xdg-open', ['/home/user/project'], {
      detached: true,
      stdio: 'ignore',
    });
    expect(mockUnref).toHaveBeenCalled();
  });

  it('returns 200 with correct payload on success', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });

    const request = createRequest({ repositoryPath: '/home/user/project' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      path: '/home/user/project',
    });
  });

  it('returns 500 when spawn throws', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockSpawn.mockImplementation(() => {
      throw new Error('spawn failed');
    });

    const request = createRequest({ repositoryPath: '/home/user/project' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('spawn failed');
  });

  it('returns 500 with generic message for non-Error throws', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockSpawn.mockImplementation(() => {
      throw 'unexpected';
    });

    const request = createRequest({ repositoryPath: '/home/user/project' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to open folder');
  });
});
