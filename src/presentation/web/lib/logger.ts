/* eslint-disable no-console */
const isDebug = !!process.env.NEXT_PUBLIC_DEBUG;
const noop = () => undefined;

export function createLogger(prefix: string) {
  return {
    info: isDebug ? (...args: unknown[]) => console.info(prefix, ...args) : noop,
    debug: isDebug ? (...args: unknown[]) => console.debug(prefix, ...args) : noop,
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
  };
}
