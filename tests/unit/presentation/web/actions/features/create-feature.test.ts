import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('../../../../../../src/presentation/web/lib/server-container.js', () => ({
  resolve: () => ({ execute: mockExecute }),
}));

vi.mock('@shepai/core/application/use-cases/features/create/create-feature.use-case', () => ({
  CreateFeatureUseCase: class CreateFeatureUseCase {},
}));

const { createFeature } = await import(
  '../../../../../../src/presentation/web/app/actions/create-feature.js'
);

describe('createFeature server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Success paths ---

  it('returns feature on success', async () => {
    const feature = { id: '1', name: 'My Feature', slug: 'my-feature' };
    mockExecute.mockResolvedValue({ feature, warning: 'slug was adjusted' });

    const result = await createFeature({
      name: 'My Feature',
      description: 'A description',
      repositoryPath: '/repo',
    });

    expect(result).toEqual({ feature });
  });

  // --- userInput composition ---

  it('composes userInput from name and description', async () => {
    const feature = { id: '3', name: 'Test', slug: 'test' };
    mockExecute.mockResolvedValue({ feature });

    await createFeature({
      name: 'Auth System',
      description: 'Add login and signup',
      repositoryPath: '/repo',
    });

    expect(mockExecute).toHaveBeenCalledWith({
      userInput: 'Feature: Auth System\n\nAdd login and signup',
      repositoryPath: '/repo',
      approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    });
  });

  it('composes userInput with only name when description is empty', async () => {
    const feature = { id: '4', name: 'Test', slug: 'test' };
    mockExecute.mockResolvedValue({ feature });

    await createFeature({ name: 'Quick Fix', description: '', repositoryPath: '/repo' });

    expect(mockExecute).toHaveBeenCalledWith({
      userInput: 'Feature: Quick Fix',
      repositoryPath: '/repo',
      approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    });
  });

  it('composes userInput with only name when description is omitted', async () => {
    const feature = { id: '5', name: 'Test', slug: 'test' };
    mockExecute.mockResolvedValue({ feature });

    await createFeature({ name: 'No Desc', repositoryPath: '/repo' });

    expect(mockExecute).toHaveBeenCalledWith({
      userInput: 'Feature: No Desc',
      repositoryPath: '/repo',
      approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    });
  });

  it('appends attachment file paths to userInput', async () => {
    const feature = { id: '6', name: 'Test', slug: 'test' };
    mockExecute.mockResolvedValue({ feature });

    await createFeature({
      name: 'With Files',
      description: 'See attached',
      repositoryPath: '/repo',
      attachments: [
        { path: '/src/index.ts', name: 'index.ts' },
        { path: '/src/utils.ts', name: 'utils.ts' },
      ],
    });

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

    await createFeature({
      name: 'Files Only',
      repositoryPath: '/repo',
      attachments: [{ path: '/readme.md', name: 'readme.md' }],
    });

    expect(mockExecute).toHaveBeenCalledWith({
      userInput: 'Feature: Files Only\n\nAttached files:\n- /readme.md',
      repositoryPath: '/repo',
      approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    });
  });

  // --- Validation errors ---

  it('returns error when name is missing', async () => {
    const result = await createFeature({
      name: '',
      repositoryPath: '/repo',
    });

    expect(result).toEqual({ error: 'name is required' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error when name is whitespace-only', async () => {
    const result = await createFeature({
      name: '   ',
      repositoryPath: '/repo',
    });

    expect(result).toEqual({ error: 'name is required' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error when repositoryPath is missing', async () => {
    const result = await createFeature({
      name: 'Feature',
      repositoryPath: '',
    });

    expect(result).toEqual({ error: 'repositoryPath is required' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  // --- Internal errors ---

  it('returns error when createFeature throws Error', async () => {
    mockExecute.mockRejectedValue(new Error('Worktree creation failed'));

    const result = await createFeature({ name: 'Broken', repositoryPath: '/repo' });

    expect(result).toEqual({ error: 'Worktree creation failed' });
  });

  it('returns generic error when createFeature throws non-Error', async () => {
    mockExecute.mockRejectedValue('something unexpected');

    const result = await createFeature({ name: 'Broken', repositoryPath: '/repo' });

    expect(result).toEqual({ error: 'Failed to create feature' });
  });

  // --- approvalGates forwarding ---

  describe('approvalGates', () => {
    it('forwards { allowPrd: true, allowPlan: false } with allowMerge defaulted', async () => {
      mockExecute.mockResolvedValue({ feature: { id: '1' } });

      await createFeature({
        name: 'Test',
        repositoryPath: '/repo',
        approvalGates: { allowPrd: true, allowPlan: false },
      });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: true, allowPlan: false, allowMerge: false },
        })
      );
    });

    it('forwards full approvalGates including allowMerge', async () => {
      mockExecute.mockResolvedValue({ feature: { id: '1' } });

      await createFeature({
        name: 'Test',
        repositoryPath: '/repo',
        approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
      });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
        })
      );
    });

    it('defaults to all false when approvalGates is omitted', async () => {
      mockExecute.mockResolvedValue({ feature: { id: '1' } });

      await createFeature({ name: 'Test', repositoryPath: '/repo' });

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
        })
      );
    });
  });
});
