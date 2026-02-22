import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPickFolder = vi.fn<() => string | null>();
vi.mock('@shepai/core/infrastructure/services/folder-dialog.service', () => ({
  FolderDialogService: class {
    pickFolder = mockPickFolder;
  },
}));

const { pickFolder } = await import(
  '../../../../../src/presentation/web/app/actions/pick-folder.js'
);

describe('pickFolder server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns selected path when user picks a folder', async () => {
    mockPickFolder.mockReturnValue('/Users/dev/my-repo');

    const result = await pickFolder();

    expect(result).toEqual({ path: '/Users/dev/my-repo' });
  });

  it('returns null path when user cancels the dialog', async () => {
    mockPickFolder.mockReturnValue(null);

    const result = await pickFolder();

    expect(result).toEqual({ path: null });
  });

  it('returns error message on service failure', async () => {
    mockPickFolder.mockImplementation(() => {
      throw new Error('Unsupported platform: freebsd');
    });

    const result = await pickFolder();

    expect(result).toEqual({ path: null, error: 'Unsupported platform: freebsd' });
  });

  it('returns generic error message for non-Error throws', async () => {
    mockPickFolder.mockImplementation(() => {
      throw 'something unexpected';
    });

    const result = await pickFolder();

    expect(result).toEqual({ path: null, error: 'Failed to open folder dialog' });
  });
});
