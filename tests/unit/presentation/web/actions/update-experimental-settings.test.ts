import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
const mockGetSettings = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: () => ({ execute: mockExecute }),
}));

vi.mock('@shepai/core/infrastructure/services/settings.service', () => ({
  getSettings: mockGetSettings,
}));

// UpdateSettingsUseCase is imported as a class token in the server action.
// Mock it to avoid tsyringe decorator issues in test.
vi.mock('@shepai/core/application/use-cases/settings/update-settings.use-case', () => ({
  UpdateSettingsUseCase: class MockUpdateSettingsUseCase {},
}));

const { updateExperimentalSetting } = await import(
  '../../../../../src/presentation/web/app/actions/update-experimental-settings.js'
);

describe('updateExperimentalSetting server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue(undefined);
  });

  it('returns error for unknown flag name', async () => {
    const result = await updateExperimentalSetting('nonexistent', true);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown experimental flag 'nonexistent'");
    expect(mockGetSettings).not.toHaveBeenCalled();
  });

  it('updates settings.experimental.skills to true', async () => {
    const settings = {
      experimental: { skills: false },
      updatedAt: new Date('2024-01-01'),
    };
    mockGetSettings.mockReturnValue(settings);

    const result = await updateExperimentalSetting('skills', true);

    expect(result).toEqual({ success: true });
    expect(settings.experimental.skills).toBe(true);
    expect(settings.updatedAt).not.toEqual(new Date('2024-01-01'));
    expect(mockExecute).toHaveBeenCalledWith(settings);
  });

  it('updates settings.experimental.skills to false', async () => {
    const settings = {
      experimental: { skills: true },
      updatedAt: new Date('2024-01-01'),
    };
    mockGetSettings.mockReturnValue(settings);

    const result = await updateExperimentalSetting('skills', false);

    expect(result).toEqual({ success: true });
    expect(settings.experimental.skills).toBe(false);
    expect(mockExecute).toHaveBeenCalledWith(settings);
  });

  it('returns error when use case throws', async () => {
    const settings = {
      experimental: { skills: false },
      updatedAt: new Date('2024-01-01'),
    };
    mockGetSettings.mockReturnValue(settings);
    mockExecute.mockRejectedValue(new Error('DB write failed'));

    const result = await updateExperimentalSetting('skills', true);

    expect(result).toEqual({ success: false, error: 'DB write failed' });
  });
});
