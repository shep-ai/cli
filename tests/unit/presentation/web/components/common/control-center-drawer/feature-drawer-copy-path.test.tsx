import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureDrawerClient } from '@/components/common/control-center-drawer/feature-drawer-client';
import type { DrawerView } from '@/components/common/control-center-drawer/drawer-view';

// Mock Next.js router and pathname
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/feature/test-id',
}));

// Mock actions
vi.mock('@/app/actions/approve-feature', () => ({
  approveFeature: vi.fn(),
}));

vi.mock('@/app/actions/resume-feature', () => ({
  resumeFeature: vi.fn(),
}));

vi.mock('@/app/actions/start-feature', () => ({
  startFeature: vi.fn(),
}));

vi.mock('@/app/actions/reject-feature', () => ({
  rejectFeature: vi.fn(),
}));

vi.mock('@/app/actions/get-feature-artifact', () => ({
  getFeatureArtifact: vi.fn(),
}));

vi.mock('@/app/actions/get-research-artifact', () => ({
  getResearchArtifact: vi.fn(),
}));

vi.mock('@/app/actions/get-merge-review-data', () => ({
  getMergeReviewData: vi.fn(),
}));

// Mock hooks
vi.mock('@/hooks/feature-flags-context', () => ({
  useFeatureFlags: () => ({
    envDeploy: false,
  }),
}));

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: () => ({
    play: vi.fn(),
    stop: vi.fn(),
    isPlaying: false,
  }),
}));

vi.mock('@/hooks/drawer-close-guard', () => ({
  useGuardedDrawerClose: () => ({
    attemptClose: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-deploy-action', () => ({
  useDeployAction: () => ({
    deploy: vi.fn(),
    stop: vi.fn(),
    deployLoading: false,
    stopLoading: false,
    deployError: null,
    status: null,
    url: null,
  }),
}));

vi.mock('@/hooks/agent-events-provider', () => ({
  useAgentEventsContext: () => ({
    events: [],
  }),
}));

vi.mock('@/hooks/use-feature-logs', () => ({
  useFeatureLogs: () => ({
    content: '',
    isConnected: false,
    error: null,
  }),
}));

vi.mock('@/components/common/feature-drawer/use-feature-actions', () => ({
  useFeatureActions: () => [],
}));

vi.mock('@/components/common/control-center-drawer/use-drawer-sync', () => ({
  useDrawerSync: vi.fn(),
}));

vi.mock('@/components/common/control-center-drawer/use-artifact-fetch', () => ({
  useArtifactFetch: () => false,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('FeatureDrawerClient - Copy Worktree Path', () => {
  let clipboardWriteText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWriteText,
      },
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders copy-path button when worktreePath is available', () => {
    const view: DrawerView = {
      type: 'feature',
      node: {
        name: 'Test Feature',
        description: 'Test description',
        featureId: 'feat-123',
        lifecycle: 'implementation',
        state: 'running',
        progress: 50,
        repositoryPath: '/path/to/repo',
        branch: 'feat/test',
        worktreePath: '/path/to/worktree',
      },
      initialTab: 'overview',
    };

    render(<FeatureDrawerClient view={view} />);

    const copyPathButton = screen.getByTestId('feature-drawer-copy-path');
    expect(copyPathButton).toBeInTheDocument();
  });

  it('does not render copy-path button when worktreePath is not available', () => {
    const view: DrawerView = {
      type: 'feature',
      node: {
        name: 'Test Feature',
        description: 'Test description',
        featureId: 'feat-123',
        lifecycle: 'implementation',
        state: 'running',
        progress: 50,
        repositoryPath: '/path/to/repo',
        branch: 'feat/test',
      },
      initialTab: 'overview',
    };

    render(<FeatureDrawerClient view={view} />);

    const copyPathButton = screen.queryByTestId('feature-drawer-copy-path');
    expect(copyPathButton).not.toBeInTheDocument();
  });

  it('copies worktree path to clipboard when button is clicked', async () => {
    const worktreePath = '/home/user/.shep/repos/abc123/wt/feat-test';
    const view: DrawerView = {
      type: 'feature',
      node: {
        name: 'Test Feature',
        description: 'Test description',
        featureId: 'feat-123',
        lifecycle: 'implementation',
        state: 'running',
        progress: 50,
        repositoryPath: '/path/to/repo',
        branch: 'feat/test',
        worktreePath,
      },
      initialTab: 'overview',
    };

    render(<FeatureDrawerClient view={view} />);

    const copyPathButton = screen.getByTestId('feature-drawer-copy-path');
    fireEvent.click(copyPathButton);

    expect(clipboardWriteText).toHaveBeenCalledWith(worktreePath);
  });

  it('has tooltip showing the worktree path', () => {
    const worktreePath = '/home/user/.shep/repos/abc123/wt/feat-test';
    const view: DrawerView = {
      type: 'feature',
      node: {
        name: 'Test Feature',
        description: 'Test description',
        featureId: 'feat-123',
        lifecycle: 'implementation',
        state: 'running',
        progress: 50,
        repositoryPath: '/path/to/repo',
        branch: 'feat/test',
        worktreePath,
      },
      initialTab: 'overview',
    };

    render(<FeatureDrawerClient view={view} />);

    const copyPathButton = screen.getByTestId('feature-drawer-copy-path');
    expect(copyPathButton).toHaveAttribute('title', worktreePath);
  });
});
