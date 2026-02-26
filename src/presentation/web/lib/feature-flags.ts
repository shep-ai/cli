/**
 * Feature flags for the web UI.
 *
 * Toggle via environment variables (NEXT_PUBLIC_ prefix for client access).
 * All flags default to **off** unless explicitly set to "true" or "1".
 */

function isEnabled(envVar: string | undefined): boolean {
  return envVar === 'true' || envVar === '1';
}

export const featureFlags = {
  skills: isEnabled(process.env.NEXT_PUBLIC_FLAG_SKILLS),
  envDeploy: isEnabled(process.env.NEXT_PUBLIC_FLAG_ENV_DEPLOY),
} as const;
