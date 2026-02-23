import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the settings service module
vi.mock('@/infrastructure/services/settings.service.js', () => ({
  getSettings: vi.fn(),
}));

import { CheckOnboardingStatusUseCase } from '@/application/use-cases/settings/check-onboarding-status.use-case.js';
import { getSettings } from '@/infrastructure/services/settings.service.js';

const mockGetSettings = vi.mocked(getSettings);

describe('CheckOnboardingStatusUseCase', () => {
  let useCase: CheckOnboardingStatusUseCase;

  beforeEach(() => {
    useCase = new CheckOnboardingStatusUseCase();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return { isComplete: true } when onboardingComplete is true', async () => {
    mockGetSettings.mockReturnValue({ onboardingComplete: true } as any);

    const result = await useCase.execute();

    expect(result).toEqual({ isComplete: true });
  });

  it('should return { isComplete: false } when onboardingComplete is false', async () => {
    mockGetSettings.mockReturnValue({ onboardingComplete: false } as any);

    const result = await useCase.execute();

    expect(result).toEqual({ isComplete: false });
  });
});
