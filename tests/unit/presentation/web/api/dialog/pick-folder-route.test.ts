import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the FolderDialogService before importing the route
const mockPickFolder = vi.fn<() => string | null>();
vi.mock('@shepai/core/infrastructure/services/folder-dialog.service', () => ({
  FolderDialogService: class {
    pickFolder = mockPickFolder;
  },
}));

// Must import after mock setup
const { POST } = await import(
  '../../../../../../src/presentation/web/app/api/dialog/pick-folder/route.js'
);

describe('POST /api/dialog/pick-folder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns selected path when user picks a folder', async () => {
    mockPickFolder.mockReturnValue('/Users/dev/my-repo');

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ path: '/Users/dev/my-repo', cancelled: false });
  });

  it('returns cancelled: true when user cancels the dialog', async () => {
    mockPickFolder.mockReturnValue(null);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ path: null, cancelled: true });
  });

  it('returns 500 with error message on service failure', async () => {
    mockPickFolder.mockImplementation(() => {
      throw new Error('Unsupported platform: freebsd');
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Unsupported platform: freebsd' });
  });

  it('returns generic error message for non-Error throws', async () => {
    mockPickFolder.mockImplementation(() => {
      throw 'something unexpected';
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to open folder dialog' });
  });
});
