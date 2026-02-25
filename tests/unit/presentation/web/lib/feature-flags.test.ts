import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the settings service before importing the module under test
const mockGetSettings = vi.fn();
const mockHasSettings = vi.fn();

vi.mock('@shepai/core/infrastructure/services/settings.service', () => ({
  getSettings: mockGetSettings,
  hasSettings: mockHasSettings,
}));

// Dynamic import so mocks take effect
const { getFeatureFlags } = await import('@/lib/feature-flags');

describe('getFeatureFlags', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    // Shallow-clone env so mutations don't leak
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // --- Env var takes precedence ---

  it('returns { skills: true } when NEXT_PUBLIC_FLAG_SKILLS is "true"', () => {
    process.env.NEXT_PUBLIC_FLAG_SKILLS = 'true';
    expect(getFeatureFlags()).toEqual({ skills: true });
  });

  it('returns { skills: true } when NEXT_PUBLIC_FLAG_SKILLS is "1"', () => {
    process.env.NEXT_PUBLIC_FLAG_SKILLS = '1';
    expect(getFeatureFlags()).toEqual({ skills: true });
  });

  it('returns { skills: false } when NEXT_PUBLIC_FLAG_SKILLS is "false"', () => {
    process.env.NEXT_PUBLIC_FLAG_SKILLS = 'false';
    expect(getFeatureFlags()).toEqual({ skills: false });
  });

  it('returns { skills: false } when NEXT_PUBLIC_FLAG_SKILLS is "0"', () => {
    process.env.NEXT_PUBLIC_FLAG_SKILLS = '0';
    expect(getFeatureFlags()).toEqual({ skills: false });
  });

  it('ignores settings when env var is explicitly set', () => {
    process.env.NEXT_PUBLIC_FLAG_SKILLS = 'true';
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      experimental: { skills: false },
    });
    expect(getFeatureFlags()).toEqual({ skills: true });
    // Should not even read settings
    expect(mockGetSettings).not.toHaveBeenCalled();
  });

  // --- Falls back to settings ---

  it('reads from settings when env var is unset and hasSettings() is true', () => {
    delete process.env.NEXT_PUBLIC_FLAG_SKILLS;
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      experimental: { skills: true },
    });
    expect(getFeatureFlags()).toEqual({ skills: true });
  });

  it('reads skills: false from settings when flag is disabled', () => {
    delete process.env.NEXT_PUBLIC_FLAG_SKILLS;
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      experimental: { skills: false },
    });
    expect(getFeatureFlags()).toEqual({ skills: false });
  });

  // --- Falls back to default ---

  it('returns { skills: false } when env var is unset and hasSettings() is false', () => {
    delete process.env.NEXT_PUBLIC_FLAG_SKILLS;
    mockHasSettings.mockReturnValue(false);
    expect(getFeatureFlags()).toEqual({ skills: false });
    expect(mockGetSettings).not.toHaveBeenCalled();
  });

  // --- Edge cases for env var values ---

  it('falls through to settings when env var is empty string', () => {
    process.env.NEXT_PUBLIC_FLAG_SKILLS = '';
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      experimental: { skills: true },
    });
    expect(getFeatureFlags()).toEqual({ skills: true });
  });

  it('falls through to settings when env var is an unrecognised value', () => {
    process.env.NEXT_PUBLIC_FLAG_SKILLS = 'yes';
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      experimental: { skills: true },
    });
    expect(getFeatureFlags()).toEqual({ skills: true });
  });
});
