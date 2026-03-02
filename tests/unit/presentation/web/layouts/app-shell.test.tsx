import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

import { AppShell } from '@/components/layouts/app-shell';
import { useSidebarFeaturesContext } from '@/hooks/sidebar-features-context';

/**
 * A child component that publishes features into the SidebarFeaturesContext.
 * This simulates what ControlCenterInner does in production — it writes
 * sidebar features into the context so AppShellInner can pass them to AppSidebar.
 */
function ContextPublisher({
  features,
}: {
  features: { featureId: string; name: string; status: 'action-needed' | 'in-progress' | 'done' }[];
}) {
  const { setFeatures } = useSidebarFeaturesContext();
  useEffect(() => {
    setFeatures(features);
  }, [features, setFeatures]);
  return null;
}

describe('AppShell', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

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

  it('passes context features to AppSidebar when a child publishes them', () => {
    const features = [
      { featureId: 'f-1', name: 'Auth Module', status: 'action-needed' as const },
      { featureId: 'f-2', name: 'Dashboard', status: 'in-progress' as const },
    ];

    render(
      <AppShell>
        <ContextPublisher features={features} />
      </AppShell>
    );

    expect(screen.getByText('Auth Module')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('navigates to feature route when sidebar feature is clicked', async () => {
    const user = userEvent.setup();
    const features = [
      { featureId: 'f-42', name: 'Click Target', status: 'action-needed' as const },
    ];

    render(
      <AppShell>
        <ContextPublisher features={features} />
      </AppShell>
    );

    await user.click(screen.getByText('Click Target'));

    expect(mockPush).toHaveBeenCalledWith('/feature/f-42');
  });
});
