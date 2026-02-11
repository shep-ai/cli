import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

describe('DashboardLayout', () => {
  const defaultItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', href: '/settings' },
  ];

  it('renders sidebar with provided items', () => {
    render(
      <DashboardLayout sidebarItems={defaultItems} pathname="/dashboard" title="Page Title">
        <p>Content</p>
      </DashboardLayout>
    );

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders header with provided title', () => {
    render(
      <DashboardLayout sidebarItems={defaultItems} pathname="/dashboard" title="My Dashboard">
        <p>Content</p>
      </DashboardLayout>
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('My Dashboard')).toBeInTheDocument();
  });

  it('renders children in main content area', () => {
    render(
      <DashboardLayout sidebarItems={defaultItems} pathname="/dashboard" title="Dashboard">
        <p data-testid="content">Hello World</p>
      </DashboardLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('passes actions to header', () => {
    render(
      <DashboardLayout
        sidebarItems={defaultItems}
        pathname="/dashboard"
        title="Dashboard"
        actions={<button data-testid="action">Action</button>}
      >
        <p>Content</p>
      </DashboardLayout>
    );

    expect(screen.getByTestId('action')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <DashboardLayout
        sidebarItems={defaultItems}
        pathname="/dashboard"
        title="Dashboard"
        className="custom-layout"
      >
        <p>Content</p>
      </DashboardLayout>
    );

    expect(container.firstChild).toHaveClass('custom-layout');
  });

  it('has proper semantic structure (aside for sidebar, main for content)', () => {
    render(
      <DashboardLayout sidebarItems={defaultItems} pathname="/dashboard" title="Dashboard">
        <p>Content</p>
      </DashboardLayout>
    );

    const aside = screen.getByRole('complementary');
    expect(aside).toBeInTheDocument();

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });
});
