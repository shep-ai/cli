/**
 * Feature flags for the web UI.
 *
 * Resolution order (highest precedence first):
 *   1. Environment variable (NEXT_PUBLIC_ prefix) — deployment-level override
 *   2. Persisted Settings singleton (experimental.*) — user-facing control
 *   3. Default false — safe fallback
 *
 * Env vars are useful for CI, staging, and Docker overrides.
 * Persisted settings are the default user-facing control surface managed
 * via CLI (`shep settings experimental`) or the web UI toggle panel.
 */

import { hasSettings, getSettings } from '@shepai/core/infrastructure/services/settings.service';

/**
 * Parse an environment variable as a boolean, returning `undefined`
 * when the variable is not set or not a recognised boolean string.
 */
function isEnvEnabled(envVar: string | undefined): boolean | undefined {
  if (envVar === 'true' || envVar === '1') return true;
  if (envVar === 'false' || envVar === '0') return false;
  return undefined;
}

/**
 * Resolve feature flags using the three-tier precedence:
 *   env var → persisted settings → default false.
 */
export function getFeatureFlags(): { skills: boolean } {
  const envSkills = isEnvEnabled(process.env.NEXT_PUBLIC_FLAG_SKILLS);
  if (envSkills !== undefined) return { skills: envSkills };

  if (hasSettings()) {
    const settings = getSettings();
    return { skills: settings.experimental.skills };
  }

  return { skills: false };
}
