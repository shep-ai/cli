import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureDrawer } from '@/components/common/feature-drawer';
import type { FeatureDrawerProps } from '@/components/common/feature-drawer';
import { featureNodeStateConfig, lifecycleDisplayLabels } from '@/components/common/feature-node';
import type { FeatureNodeData, FeatureLifecyclePhase } from '@/components/common/feature-node';

// Mock useFeatureActions hook
const mockOpenInIde = vi.fn();
const mockOpenInShell = vi.fn();
const mockOpenSpecsFolder = vi.fn();
let mockHookReturn = {
  openInIde: mockOpenInIde,
  openInShell: mockOpenInShell,
  openSpecsFolder: mockOpenSpecsFolder,
  ideLoading: false,
  shellLoading: false,
  specsLoading: false,
  ideError: null as string | null,
  shellError: null as string | null,
  specsError: null as string | null,
};

vi.mock('@/components/common/feature-drawer/use-feature-actions', () => ({
  useFeatureActions: () => mockHookReturn,
}));

const mockDrawerOpenPlay = vi.fn();
const mockDrawerClosePlay = vi.fn();

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: vi.fn((action: string) => {
    if (action === 'drawer-open')
      return { play: mockDrawerOpenPlay, stop: vi.fn(), isPlaying: false };
    if (action === 'drawer-close')
      return { play: mockDrawerClosePlay, stop: vi.fn(), isPlaying: false };
    return { play: vi.fn(), stop: vi.fn(), isPlaying: false };
  }),
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

function renderDrawer(
  selectedNode: FeatureNodeData | null = defaultData,
  onClose = vi.fn(),
  props?: Partial<Pick<FeatureDrawerProps, 'onDelete' | 'isDeleting'>>
) {
  return render(<FeatureDrawer selectedNode={selectedNode} onClose={onClose} {...props} />);
}

