import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPickFiles = vi.fn<() => { path: string; name: string; size: number }[] | null>();
vi.mock('@shepai/core/infrastructure/services/file-dialog.service', () => ({
  FileDialogService: class {
    pickFiles = mockPickFiles;
  },
}));

const { pickFiles } = await import('../../../../../src/presentation/web/app/actions/pick-files.js');

describe('pickFiles server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns selected files when user picks files', async () => {
    const files = [
      { path: '/Users/dev/docs/requirements.pdf', name: 'requirements.pdf', size: 42000 },
      { path: '/Users/dev/images/screenshot.png', name: 'screenshot.png', size: 150000 },
    ];
    mockPickFiles.mockReturnValue(files);

    const result = await pickFiles();

    expect(result).toEqual({ files });
  });

  it('returns null files when user cancels the dialog', async () => {
    mockPickFiles.mockReturnValue(null);

    const result = await pickFiles();

    expect(result).toEqual({ files: null });
  });

  it('returns error message on service failure', async () => {
    mockPickFiles.mockImplementation(() => {
      throw new Error('Unsupported platform: freebsd');
    });

    const result = await pickFiles();

    expect(result).toEqual({ files: null, error: 'Unsupported platform: freebsd' });
  });

  it('returns generic error message for non-Error throws', async () => {
    mockPickFiles.mockImplementation(() => {
      throw 'something unexpected';
    });

    const result = await pickFiles();

    expect(result).toEqual({ files: null, error: 'Failed to open file dialog' });
  });
});
