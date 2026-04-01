import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layouts/app-sidebar';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Mock fetch for /api/version and /api/npm-version (used by VersionBadge and useVersion)
  globalThis.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/version')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            version: '1.101.0',
            packageName: '@shepai/cli',
            description: 'Test',
            branch: '',
            commitHash: '',
            instancePath: '',
            isDev: false,
          }),
      });
    }
    if (url.includes('/api/npm-version')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ latest: '1.101.0' }),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const defaultFlags = {
  skills: true,
  envDeploy: false,
  debug: false,
  githubImport: false,
  adoptBranch: false,
  gitRebaseSync: false,
  reactFileManager: false,
};

function renderWithSidebar(ui: React.ReactElement) {
  return render(<SidebarProvider>{ui}</SidebarProvider>);
}

const mockFeatures = [
  {
    featureId: 'feat-auth-001',
    name: 'Auth Module',
    status: 'action-needed' as const,
    repositoryPath: '/home/user/projects/my-app',
    repositoryName: 'my-app',
  },
  {
    featureId: 'feat-dashboard-002',
    name: 'Dashboard',
    status: 'in-progress' as const,
    startedAt: Date.now() - 330_000,
    repositoryPath: '/home/user/projects/my-app',
    repositoryName: 'my-app',
  },
  {
    featureId: 'feat-settings-003',
    name: 'Settings Page',
    status: 'done' as const,
    duration: '2h',
    repositoryPath: '/home/user/projects/my-app',
    repositoryName: 'my-app',
  },
  {
    featureId: 'feat-api-004',
    name: 'API Gateway',
    status: 'in-progress' as const,
    startedAt: Date.now() - 60_000,
    repositoryPath: '/home/user/projects/my-app',
    repositoryName: 'my-app',
  },
  {
    featureId: 'feat-profile-005',
    name: 'User Profile',
    status: 'done' as const,
    duration: '1h',
    repositoryPath: '/home/user/projects/my-app',
    repositoryName: 'my-app',
  },
];

describe('AppSidebar', () => {
  it('renders Control Center nav item in header', () => {
    renderWithSidebar(<AppSidebar features={mockFeatures} featureFlags={defaultFlags} />);

    expect(screen.getByText('Control Center')).toBeInTheDocument();
  });

  it('renders Tools nav item in header', () => {
    renderWithSidebar(<AppSidebar features={mockFeatures} featureFlags={defaultFlags} />);

    expect(screen.getByText('Tools')).toBeInTheDocument();
  });

  it('renders Features label in content', () => {
    renderWithSidebar(<AppSidebar features={mockFeatures} featureFlags={defaultFlags} />);

    expect(screen.getByText('Features')).toBeInTheDocument();
  });

  it('groups features by status into Action Needed, In Progress, and Done sections', () => {
    renderWithSidebar(<AppSidebar features={mockFeatures} featureFlags={defaultFlags} />);

    // Status group labels should be present
    expect(screen.getByText('Action Needed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();

    // Feature names should be rendered
    expect(screen.getByText('Auth Module')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings Page')).toBeInTheDocument();
  });

  it('fires onFeatureClick with featureId when a feature is clicked', async () => {
    const handleFeatureClick = vi.fn();
    const user = userEvent.setup();

    renderWithSidebar(
      <AppSidebar
        features={mockFeatures}
        featureFlags={defaultFlags}
        onFeatureClick={handleFeatureClick}
      />
    );

    await user.click(screen.getByText('Auth Module'));

    expect(handleFeatureClick).toHaveBeenCalledOnce();
    expect(handleFeatureClick).toHaveBeenCalledWith('feat-auth-001');
  });

  it('renders Settings nav item in header linking to /settings', () => {
    renderWithSidebar(<AppSidebar features={mockFeatures} featureFlags={defaultFlags} />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('does not show repo groups when there is only one repository', () => {
    renderWithSidebar(<AppSidebar features={mockFeatures} featureFlags={defaultFlags} />);

    // Should not render repo group headers for single repo
    expect(screen.queryByTestId('repo-group')).not.toBeInTheDocument();
  });

  it('shows repo groups when there are multiple repositories', () => {
    const multiRepoFeatures = [
      {
        featureId: 'feat-auth-001',
        name: 'Auth Module',
        status: 'action-needed' as const,
        repositoryPath: '/home/user/projects/frontend',
        repositoryName: 'frontend',
      },
      {
        featureId: 'feat-api-002',
        name: 'API Gateway',
        status: 'in-progress' as const,
        startedAt: Date.now() - 60_000,
        repositoryPath: '/home/user/projects/backend',
        repositoryName: 'backend',
      },
      {
        featureId: 'feat-settings-003',
        name: 'Settings Page',
        status: 'done' as const,
        duration: '2h',
        repositoryPath: '/home/user/projects/frontend',
        repositoryName: 'frontend',
      },
    ];

    renderWithSidebar(<AppSidebar features={multiRepoFeatures} featureFlags={defaultFlags} />);

    // Repo group headers should appear
    const repoGroups = screen.getAllByTestId('repo-group');
    expect(repoGroups).toHaveLength(2);

    // Repo names should be visible
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('backend')).toBeInTheDocument();

    // Features should still be visible
    expect(screen.getByText('Auth Module')).toBeInTheDocument();
    expect(screen.getByText('API Gateway')).toBeInTheDocument();
    expect(screen.getByText('Settings Page')).toBeInTheDocument();
  });
});
