import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/layouts/sidebar';

describe('Sidebar', () => {
  const defaultItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', href: '/settings' },
    { label: 'Features', href: '/features' },
  ];

  it('renders nav items with labels', () => {
    render(<Sidebar items={defaultItems} pathname="/dashboard" />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
  });

  it('renders nav item icons when provided', () => {
    const itemsWithIcons = [
      { label: 'Home', href: '/home', icon: <span data-testid="home-icon">H</span> },
      { label: 'Profile', href: '/profile', icon: <span data-testid="profile-icon">P</span> },
    ];

    render(<Sidebar items={itemsWithIcons} pathname="/home" />);

    expect(screen.getByTestId('home-icon')).toBeInTheDocument();
    expect(screen.getByTestId('profile-icon')).toBeInTheDocument();
  });

  it('highlights active nav item based on pathname prop', () => {
    render(<Sidebar items={defaultItems} pathname="/settings" />);

    const settingsLink = screen.getByRole('link', { name: /settings/i });
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });

    expect(settingsLink).toHaveAttribute('aria-current', 'page');
    expect(dashboardLink).not.toHaveAttribute('aria-current', 'page');
  });

  it('handles empty nav items array', () => {
    render(<Sidebar items={[]} pathname="/" />);

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('applies custom className', () => {
    render(<Sidebar items={defaultItems} pathname="/" className="custom-sidebar" />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-sidebar');
  });
});
