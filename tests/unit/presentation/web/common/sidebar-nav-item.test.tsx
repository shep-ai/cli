import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarNavItem } from '@/components/common/sidebar-nav-item';
import { Home } from 'lucide-react';

function renderWithSidebar(ui: React.ReactElement) {
  return render(<SidebarProvider>{ui}</SidebarProvider>);
}

describe('SidebarNavItem', () => {
  it('renders label text', () => {
    renderWithSidebar(<SidebarNavItem icon={Home} label="Dashboard" href="/dashboard" />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders icon element', () => {
    renderWithSidebar(<SidebarNavItem icon={Home} label="Dashboard" href="/dashboard" />);

    // Lucide icons render as SVGs
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('applies active styling when active prop is true', () => {
    renderWithSidebar(<SidebarNavItem icon={Home} label="Dashboard" href="/dashboard" active />);

    const button = screen.getByRole('link', { name: /dashboard/i });
    expect(button).toHaveAttribute('data-active', 'true');
  });

  it('renders as a link with correct href', () => {
    renderWithSidebar(<SidebarNavItem icon={Home} label="Settings" href="/settings" />);

    const link = screen.getByRole('link', { name: /settings/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/settings');
  });
});
