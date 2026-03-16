import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';
import { OverviewTab } from '@/components/common/feature-drawer-tabs/overview-tab';
import type { FeatureNodeData } from '@/components/common/feature-node';

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: vi.fn(() => ({ play: vi.fn(), stop: vi.fn(), isPlaying: false })),
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

vi.mock('@/components/common/deployment-status-badge', () => ({
  DeploymentStatusBadge: ({ status }: { status: string | null }) =>
    status ? <div data-testid="deployment-status-badge" data-status={status} /> : null,
}));

const defaultData: FeatureNodeData = {
  name: 'Auth Module',
  description: 'Implement OAuth2 authentication flow',
  featureId: '#f1',
  lifecycle: 'implementation',
  state: 'running',
  progress: 45,
  agentType: 'claude-code',
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/auth-module',
};

function renderOverviewTab(data: FeatureNodeData = defaultData) {
  return render(<OverviewTab data={data} />);
}

describe('OverviewTab', () => {
  describe('progress bar', () => {
    it('renders progress bar when progress > 0', () => {
      renderOverviewTab({ ...defaultData, progress: 60 });
      expect(screen.getByTestId('feature-drawer-progress')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('does not render progress bar when progress is 0', () => {
      renderOverviewTab({ ...defaultData, progress: 0 });
      expect(screen.queryByTestId('feature-drawer-progress')).not.toBeInTheDocument();
    });

    it('does not render progress bar when lifecycle is maintain (completed)', () => {
      renderOverviewTab({ ...defaultData, lifecycle: 'maintain', state: 'done', progress: 100 });
      expect(screen.queryByTestId('feature-drawer-progress')).not.toBeInTheDocument();
    });
  });

  describe('PR info', () => {
    const prData: FeatureNodeData['pr'] = {
      url: 'https://github.com/org/repo/pull/42',
      number: 42,
      status: PrStatus.Merged,
      ciStatus: CiStatus.Success,
      commitHash: 'abc1234567890',
    };

    it('renders PR info when PR exists', () => {
      renderOverviewTab({ ...defaultData, pr: prData });
      expect(screen.getByTestId('feature-drawer-pr')).toBeInTheDocument();
    });

    it('does not render PR info when PR is undefined', () => {
      renderOverviewTab({ ...defaultData, pr: undefined });
      expect(screen.queryByTestId('feature-drawer-pr')).not.toBeInTheDocument();
    });

    it('displays PR number as link', () => {
      renderOverviewTab({ ...defaultData, pr: prData });
      const link = screen.getByRole('link', { name: /PR #42/i });
      expect(link).toHaveAttribute('href', 'https://github.com/org/repo/pull/42');
    });

    it('renders PR info inside status section when lifecycle is maintain (completed)', () => {
      renderOverviewTab({
        ...defaultData,
        lifecycle: 'maintain',
        state: 'done',
        progress: 100,
        pr: prData,
      });
      const statusSection = screen.getByTestId('feature-drawer-status');
      const prInfo = screen.getByTestId('feature-drawer-pr');
      expect(statusSection.contains(prInfo)).toBe(true);
    });

    it('renders PR info outside status section when lifecycle is not maintain', () => {
      renderOverviewTab({
        ...defaultData,
        lifecycle: 'implementation',
        state: 'running',
        progress: 50,
        pr: prData,
      });
      const statusSection = screen.getByTestId('feature-drawer-status');
      const prInfo = screen.getByTestId('feature-drawer-pr');
      expect(statusSection.contains(prInfo)).toBe(false);
    });

    it('renders merge conflict badge when mergeable is false', () => {
      renderOverviewTab({
        ...defaultData,
        pr: { ...prData, mergeable: false },
      });
      const conflictBadge = screen.getByTestId('pr-merge-conflict');
      expect(conflictBadge).toBeInTheDocument();
      expect(screen.getByText('Conflicts')).toBeInTheDocument();
    });

    it('does not render merge conflict badge when mergeable is true', () => {
      renderOverviewTab({
        ...defaultData,
        pr: { ...prData, mergeable: true },
      });
      expect(screen.queryByTestId('pr-merge-conflict')).not.toBeInTheDocument();
    });

    it('does not render merge conflict badge when mergeable is undefined', () => {
      renderOverviewTab({
        ...defaultData,
        pr: { ...prData, mergeable: undefined },
      });
      expect(screen.queryByTestId('pr-merge-conflict')).not.toBeInTheDocument();
    });
  });

  describe('inline attachments in user query', () => {
    it('renders inline attachment image when userQuery contains @/path reference', () => {
      renderOverviewTab({
        ...defaultData,
        userQuery: 'Fix this bug @/home/user/.shep/attachments/pending-abc/screenshot.png',
      });
      expect(screen.getByTestId('inline-attachment-image')).toBeInTheDocument();
    });

    it('renders plain text when userQuery has no attachment references', () => {
      renderOverviewTab({
        ...defaultData,
        userQuery: 'Just a simple text query',
      });
      expect(screen.getByText('Just a simple text query')).toBeInTheDocument();
      expect(screen.queryByTestId('inline-attachment-image')).not.toBeInTheDocument();
    });
  });

  describe('duplicate summary hiding', () => {
    it('hides summary when it matches userQuery exactly', () => {
      renderOverviewTab({
        ...defaultData,
        userQuery: 'fix the login bug',
        summary: 'fix the login bug',
      });
      expect(screen.getByText('User Query')).toBeInTheDocument();
      expect(screen.queryByText('Summary')).not.toBeInTheDocument();
    });

    it('hides summary when it matches userQuery after trimming whitespace', () => {
      renderOverviewTab({
        ...defaultData,
        userQuery: '  fix the login bug  ',
        summary: 'fix the login bug',
      });
      expect(screen.getByText('User Query')).toBeInTheDocument();
      expect(screen.queryByText('Summary')).not.toBeInTheDocument();
    });

    it('shows summary when it differs from userQuery', () => {
      renderOverviewTab({
        ...defaultData,
        userQuery: 'fix the login bug',
        summary: 'Resolved authentication issue in login handler by fixing token validation',
      });
      expect(screen.getByText('User Query')).toBeInTheDocument();
      expect(screen.getByText('Summary')).toBeInTheDocument();
    });

    it('shows summary when userQuery is not present', () => {
      renderOverviewTab({
        ...defaultData,
        userQuery: undefined,
        summary: 'Some summary text',
      });
      expect(screen.getByText('Summary')).toBeInTheDocument();
    });
  });

  describe('details section', () => {
    it('renders details section with agent type', () => {
      renderOverviewTab({ ...defaultData, agentType: 'cursor' });
      expect(screen.getByText('Agent')).toBeInTheDocument();
      expect(screen.getByText('Cursor')).toBeInTheDocument();
    });

    it('renders details section with runtime', () => {
      renderOverviewTab({ ...defaultData, runtime: '2h 15m' });
      expect(screen.getByText('Runtime')).toBeInTheDocument();
      expect(screen.getByText('2h 15m')).toBeInTheDocument();
    });

    it('renders blocked by info', () => {
      renderOverviewTab({ ...defaultData, state: 'blocked', blockedBy: 'Payment Service' });
      expect(screen.getByText('Blocked by')).toBeInTheDocument();
      expect(screen.getByText('Payment Service')).toBeInTheDocument();
    });

    it('renders error message', () => {
      renderOverviewTab({
        ...defaultData,
        state: 'error',
        errorMessage: 'Build failed: type mismatch',
      });
      expect(screen.getByTestId('feature-drawer-details')).toBeInTheDocument();
      expect(screen.getByText('Build failed: type mismatch')).toBeInTheDocument();
    });

    it('hides details section when no optional detail fields are set', () => {
      renderOverviewTab({
        ...defaultData,
        agentType: undefined,
        runtime: undefined,
        blockedBy: undefined,
        errorMessage: undefined,
      });
      expect(screen.queryByTestId('feature-drawer-details')).not.toBeInTheDocument();
    });
  });

  describe('settings section', () => {
    it('renders settings section when approval gates are provided', () => {
      renderOverviewTab({
        ...defaultData,
        approvalGates: { allowPrd: true, allowPlan: false, allowMerge: true },
      });
      expect(screen.getByTestId('feature-drawer-settings')).toBeInTheDocument();
      expect(screen.getByText('SETTINGS')).toBeInTheDocument();
      expect(screen.getByText('Auto-Approve')).toBeInTheDocument();
      expect(screen.getByText('PRD')).toBeInTheDocument();
      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.getByText('Merge')).toBeInTheDocument();
    });

    it('renders git settings when push and openPr are provided', () => {
      renderOverviewTab({
        ...defaultData,
        push: true,
        openPr: false,
      });
      expect(screen.getByTestId('feature-drawer-settings')).toBeInTheDocument();
      expect(screen.getByText('Git')).toBeInTheDocument();
      expect(screen.getByText('Push')).toBeInTheDocument();
      expect(screen.getByText('PR')).toBeInTheDocument();
    });

    it('renders model name when modelId is provided', () => {
      renderOverviewTab({
        ...defaultData,
        modelId: 'claude-sonnet-4-6',
      });
      expect(screen.getByTestId('feature-drawer-settings')).toBeInTheDocument();
      expect(screen.getByText('Model')).toBeInTheDocument();
      expect(screen.getByText('Sonnet 4.6')).toBeInTheDocument();
    });

    it('renders all settings together', () => {
      renderOverviewTab({
        ...defaultData,
        modelId: 'claude-opus-4-6',
        approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
        push: true,
        openPr: true,
      });
      const settings = screen.getByTestId('feature-drawer-settings');
      expect(settings).toBeInTheDocument();
      expect(screen.getByText('Opus 4.6')).toBeInTheDocument();
      expect(screen.getByText('PRD')).toBeInTheDocument();
      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.getByText('Merge')).toBeInTheDocument();
      expect(screen.getByText('Push')).toBeInTheDocument();
    });

    it('renders evidence settings when enableEvidence is provided', () => {
      renderOverviewTab({
        ...defaultData,
        enableEvidence: true,
        commitEvidence: false,
      });
      expect(screen.getByTestId('feature-drawer-settings')).toBeInTheDocument();
      expect(screen.getByText('Evidence')).toBeInTheDocument();
      expect(screen.getByText('Collect')).toBeInTheDocument();
      expect(screen.getByText('Add to PR')).toBeInTheDocument();
    });

    it('renders evidence with both badges enabled', () => {
      renderOverviewTab({
        ...defaultData,
        enableEvidence: true,
        commitEvidence: true,
      });
      expect(screen.getByText('Evidence')).toBeInTheDocument();
      expect(screen.getByText('Collect')).toBeInTheDocument();
      expect(screen.getByText('Add to PR')).toBeInTheDocument();
    });

    it('renders evidence with both badges disabled', () => {
      renderOverviewTab({
        ...defaultData,
        enableEvidence: false,
        commitEvidence: false,
      });
      expect(screen.getByText('Evidence')).toBeInTheDocument();
      expect(screen.getByText('Collect')).toBeInTheDocument();
      expect(screen.getByText('Add to PR')).toBeInTheDocument();
    });

    it('hides settings section when no settings fields are provided', () => {
      renderOverviewTab({
        ...defaultData,
        approvalGates: undefined,
        push: undefined,
        openPr: undefined,
        enableEvidence: undefined,
        modelId: undefined,
      });
      expect(screen.queryByTestId('feature-drawer-settings')).not.toBeInTheDocument();
    });
  });
});
