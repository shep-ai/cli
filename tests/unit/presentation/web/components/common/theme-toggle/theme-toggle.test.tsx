import { describe, it, expect, vi, beforeEach } from 'vitest';
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
