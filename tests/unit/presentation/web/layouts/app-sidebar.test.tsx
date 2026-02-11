import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layouts/app-sidebar';

function renderWithSidebar(ui: React.ReactElement) {
  return render(<SidebarProvider>{ui}</SidebarProvider>);
}

const mockFeatures = [
  { name: 'Auth Module', status: 'action-needed' as const },
  { name: 'Dashboard', status: 'in-progress' as const, startedAt: Date.now() - 330_000 },
  { name: 'Settings Page', status: 'done' as const, duration: '2h' },
  { name: 'API Gateway', status: 'in-progress' as const, startedAt: Date.now() - 60_000 },
  { name: 'User Profile', status: 'done' as const, duration: '1h' },
];

describe('AppSidebar', () => {
  it('renders Control Center nav item in header', () => {
    renderWithSidebar(<AppSidebar features={mockFeatures} />);

    expect(screen.getByText('Control Center')).toBeInTheDocument();
  });

  it('renders Memory nav item in header', () => {
    renderWithSidebar(<AppSidebar features={mockFeatures} />);

    expect(screen.getByText('Memory')).toBeInTheDocument();
  });

  it('renders Features label in content', () => {
    renderWithSidebar(<AppSidebar features={mockFeatures} />);

    expect(screen.getByText('Features')).toBeInTheDocument();
  });

  it('groups features by status into Action Needed, In Progress, and Done sections', () => {
    renderWithSidebar(<AppSidebar features={mockFeatures} />);

    // Status group labels should be present
    expect(screen.getByText('Action Needed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();

    // Feature names should be rendered
    expect(screen.getByText('Auth Module')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings Page')).toBeInTheDocument();
  });

  it('renders New feature button in footer', () => {
    renderWithSidebar(<AppSidebar features={mockFeatures} />);

    expect(screen.getByRole('button', { name: /new feature/i })).toBeInTheDocument();
  });

  it('fires onNewFeature callback when button is clicked', async () => {
    const handleNewFeature = vi.fn();
    const user = userEvent.setup();

    renderWithSidebar(<AppSidebar features={mockFeatures} onNewFeature={handleNewFeature} />);

    await user.click(screen.getByRole('button', { name: /new feature/i }));

    expect(handleNewFeature).toHaveBeenCalledOnce();
  });
});
