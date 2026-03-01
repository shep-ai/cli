/* eslint-disable no-console */

/**
 * Debug-gated logger for deployment services.
 *
 * - `info` and `debug` only emit when `process.env.DEBUG` is set.
 * - `warn` and `error` always emit (they indicate real problems).
 */

const noop = () => undefined;

export function createDeploymentLogger(prefix: string) {
  const isDebug = !!process.env.DEBUG;

  return {
    info: isDebug ? (...args: unknown[]) => console.info(prefix, ...args) : noop,
    debug: isDebug ? (...args: unknown[]) => console.debug(prefix, ...args) : noop,
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
  };
}
