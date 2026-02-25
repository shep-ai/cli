import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Clean up after each test to prevent multiple elements from accumulating
afterEach(() => {
  cleanup();
});

// Mock localStorage for tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock ResizeObserver for Radix UI components (tooltips, popovers, etc.)
// Must use a class so it can be called with `new`
globalThis.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as unknown as typeof globalThis.ResizeObserver;

// Mock DOM methods for Radix UI Select (jsdom doesn't implement these)
// Guard with typeof check — Element is unavailable in node environment
if (typeof Element !== 'undefined') {
  if (typeof Element.prototype.hasPointerCapture === 'undefined') {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (typeof Element.prototype.setPointerCapture === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    Element.prototype.setPointerCapture = () => {};
  }
  if (typeof Element.prototype.releasePointerCapture === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    Element.prototype.releasePointerCapture = () => {};
  }
  if (typeof Element.prototype.scrollIntoView === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    Element.prototype.scrollIntoView = () => {};
  }
}

// Mock matchMedia for theme tests
Object.defineProperty(globalThis.window ?? globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
