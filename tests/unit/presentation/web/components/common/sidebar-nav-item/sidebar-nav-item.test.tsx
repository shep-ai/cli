import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from 'lucide-react';
import { SidebarNavItem } from '@/components/common/sidebar-nav-item';

/* ------------------------------------------------------------------ */
/*  Mock sidebar provider                                              */
/* ------------------------------------------------------------------ */

vi.mock('@/components/ui/sidebar', () => ({
  SidebarMenuItem: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <li {...props}>{children}</li>
  ),
  SidebarMenuButton: ({
    children,
    asChild,
    ...props
  }: React.PropsWithChildren<{ asChild?: boolean } & Record<string, unknown>>) =>
    asChild ? <>{children}</> : <button {...props}>{children}</button>,
}));

/* ------------------------------------------------------------------ */
/*  Mock useSoundAction                                                */
/* ------------------------------------------------------------------ */

const mockNavigatePlay = vi.fn();

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: vi.fn((action: string) => {
    if (action === 'navigate') return { play: mockNavigatePlay, stop: vi.fn(), isPlaying: false };
    return { play: vi.fn(), stop: vi.fn(), isPlaying: false };
  }),
}));

describe('SidebarNavItem — sound effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('plays navigate sound when nav item is clicked', async () => {
    const user = userEvent.setup();

    render(<SidebarNavItem icon={Home} label="Dashboard" href="/dashboard" />);

    await user.click(screen.getByRole('link', { name: /dashboard/i }));

    expect(mockNavigatePlay).toHaveBeenCalledOnce();
  });
});