describe('FeatureDrawer', () => {
  beforeEach(() => {
    mockHookReturn = {
      openInIde: mockOpenInIde,
      openInShell: mockOpenInShell,
      openSpecsFolder: mockOpenSpecsFolder,
      ideLoading: false,
      shellLoading: false,
      specsLoading: false,
      ideError: null,
      shellError: null,
      specsError: null,
    };
    mockOpenInIde.mockReset();
    mockOpenInShell.mockReset();
    mockOpenSpecsFolder.mockReset();
  });

  describe('closed state', () => {
    it('renders nothing when selectedNode is null', () => {
      const { container } = renderDrawer(null);
      expect(container.querySelector('[data-slot="drawer-content"]')).not.toBeInTheDocument();
    });
  });

  describe('Header section', () => {
    it('displays the feature name', () => {
      renderDrawer({ ...defaultData, name: 'Payment Gateway' });
      expect(screen.getByText('Payment Gateway')).toBeInTheDocument();
    });

    it('displays the featureId', () => {
      renderDrawer({ ...defaultData, featureId: '#f42' });
      expect(screen.getByText('#f42')).toBeInTheDocument();
    });
  });

  describe('Status section', () => {
    it('displays lifecycle label from lifecycleDisplayLabels', () => {
      renderDrawer({ ...defaultData, lifecycle: 'requirements' });
      expect(screen.getByText('REQUIREMENTS')).toBeInTheDocument();
    });

    it('renders all lifecycle phase labels correctly', () => {
      const phases: FeatureLifecyclePhase[] = [
        'requirements',
        'research',
        'implementation',
        'review',
        'deploy',
        'maintain',
      ];

      for (const phase of phases) {
        const { unmount } = renderDrawer({ ...defaultData, lifecycle: phase });
        expect(screen.getByText(lifecycleDisplayLabels[phase])).toBeInTheDocument();
        unmount();
      }
    });

    it('displays state badge with correct label for running state', () => {
      renderDrawer({ ...defaultData, state: 'running' });
      expect(screen.getByText(featureNodeStateConfig.running.label)).toBeInTheDocument();
    });

    it('displays state badge with correct label for action-required state', () => {
      renderDrawer({ ...defaultData, state: 'action-required' });
      expect(screen.getByText(featureNodeStateConfig['action-required'].label)).toBeInTheDocument();
    });

    it('displays state badge with correct label for done state', () => {
      renderDrawer({ ...defaultData, state: 'done', progress: 100 });
      expect(screen.getByText(featureNodeStateConfig.done.label)).toBeInTheDocument();
    });

    it('displays state badge with correct label for blocked state', () => {
      renderDrawer({ ...defaultData, state: 'blocked' });
      expect(screen.getByText(featureNodeStateConfig.blocked.label)).toBeInTheDocument();
    });

    it('displays state badge with correct label for error state', () => {
      renderDrawer({ ...defaultData, state: 'error' });
      expect(screen.getByText(featureNodeStateConfig.error.label)).toBeInTheDocument();
    });

    it('shows progress bar when progress > 0', () => {
      renderDrawer({ ...defaultData, progress: 60 });
      expect(screen.getByTestId('feature-drawer-progress')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('hides progress bar when progress is 0', () => {
      renderDrawer({ ...defaultData, progress: 0 });
      expect(screen.queryByTestId('feature-drawer-progress')).not.toBeInTheDocument();
    });
  });

  describe('Details section', () => {
    it('shows description when provided', () => {
      renderDrawer({ ...defaultData, description: 'A detailed description' });
      expect(screen.getByText('A detailed description')).toBeInTheDocument();
    });

    it('hides description when undefined', () => {
      renderDrawer({ ...defaultData, description: undefined });
      expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });

    it('shows agentType when provided', () => {
      renderDrawer({ ...defaultData, agentType: 'cursor' });
      expect(screen.getByText('cursor')).toBeInTheDocument();
    });

    it('hides agent info when agentType is undefined', () => {
      renderDrawer({ ...defaultData, agentType: undefined });
      expect(screen.queryByText('Agent')).not.toBeInTheDocument();
    });

    it('shows runtime when provided', () => {
      renderDrawer({ ...defaultData, runtime: '2h 15m' });
      expect(screen.getByText('2h 15m')).toBeInTheDocument();
    });

    it('hides runtime when undefined', () => {
      renderDrawer({ ...defaultData, runtime: undefined });
      expect(screen.queryByText('Runtime')).not.toBeInTheDocument();
    });

    it('shows blockedBy when state is blocked and blockedBy is provided', () => {
      renderDrawer({ ...defaultData, state: 'blocked', blockedBy: 'Payment Service' });
      expect(screen.getByText('Payment Service')).toBeInTheDocument();
    });

    it('hides blockedBy when undefined', () => {
      renderDrawer({ ...defaultData, state: 'blocked', blockedBy: undefined });
      expect(screen.queryByText('Blocked by')).not.toBeInTheDocument();
    });

    it('shows errorMessage when state is error and errorMessage is provided', () => {
      renderDrawer({
        ...defaultData,
        state: 'error',
        errorMessage: 'Build failed: type mismatch',
      });
      expect(screen.getByText('Build failed: type mismatch')).toBeInTheDocument();
    });

    it('hides details section when errorMessage is the only possible detail and is undefined', () => {
      renderDrawer({
        ...defaultData,
        state: 'error',
        errorMessage: undefined,
        description: undefined,
        agentType: undefined,
        runtime: undefined,
        blockedBy: undefined,
      });
      expect(screen.queryByTestId('feature-drawer-details')).not.toBeInTheDocument();
    });
  });

  describe('close behavior', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      renderDrawer(defaultData, onClose);
      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.click();
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe('open action menu', () => {
    it('renders Open dropdown button when repositoryPath and branch are present', () => {
      renderDrawer(defaultData);
      expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
    });

    it('does not render Open button when repositoryPath is empty', () => {
      renderDrawer({ ...defaultData, repositoryPath: '', branch: 'feat/test' });
      expect(screen.queryByRole('button', { name: /^open$/i })).not.toBeInTheDocument();
    });

    it('does not render Open button when branch is empty', () => {
      renderDrawer({ ...defaultData, repositoryPath: '/home/user/repo', branch: '' });
      expect(screen.queryByRole('button', { name: /^open$/i })).not.toBeInTheDocument();
    });

    it('shows menu items when dropdown is opened', async () => {
      const user = userEvent.setup();
      renderDrawer(defaultData);
      await user.click(screen.getByRole('button', { name: /open/i }));
      expect(screen.getByText('IDE')).toBeInTheDocument();
      expect(screen.getByText('Terminal')).toBeInTheDocument();
    });

    it('calls openInIde when IDE menu item is clicked', async () => {
      const user = userEvent.setup();
      renderDrawer(defaultData);
      await user.click(screen.getByRole('button', { name: /open/i }));
      await user.click(screen.getByText('IDE'));
      expect(mockOpenInIde).toHaveBeenCalledOnce();
    });

    it('calls openInShell when Terminal menu item is clicked', async () => {
      const user = userEvent.setup();
      renderDrawer(defaultData);
      await user.click(screen.getByRole('button', { name: /open/i }));
      await user.click(screen.getByText('Terminal'));
      expect(mockOpenInShell).toHaveBeenCalledOnce();
    });

    it('disables Open button when any action is loading', () => {
      mockHookReturn = { ...mockHookReturn, ideLoading: true };
      renderDrawer(defaultData);
      expect(screen.getByRole('button', { name: /open/i })).toBeDisabled();
    });
  });

  describe('delete button', () => {
    it('renders delete button when onDelete prop is provided', () => {
      renderDrawer(defaultData, vi.fn(), { onDelete: vi.fn() });
      expect(screen.getByTestId('feature-drawer-delete')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete feature/i })).toBeInTheDocument();
    });

    it('does not render delete button when onDelete is undefined', () => {
      renderDrawer(defaultData);
      expect(screen.queryByTestId('feature-drawer-delete')).not.toBeInTheDocument();
    });

    it('clicking delete button opens AlertDialog with feature name and featureId', () => {
      renderDrawer(defaultData, vi.fn(), { onDelete: vi.fn() });

      fireEvent.click(screen.getByRole('button', { name: /delete feature/i }));

      expect(screen.getByText('Delete feature?')).toBeInTheDocument();
      // The dialog description should contain the feature name in a <strong> tag
      const description = screen.getByText(/This will permanently delete/);
      expect(description).toBeInTheDocument();
      expect(description.querySelector('strong')).toHaveTextContent('Auth Module');
      expect(description).toHaveTextContent('#f1');
    });

    it('AlertDialog shows running-agent warning when state is "running"', () => {
      renderDrawer({ ...defaultData, state: 'running' }, vi.fn(), { onDelete: vi.fn() });

      fireEvent.click(screen.getByRole('button', { name: /delete feature/i }));

      expect(
        screen.getByText(/This feature has a running agent that will be stopped/)
      ).toBeInTheDocument();
    });

    it('AlertDialog does not show running-agent warning when state is not "running"', () => {
      renderDrawer({ ...defaultData, state: 'done', progress: 100 }, vi.fn(), {
        onDelete: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', { name: /delete feature/i }));

      expect(
        screen.queryByText(/This feature has a running agent that will be stopped/)
      ).not.toBeInTheDocument();
    });

    it('clicking Cancel closes dialog without calling onDelete', () => {
      const onDelete = vi.fn();
      renderDrawer(defaultData, vi.fn(), { onDelete });

      fireEvent.click(screen.getByRole('button', { name: /delete feature/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onDelete).not.toHaveBeenCalled();
    });

    it('clicking Confirm calls onDelete with featureId', () => {
      const onDelete = vi.fn();
      renderDrawer({ ...defaultData, featureId: '#abc' }, vi.fn(), { onDelete });

      fireEvent.click(screen.getByRole('button', { name: /delete feature/i }));
      fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

      expect(onDelete).toHaveBeenCalledWith('#abc');
    });

    it('delete trigger button is disabled when isDeleting is true', () => {
      renderDrawer(defaultData, vi.fn(), { onDelete: vi.fn(), isDeleting: true });

      const triggerButton = screen.getByRole('button', { name: /delete feature/i });
      expect(triggerButton).toBeDisabled();
    });
  });

  describe('sound effects', () => {
    beforeEach(() => {
      mockDrawerOpenPlay.mockReset();
      mockDrawerClosePlay.mockReset();
    });

    it('plays drawer-close sound when close button is clicked', () => {
      const onClose = vi.fn();
      renderDrawer(defaultData, onClose);
      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.click();
      expect(mockDrawerClosePlay).toHaveBeenCalledOnce();
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
