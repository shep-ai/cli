import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarCollapseToggle } from '@/components/common/sidebar-collapse-toggle';

/* ------------------------------------------------------------------ */
/*  Mock useSidebar                                                    */
/* ------------------------------------------------------------------ */

const mockToggleSidebar = vi.fn();
let mockOpen = true;

vi.mock('@/components/ui/sidebar', () => ({
  useSidebar: () => ({ toggleSidebar: mockToggleSidebar, open: mockOpen }),
}));

/* ------------------------------------------------------------------ */
/*  Mock useSoundAction                                                */
/* ------------------------------------------------------------------ */

const mockExpandPlay = vi.fn();
const mockCollapsePlay = vi.fn();

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: vi.fn((action: string) => {
    if (action === 'expand') return { play: mockExpandPlay, stop: vi.fn(), isPlaying: false };
    if (action === 'collapse') return { play: mockCollapsePlay, stop: vi.fn(), isPlaying: false };
    return { play: vi.fn(), stop: vi.fn(), isPlaying: false };
  }),
}));

describe('SidebarCollapseToggle — sound effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpen = true;
  });

  it('plays collapse sound when sidebar is open and being collapsed', async () => {
    const user = userEvent.setup();
    mockOpen = true;

    render(<SidebarCollapseToggle />);

    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));

    expect(mockCollapsePlay).toHaveBeenCalledOnce();
    expect(mockExpandPlay).not.toHaveBeenCalled();
    expect(mockToggleSidebar).toHaveBeenCalledOnce();
  });

  it('plays expand sound when sidebar is closed and being expanded', async () => {
    const user = userEvent.setup();
    mockOpen = false;

    render(<SidebarCollapseToggle />);

    await user.click(screen.getByRole('button', { name: /expand sidebar/i }));

    expect(mockExpandPlay).toHaveBeenCalledOnce();
    expect(mockCollapsePlay).not.toHaveBeenCalled();
    expect(mockToggleSidebar).toHaveBeenCalledOnce();
  });
});
