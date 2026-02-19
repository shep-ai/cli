import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the FileDialogService before importing the route
const mockPickFiles = vi.fn<() => { path: string; name: string; size: number }[] | null>();
vi.mock('@shepai/core/infrastructure/services/file-dialog.service', () => ({
  FileDialogService: class {
    pickFiles = mockPickFiles;
  },
}));

// Must import after mock setup
const { POST } =
  await import('../../../../../../src/presentation/web/app/api/dialog/pick-files/route.js');

describe('POST /api/dialog/pick-files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns selected files when user picks files', async () => {
    const files = [
      { path: '/Users/dev/docs/requirements.pdf', name: 'requirements.pdf', size: 42000 },
      { path: '/Users/dev/images/screenshot.png', name: 'screenshot.png', size: 150000 },
    ];
    mockPickFiles.mockReturnValue(files);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ files, cancelled: false });
  });

  it('returns cancelled: true when user cancels the dialog', async () => {
    mockPickFiles.mockReturnValue(null);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ files: null, cancelled: true });
  });

  it('returns 500 with error message on service failure', async () => {
    mockPickFiles.mockImplementation(() => {
      throw new Error('Unsupported platform: freebsd');
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Unsupported platform: freebsd' });
  });

  it('returns generic error message for non-Error throws', async () => {
    mockPickFiles.mockImplementation(() => {
      throw 'something unexpected';
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to open file dialog' });
  });
});
