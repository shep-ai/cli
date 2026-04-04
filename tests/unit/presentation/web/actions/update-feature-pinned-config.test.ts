// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockResolve = vi.fn();
const mockExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: mockResolve,
}));

const { updateFeaturePinnedConfig } = await import(
  '../../../../../src/presentation/web/app/actions/update-feature-pinned-config.js'
);

describe('updateFeaturePinnedConfig server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolve.mockReturnValue({ execute: mockExecute });
    mockExecute.mockResolvedValue({
      featureId: 'feat-1',
      agentRunId: 'run-1',
      agentType: 'codex-cli',
      modelId: 'gpt-5.4',
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    });
  });

  it('returns error when featureId is empty', async () => {
    const result = await updateFeaturePinnedConfig('', 'codex-cli', 'gpt-5.4');

    expect(result).toEqual({ ok: false, error: 'Feature id is required' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error when agentType is empty', async () => {
    const result = await updateFeaturePinnedConfig('feat-1', '   ', 'gpt-5.4');

    expect(result).toEqual({ ok: false, error: 'Agent type is required' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error when modelId is empty', async () => {
    const result = await updateFeaturePinnedConfig('feat-1', 'codex-cli', '  ');

    expect(result).toEqual({ ok: false, error: 'Model id is required' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('resolves UpdateFeaturePinnedConfigUseCase from the DI container', async () => {
    await updateFeaturePinnedConfig('feat-1', 'codex-cli', 'gpt-5.4');

    expect(mockResolve).toHaveBeenCalledWith('UpdateFeaturePinnedConfigUseCase');
  });

  it('forwards featureId, agentType, and modelId directly to the use case', async () => {
    const result = await updateFeaturePinnedConfig(' feat-1 ', ' codex-cli ', ' gpt-5.4 ');

    expect(result).toEqual({ ok: true });
    expect(mockExecute).toHaveBeenCalledWith({
      featureId: 'feat-1',
      agentType: 'codex-cli',
      modelId: 'gpt-5.4',
    });
    expect(mockExecute).toHaveBeenCalledOnce();
  });

  it('returns use-case validation errors without partial success state', async () => {
    mockExecute.mockRejectedValue(new Error('Unsupported model "gpt-5.4" for agent "codex-cli"'));

    const result = await updateFeaturePinnedConfig('feat-1', 'codex-cli', 'gpt-5.4');

    expect(result).toEqual({
      ok: false,
      error: 'Unsupported model "gpt-5.4" for agent "codex-cli"',
    });
  });

  it('returns a fallback error when a non-Error is thrown', async () => {
    mockExecute.mockRejectedValue('unexpected');

    const result = await updateFeaturePinnedConfig('feat-1', 'codex-cli', 'gpt-5.4');

    expect(result).toEqual({ ok: false, error: 'Failed to update feature pinned config' });
  });
});
