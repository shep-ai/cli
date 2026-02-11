import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { ThemeToggle } from '@/components/common/theme-toggle';

describe('App Layout Integration', () => {
  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Version', href: '/version' },
  ];

  it('renders DashboardLayout with sidebar nav items', () => {
    render(
      <DashboardLayout sidebarItems={navItems} pathname="/" title="Shep AI">
        <div>Page content</div>
      </DashboardLayout>
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('Shep AI')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('renders ThemeToggle in header actions', () => {
    render(
      <DashboardLayout
        sidebarItems={navItems}
        pathname="/"
        title="Shep AI"
        actions={<ThemeToggle />}
      >
        <div>Page content</div>
      </DashboardLayout>
    );
    expect(screen.getByLabelText(/switch to .* mode/i)).toBeInTheDocument();
  });

  it('marks Home as active when pathname is /', () => {
    render(
      <DashboardLayout sidebarItems={navItems} pathname="/" title="Shep AI">
        <div>Content</div>
      </DashboardLayout>
    );
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('aria-current', 'page');
  });

  it('marks Version as active when pathname is /version', () => {
    render(
      <DashboardLayout sidebarItems={navItems} pathname="/version" title="Shep AI">
        <div>Content</div>
      </DashboardLayout>
    );
    const versionLink = screen.getByText('Version').closest('a');
    expect(versionLink).toHaveAttribute('aria-current', 'page');
  });
});
