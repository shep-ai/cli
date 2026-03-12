// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHasSettings = vi.fn();
const mockGetSettings = vi.fn();

vi.mock('@shepai/core/infrastructure/services/settings.service', () => ({
  hasSettings: () => mockHasSettings(),
  getSettings: () => mockGetSettings(),
}));

const { getFeatureFlags, featureFlags } = await import(
  '../../../../../src/presentation/web/lib/feature-flags.js'
);

describe('getFeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_FLAG_SKILLS;
    delete process.env.NEXT_PUBLIC_FLAG_ENV_DEPLOY;
    delete process.env.NEXT_PUBLIC_FLAG_CHAT;
  });

  it('returns DB values when settings has featureFlags', () => {
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      featureFlags: { skills: true, envDeploy: false, debug: true, chat: false },
    });

    const flags = getFeatureFlags();

    expect(flags.skills).toBe(true);
    expect(flags.envDeploy).toBe(false);
    expect(flags.debug).toBe(true);
    expect(flags.chat).toBe(false);
  });

  it('falls back to env vars when featureFlags is undefined', () => {
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({});
    process.env.NEXT_PUBLIC_FLAG_SKILLS = 'true';
    process.env.NEXT_PUBLIC_FLAG_ENV_DEPLOY = '1';

    const flags = getFeatureFlags();

    expect(flags.skills).toBe(true);
    expect(flags.envDeploy).toBe(true);
    expect(flags.debug).toBe(false); // debug has no env var fallback
    expect(flags.chat).toBe(true); // chat defaults to true
  });

  it('falls back to env vars when settings not initialized', () => {
    mockHasSettings.mockReturnValue(false);
    process.env.NEXT_PUBLIC_FLAG_SKILLS = 'true';

    const flags = getFeatureFlags();

    expect(flags.skills).toBe(true);
    expect(flags.envDeploy).toBe(true);
    expect(flags.debug).toBe(false);
    expect(flags.chat).toBe(true);
  });

  it('falls back to env vars when hasSettings throws', () => {
    mockHasSettings.mockImplementation(() => {
      throw new Error('Not available');
    });
    process.env.NEXT_PUBLIC_FLAG_SKILLS = '1';

    const flags = getFeatureFlags();

    expect(flags.skills).toBe(true);
    expect(flags.debug).toBe(false);
    expect(flags.chat).toBe(true);
  });

  it('defaults envDeploy to true when no settings and no env vars', () => {
    mockHasSettings.mockReturnValue(false);
    delete process.env.NEXT_PUBLIC_FLAG_SKILLS;
    delete process.env.NEXT_PUBLIC_FLAG_ENV_DEPLOY;

    const flags = getFeatureFlags();

    expect(flags.skills).toBe(false);
    expect(flags.envDeploy).toBe(true);
    expect(flags.debug).toBe(false);
    expect(flags.chat).toBe(true);
  });

  it('debug flag returns false when not in DB (no env var fallback)', () => {
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      featureFlags: { skills: false, envDeploy: false, debug: false, chat: true },
    });

    const flags = getFeatureFlags();

    expect(flags.debug).toBe(false);
  });

  it('defaults chat to true when no settings and no env vars', () => {
    mockHasSettings.mockReturnValue(false);

    const flags = getFeatureFlags();

    expect(flags.chat).toBe(true);
  });

  it('respects NEXT_PUBLIC_FLAG_CHAT=false env var override', () => {
    mockHasSettings.mockReturnValue(false);
    process.env.NEXT_PUBLIC_FLAG_CHAT = 'false';

    const flags = getFeatureFlags();

    expect(flags.chat).toBe(false);
  });
});

describe('featureFlags (backward-compatible const)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes skills via getter that calls getFeatureFlags', () => {
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      featureFlags: { skills: true, envDeploy: false, debug: false, chat: true },
    });

    expect(featureFlags.skills).toBe(true);
  });

  it('exposes envDeploy via getter', () => {
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      featureFlags: { skills: false, envDeploy: true, debug: false, chat: true },
    });

    expect(featureFlags.envDeploy).toBe(true);
  });

  it('exposes debug via getter', () => {
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      featureFlags: { skills: false, envDeploy: false, debug: true, chat: true },
    });

    expect(featureFlags.debug).toBe(true);
  });

  it('exposes chat via getter', () => {
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue({
      featureFlags: { skills: false, envDeploy: false, debug: false, chat: true },
    });

    expect(featureFlags.chat).toBe(true);
  });
});
