import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the settings service before importing the module under test
vi.mock('@shepai/core/infrastructure/services/settings.service', () => ({
  hasSettings: vi.fn(),
  getSettings: vi.fn(),
}));

import { isRtlLanguage, getLanguagePreference } from '@/lib/language';
import { hasSettings, getSettings } from '@shepai/core/infrastructure/services/settings.service';

const mockHasSettings = vi.mocked(hasSettings);
const mockGetSettings = vi.mocked(getSettings);

describe('isRtlLanguage', () => {
  it('returns true for Arabic', () => {
    expect(isRtlLanguage('ar')).toBe(true);
  });

  it('returns true for Hebrew', () => {
    expect(isRtlLanguage('he')).toBe(true);
  });

  it('returns false for English', () => {
    expect(isRtlLanguage('en')).toBe(false);
  });

  it('returns false for Russian', () => {
    expect(isRtlLanguage('ru')).toBe(false);
  });

  it('returns false for other LTR languages', () => {
    for (const lang of ['pt', 'es', 'fr', 'de']) {
      expect(isRtlLanguage(lang)).toBe(false);
    }
  });
});

describe('getLanguagePreference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns language="en" and dir="ltr" when settings have English', () => {
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      user: { preferredLanguage: 'en' },
    } as ReturnType<typeof getSettings>);

    const result = getLanguagePreference();
    expect(result).toEqual({ language: 'en', dir: 'ltr' });
  });

  it('returns language="ar" and dir="rtl" when settings have Arabic', () => {
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      user: { preferredLanguage: 'ar' },
    } as ReturnType<typeof getSettings>);

    const result = getLanguagePreference();
    expect(result).toEqual({ language: 'ar', dir: 'rtl' });
  });

  it('returns language="he" and dir="rtl" when settings have Hebrew', () => {
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      user: { preferredLanguage: 'he' },
    } as ReturnType<typeof getSettings>);

    const result = getLanguagePreference();
    expect(result).toEqual({ language: 'he', dir: 'rtl' });
  });

  it('defaults to English when settings are not available', () => {
    mockHasSettings.mockReturnValue(false);

    const result = getLanguagePreference();
    expect(result).toEqual({ language: 'en', dir: 'ltr' });
  });

  it('defaults to English when preferredLanguage is undefined', () => {
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      user: { preferredLanguage: undefined },
    } as ReturnType<typeof getSettings>);

    const result = getLanguagePreference();
    expect(result).toEqual({ language: 'en', dir: 'ltr' });
  });

  it('defaults to English when getSettings throws', () => {
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockImplementation(() => {
      throw new Error('DB not available');
    });

    const result = getLanguagePreference();
    expect(result).toEqual({ language: 'en', dir: 'ltr' });
  });
});
