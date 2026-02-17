import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureDrawer } from '@/components/common/feature-drawer';
import { featureNodeStateConfig, lifecycleDisplayLabels } from '@/components/common/feature-node';
import type { FeatureNodeData, FeatureLifecyclePhase } from '@/components/common/feature-node';

const defaultData: FeatureNodeData = {
  name: 'Auth Module',
  description: 'Implement OAuth2 authentication flow',
  featureId: '#f1',
  lifecycle: 'implementation',
  state: 'running',
  progress: 45,
  agentType: 'claude-code',
};

function renderDrawer(selectedNode: FeatureNodeData | null = defaultData, onClose = vi.fn()) {
  return render(<FeatureDrawer selectedNode={selectedNode} onClose={onClose} />);
}

describe('FeatureDrawer', () => {
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
});
