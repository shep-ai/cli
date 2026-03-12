/**
 * Platform detection constants.
 *
 * Evaluated once at module load — safe to use in hot paths.
 */

export const IS_WINDOWS = process.platform === 'win32';
