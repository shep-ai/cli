import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureRunningControls } from '@/components/common/feature-drawer-tabs/feature-running-controls';
import { featureNodeStateConfig, lifecycleDisplayLabels } from '@/components/common/feature-node';
import type { FeatureNodeData, FeatureLifecyclePhase } from '@/components/common/feature-node';

const defaultData: FeatureNodeData = {
  name: 'Auth Module',
  featureId: 'f1',
  lifecycle: 'implementation',
  state: 'running',
  progress: 45,
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/auth-module',
};

function renderControls(data: FeatureNodeData = defaultData) {
  return render(<FeatureRunningControls data={data} />);
}

describe('FeatureRunningControls', () => {
  describe('lifecycle label', () => {
    it('renders lifecycle phase label from FeatureNodeData', () => {
      renderControls({ ...defaultData, lifecycle: 'requirements' });
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
        const { unmount } = renderControls({ ...defaultData, lifecycle: phase });
        expect(screen.getByText(lifecycleDisplayLabels[phase])).toBeInTheDocument();
        unmount();
      }
    });
  });

  describe('state badge', () => {
    it('renders state badge with correct label for running state', () => {
      renderControls({ ...defaultData, state: 'running' });
      expect(screen.getByTestId('feature-drawer-state-badge')).toBeInTheDocument();
      expect(screen.getByText(featureNodeStateConfig.running.label)).toBeInTheDocument();
    });

    it('renders state badge with correct label for action-required state', () => {
      renderControls({ ...defaultData, state: 'action-required' });
      expect(screen.getByText(featureNodeStateConfig['action-required'].label)).toBeInTheDocument();
    });

    it('renders state badge with correct label for done state', () => {
      renderControls({ ...defaultData, state: 'done', progress: 100 });
      expect(screen.getByText(featureNodeStateConfig.done.label)).toBeInTheDocument();
    });

    it('renders state badge with correct label for blocked state', () => {
      renderControls({ ...defaultData, state: 'blocked' });
      expect(screen.getByText(featureNodeStateConfig.blocked.label)).toBeInTheDocument();
    });

    it('renders state badge with correct label for error state', () => {
      renderControls({ ...defaultData, state: 'error' });
      expect(screen.getByText(featureNodeStateConfig.error.label)).toBeInTheDocument();
    });

    it('renders state badge with correct label for pending state', () => {
      renderControls({ ...defaultData, state: 'pending', lifecycle: 'pending' });
      expect(screen.getByText(featureNodeStateConfig.pending.label)).toBeInTheDocument();
    });
  });

  describe('stop button', () => {
    it('renders stop button when state is running and onStop is provided', () => {
      renderControls({ ...defaultData, state: 'running', onStop: vi.fn() });
      expect(screen.getByTestId('feature-drawer-stop-button')).toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    it('renders stop button when state is action-required and onStop is provided', () => {
      renderControls({ ...defaultData, state: 'action-required', onStop: vi.fn() });
      expect(screen.getByTestId('feature-drawer-stop-button')).toBeInTheDocument();
    });

    it('hides stop button when onStop is not provided', () => {
      renderControls({ ...defaultData, state: 'running' });
      expect(screen.queryByTestId('feature-drawer-stop-button')).not.toBeInTheDocument();
    });

    it('hides stop button when state is not running or action-required', () => {
      renderControls({ ...defaultData, state: 'error', onStop: vi.fn() });
      expect(screen.queryByTestId('feature-drawer-stop-button')).not.toBeInTheDocument();
    });

    it('calls onStop with featureId when clicked', async () => {
      const user = userEvent.setup();
      const onStop = vi.fn();
      renderControls({ ...defaultData, state: 'running', onStop });
      await user.click(screen.getByTestId('feature-drawer-stop-button'));
      expect(onStop).toHaveBeenCalledWith('f1');
    });
  });

  describe('retry button', () => {
    it('renders retry button when state is error and onRetry is provided', () => {
      renderControls({ ...defaultData, state: 'error', onRetry: vi.fn() });
      expect(screen.getByTestId('feature-drawer-retry-button')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('hides retry button when onRetry is not provided', () => {
      renderControls({ ...defaultData, state: 'error' });
      expect(screen.queryByTestId('feature-drawer-retry-button')).not.toBeInTheDocument();
    });

    it('hides retry button when state is not error', () => {
      renderControls({ ...defaultData, state: 'running', onRetry: vi.fn() });
      expect(screen.queryByTestId('feature-drawer-retry-button')).not.toBeInTheDocument();
    });

    it('calls onRetry with featureId when clicked', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      renderControls({ ...defaultData, state: 'error', onRetry });
      await user.click(screen.getByTestId('feature-drawer-retry-button'));
      expect(onRetry).toHaveBeenCalledWith('f1');
    });
  });

  describe('start button', () => {
    it('renders start button when state is pending and onStart is provided', () => {
      renderControls({ ...defaultData, lifecycle: 'pending', state: 'pending', onStart: vi.fn() });
      expect(screen.getByTestId('feature-drawer-start-button')).toBeInTheDocument();
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    it('hides start button when onStart is not provided', () => {
      renderControls({ ...defaultData, state: 'pending' });
      expect(screen.queryByTestId('feature-drawer-start-button')).not.toBeInTheDocument();
    });

    it('hides start button when state is not pending', () => {
      renderControls({ ...defaultData, state: 'running', onStart: vi.fn() });
      expect(screen.queryByTestId('feature-drawer-start-button')).not.toBeInTheDocument();
    });

    it('calls onStart with featureId when clicked', async () => {
      const user = userEvent.setup();
      const onStart = vi.fn();
      renderControls({ ...defaultData, lifecycle: 'pending', state: 'pending', onStart });
      await user.click(screen.getByTestId('feature-drawer-start-button'));
      expect(onStart).toHaveBeenCalledWith('f1');
    });
  });

  describe('no action buttons for terminal/passive states', () => {
    it('shows no action buttons for done state', () => {
      renderControls({ ...defaultData, state: 'done' });
      expect(screen.queryByTestId('feature-drawer-stop-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('feature-drawer-retry-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('feature-drawer-start-button')).not.toBeInTheDocument();
    });

    it('shows no action buttons for blocked state', () => {
      renderControls({ ...defaultData, state: 'blocked' });
      expect(screen.queryByTestId('feature-drawer-stop-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('feature-drawer-retry-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('feature-drawer-start-button')).not.toBeInTheDocument();
    });

    it('shows no action buttons for creating state', () => {
      renderControls({ ...defaultData, state: 'creating' });
      expect(screen.queryByTestId('feature-drawer-stop-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('feature-drawer-retry-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('feature-drawer-start-button')).not.toBeInTheDocument();
    });
  });
});
