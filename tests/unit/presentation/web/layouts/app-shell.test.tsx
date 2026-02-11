import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

import { AppShell } from '@/components/layouts/app-shell';

describe('AppShell', () => {
  it('renders children within the dashboard layout', () => {
    render(
      <AppShell>
        <div>Test content</div>
      </AppShell>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders sidebar with Home and Version nav items', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
  });

  it('renders the Shep AI title in header', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );
    expect(screen.getByText('Shep AI')).toBeInTheDocument();
  });

  it('renders ThemeToggle in header actions', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );
    expect(screen.getByLabelText(/switch to .* mode/i)).toBeInTheDocument();
  });

  it('marks Home as active for / pathname', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('aria-current', 'page');
  });
});
