import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '@/hooks/useTheme';
import { THEME_STORAGE_KEY } from '@/types/theme';

describe('useTheme', () => {
  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks();
    document.documentElement.classList.remove('light', 'dark');
  });

  it('defaults to system theme', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('system');
  });

  it('loads theme from localStorage', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('dark');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
  });

  it('sets theme and persists to localStorage', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
  });

  it('applies dark class to document when theme is dark', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('dark');

    renderHook(() => useTheme());

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles between light and dark modes', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('light');

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('resolves system theme based on media query', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('system');

    // Mock system preferring dark mode
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const { result } = renderHook(() => useTheme());

    expect(result.current.resolvedTheme).toBe('dark');
  });
});
