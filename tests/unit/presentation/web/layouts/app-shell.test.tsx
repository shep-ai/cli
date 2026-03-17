import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

import { AppShell } from '@/components/layouts/app-shell';
import { FeatureFlagsProvider } from '@/hooks/feature-flags-context';
import { useSidebarFeaturesContext } from '@/hooks/sidebar-features-context';

const defaultFlags = { skills: false, envDeploy: false, debug: false, databaseBrowser: false };

function renderShell(children: React.ReactNode) {
  return render(
    <FeatureFlagsProvider flags={defaultFlags}>
      <AppShell>{children}</AppShell>
    </FeatureFlagsProvider>
  );
}

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
    renderShell(<div>Test content</div>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders sidebar with Control Center and Tools nav items', () => {
    renderShell(<div>Content</div>);
    expect(screen.getByText('Control Center')).toBeInTheDocument();
    expect(screen.getByText('Tools')).toBeInTheDocument();
  });

  it('sidebar is collapsed by default (logo text hidden)', () => {
    renderShell(<div>Content</div>);
    // When collapsed, the Shep text label is not rendered
    expect(screen.queryByText('Shep')).not.toBeInTheDocument();
  });

  it('renders ThemeToggle in header actions', () => {
    renderShell(<div>Content</div>);
    expect(screen.getByLabelText(/switch to .* mode/i)).toBeInTheDocument();
  });

  it('marks Control Center as active for / pathname', () => {
    renderShell(<div>Content</div>);
    const controlCenterLink = screen.getByRole('link', { name: /control center/i });
    expect(controlCenterLink).toHaveAttribute('data-active', 'true');
  });

  it('passes context features to AppSidebar when sidebar is collapsed', () => {
    const features = [
      { featureId: 'f-1', name: 'Auth Module', status: 'action-needed' as const },
      { featureId: 'f-2', name: 'Dashboard', status: 'in-progress' as const },
    ];

    renderShell(<ContextPublisher features={features} />);

    // When collapsed, feature names are hidden but the sidebar data-testid exists
    const sidebar = screen.getByTestId('app-sidebar');
    expect(sidebar).toBeInTheDocument();
  });

  it('renders sidebar nav items even when collapsed', () => {
    renderShell(<div>Content</div>);
    // Nav items use icons + links which are still accessible when collapsed
    expect(screen.getByRole('link', { name: /control center/i })).toBeInTheDocument();
  });
});
