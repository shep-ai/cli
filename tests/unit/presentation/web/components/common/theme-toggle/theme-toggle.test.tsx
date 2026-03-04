import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '@/components/common/theme-toggle';

/* ------------------------------------------------------------------ */
/*  Mock useTheme                                                      */
/* ------------------------------------------------------------------ */

const mockSetTheme = vi.fn();
let mockTheme = 'light';
let mockResolvedTheme: 'light' | 'dark' = 'light';

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: mockTheme,
    resolvedTheme: mockResolvedTheme,
    setTheme: mockSetTheme,
  }),
}));

/* ------------------------------------------------------------------ */
/*  Mock useSoundAction                                                */
/* ------------------------------------------------------------------ */

const mockToggleOnPlay = vi.fn();
const mockToggleOffPlay = vi.fn();

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: vi.fn((action: string) => {
    if (action === 'toggle-on') return { play: mockToggleOnPlay, stop: vi.fn(), isPlaying: false };
    if (action === 'toggle-off')
      return { play: mockToggleOffPlay, stop: vi.fn(), isPlaying: false };
    return { play: vi.fn(), stop: vi.fn(), isPlaying: false };
  }),
}));

/* ------------------------------------------------------------------ */
/*  Coordinate injection tests                                         */
/* ------------------------------------------------------------------ */

describe('ThemeToggle — coordinate injection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = 'light';
    mockResolvedTheme = 'light';
  });

  it('sets --x and --y CSS custom properties from click coordinates when API is available', async () => {
    const user = userEvent.setup();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).startViewTransition = vi.fn((cb: () => void) => cb());
    const setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty');

    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));

    expect(setPropertySpy).toHaveBeenCalledWith('--x', expect.stringContaining('px'));
    expect(setPropertySpy).toHaveBeenCalledWith('--y', expect.stringContaining('px'));

    setPropertySpy.mockRestore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (document as any).startViewTransition;
  });
});

/* ------------------------------------------------------------------ */
/*  View transition tests                                              */
/* ------------------------------------------------------------------ */

describe('ThemeToggle — view transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = 'light';
    mockResolvedTheme = 'light';
  });

  afterEach(() => {
    // Clean up startViewTransition if it was set
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (document as any).startViewTransition;
    vi.restoreAllMocks();
  });

  it('calls document.startViewTransition on click when API is available', async () => {
    const user = userEvent.setup();
    const mockStartViewTransition = vi.fn((cb: () => void) => cb());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).startViewTransition = mockStartViewTransition;

    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));

    expect(mockStartViewTransition).toHaveBeenCalledOnce();
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme directly when startViewTransition is undefined', async () => {
    const user = userEvent.setup();
    // startViewTransition not set on document in jsdom — falls back to direct setTheme

    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme directly when prefers-reduced-motion is active', async () => {
    const user = userEvent.setup();
    const mockStartViewTransition = vi.fn((cb: () => void) => cb());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).startViewTransition = mockStartViewTransition;
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);

    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));

    expect(mockStartViewTransition).not.toHaveBeenCalled();
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });
});

/* ------------------------------------------------------------------ */
/*  Sound effects                                                      */
/* ------------------------------------------------------------------ */

describe('ThemeToggle — sound effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = 'light';
    mockResolvedTheme = 'light';
  });

  it('plays toggle-on sound when switching to dark mode', async () => {
    const user = userEvent.setup();
    mockTheme = 'light';
    mockResolvedTheme = 'light';

    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));

    expect(mockToggleOnPlay).toHaveBeenCalledOnce();
    expect(mockToggleOffPlay).not.toHaveBeenCalled();
  });

  it('plays toggle-off sound when switching to light mode', async () => {
    const user = userEvent.setup();
    mockTheme = 'dark';
    mockResolvedTheme = 'dark';

    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: /switch to light mode/i }));

    expect(mockToggleOffPlay).toHaveBeenCalledOnce();
    expect(mockToggleOnPlay).not.toHaveBeenCalled();
  });

  it('plays toggle-on sound when system theme is light and toggling to dark', async () => {
    const user = userEvent.setup();
    mockTheme = 'system';
    mockResolvedTheme = 'light';

    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));

    expect(mockToggleOnPlay).toHaveBeenCalledOnce();
    expect(mockToggleOffPlay).not.toHaveBeenCalled();
  });
});
