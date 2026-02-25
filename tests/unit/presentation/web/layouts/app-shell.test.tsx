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

  it('renders sidebar with Control Center and Tools nav items', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );
    expect(screen.getByText('Control Center')).toBeInTheDocument();
    expect(screen.getByText('Tools')).toBeInTheDocument();
  });

  it('renders Shep logo in sidebar', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );
    expect(screen.getByText('Shep')).toBeInTheDocument();
  });

  it('renders ThemeToggle in header actions', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );
    expect(screen.getByLabelText(/switch to .* mode/i)).toBeInTheDocument();
  });

  it('marks Control Center as active for / pathname', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );
    const controlCenterLink = screen.getByRole('link', { name: /control center/i });
    expect(controlCenterLink).toHaveAttribute('data-active', 'true');
  });
});
