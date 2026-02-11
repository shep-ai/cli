/**
 * Mock for next/navigation used in Storybook (no Next.js router).
 * Provides usePathname and other navigation hooks so layout components render.
 */
export function usePathname(): string {
  return '/';
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

function noop(): void {
  /* mock no-op */
}

export function useRouter() {
  return {
    push: noop,
    replace: noop,
    refresh: noop,
    back: noop,
    forward: noop,
    prefetch: noop,
  };
}
