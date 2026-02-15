import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider, ReactFlow } from '@xyflow/react';
import {
  FeatureNode,
  lifecycleDisplayLabels,
  lifecycleRunningVerbs,
  getAgentTypeIcon,
} from '@/components/common/feature-node';
import type { FeatureNodeData, FeatureNodeType } from '@/components/common/feature-node';
import { DefaultAgentIcon } from '@/components/common/feature-node/agent-type-icons';

const nodeTypes = { featureNode: FeatureNode };

const defaultData: FeatureNodeData = {
  name: 'Auth Module',
  description: 'Implement authentication flow',
  featureId: '#f1',
  lifecycle: 'requirements',
  state: 'running',
  progress: 45,
};

function renderFeatureNode(
  dataOverrides?: Partial<FeatureNodeData>,
  nodeOverrides?: Partial<Omit<FeatureNodeType, 'data'>>
) {
  const data = { ...defaultData, ...dataOverrides };
  const nodes: FeatureNodeType[] = [
    { id: 'test-node', type: 'featureNode', position: { x: 0, y: 0 }, data, ...nodeOverrides },
  ];
  return render(
    <ReactFlowProvider>
      <ReactFlow nodes={nodes} nodeTypes={nodeTypes} proOptions={{ hideAttribution: true }} />
    </ReactFlowProvider>
  );
}

describe('FeatureNode', () => {
  it('renders lifecycle phase label using display labels', () => {
    renderFeatureNode({ lifecycle: 'requirements' });
    expect(screen.getByText('REQUIREMENTS')).toBeInTheDocument();
  });

  it('renders feature name', () => {
    renderFeatureNode({ name: 'Auth Module' });
    expect(screen.getByText('Auth Module')).toBeInTheDocument();
  });

  it('renders description', () => {
    renderFeatureNode({ description: 'Implement authentication flow' });
    expect(screen.getByText('Implement authentication flow')).toBeInTheDocument();
  });

  it('does not render featureId in the card', () => {
    renderFeatureNode({ featureId: '#f1' });
    expect(screen.queryByText('#f1')).not.toBeInTheDocument();
  });

  describe('running state', () => {
    it('shows badge instead of progress bar', () => {
      renderFeatureNode({ state: 'running', progress: 45 });
      expect(screen.queryByTestId('feature-node-progress-bar')).not.toBeInTheDocument();
      expect(screen.getByTestId('feature-node-badge')).toBeInTheDocument();
    });

    it('shows lifecycle running verb in badge text', () => {
      renderFeatureNode({ state: 'running', progress: 45, lifecycle: 'implementation' });
      expect(screen.getByText('Implementing')).toBeInTheDocument();
    });

    it('shows Analyzing verb for requirements phase', () => {
      renderFeatureNode({ state: 'running', progress: 45, lifecycle: 'requirements' });
      expect(screen.getByText('Analyzing')).toBeInTheDocument();
    });
  });

  it('action button fires onAction callback', () => {
    const onAction = vi.fn();
    renderFeatureNode({ onAction });
    const actionButton = screen.getByTestId('feature-node-action-button');
    fireEvent.click(actionButton);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('settings icon fires onSettings callback', () => {
    const onSettings = vi.fn();
    renderFeatureNode({ onSettings });
    const settingsButton = screen.getByTestId('feature-node-settings-button');
    fireEvent.click(settingsButton);
    expect(onSettings).toHaveBeenCalledOnce();
  });

  it('renders Handle components when showHandles is true', () => {
    const { container } = renderFeatureNode({ showHandles: true });
    const handles = container.querySelectorAll('.react-flow__handle');
    expect(handles.length).toBeGreaterThanOrEqual(2);
  });

  it('renders all lifecycle phases with display labels', () => {
    const phases = [
      'requirements',
      'research',
      'implementation',
      'review',
      'deploy',
      'maintain',
    ] as const;
    const expectedLabels: Record<string, string> = {
      requirements: 'REQUIREMENTS',
      research: 'RESEARCH',
      implementation: 'IMPLEMENTATION',
      review: 'REVIEW',
      deploy: 'DEPLOY & QA',
      maintain: 'COMPLETED',
    };
    for (const phase of phases) {
      const { unmount } = renderFeatureNode({ lifecycle: phase });
      expect(screen.getByText(expectedLabels[phase])).toBeInTheDocument();
      unmount();
    }
  });

  it('renders without description when not provided', () => {
    renderFeatureNode({ description: undefined });
    expect(screen.queryByTestId('feature-node-description')).not.toBeInTheDocument();
  });

  describe('done state', () => {
    it('shows badge instead of progress bar', () => {
      renderFeatureNode({ state: 'done', progress: 100 });
      expect(screen.queryByTestId('feature-node-progress-bar')).not.toBeInTheDocument();
      expect(screen.getByTestId('feature-node-badge')).toBeInTheDocument();
    });

    it('shows "Completed" when no runtime provided', () => {
      renderFeatureNode({ state: 'done', progress: 100 });
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('shows runtime when provided', () => {
      renderFeatureNode({ state: 'done', progress: 100, runtime: '2h 15m' });
      expect(screen.getByText('Completed in 2h 15m')).toBeInTheDocument();
    });

    it('does not show progress percentage', () => {
      renderFeatureNode({ state: 'done', progress: 100 });
      expect(screen.queryByText('100%')).not.toBeInTheDocument();
    });
  });

  describe('blocked state', () => {
    it('shows badge instead of progress bar', () => {
      renderFeatureNode({ state: 'blocked', progress: 20 });
      expect(screen.queryByTestId('feature-node-progress-bar')).not.toBeInTheDocument();
      expect(screen.getByTestId('feature-node-badge')).toBeInTheDocument();
    });

    it('shows "Blocked" when no blockedBy provided', () => {
      renderFeatureNode({ state: 'blocked', progress: 20 });
      expect(screen.getByText('Blocked')).toBeInTheDocument();
    });

    it('shows blockedBy feature when provided', () => {
      renderFeatureNode({ state: 'blocked', progress: 20, blockedBy: 'Auth Module' });
      expect(screen.getByText('Waiting on Auth Module')).toBeInTheDocument();
    });
  });

  describe('action-required state', () => {
    it('shows badge instead of progress bar', () => {
      renderFeatureNode({ state: 'action-required', progress: 60 });
      expect(screen.queryByTestId('feature-node-progress-bar')).not.toBeInTheDocument();
      expect(screen.getByTestId('feature-node-badge')).toBeInTheDocument();
    });

    it('shows "User action required" text', () => {
      renderFeatureNode({ state: 'action-required', progress: 60 });
      expect(screen.getByText('User action required')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows badge instead of progress bar', () => {
      renderFeatureNode({ state: 'error', progress: 30 });
      expect(screen.queryByTestId('feature-node-progress-bar')).not.toBeInTheDocument();
      expect(screen.getByTestId('feature-node-badge')).toBeInTheDocument();
    });

    it('shows default error message when none provided', () => {
      renderFeatureNode({ state: 'error', progress: 30 });
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('shows custom error message when provided', () => {
      renderFeatureNode({ state: 'error', progress: 30, errorMessage: 'Build failed' });
      expect(screen.getByText('Build failed')).toBeInTheDocument();
    });
  });

  describe('lifecycleDisplayLabels', () => {
    it('maps maintain to COMPLETED', () => {
      expect(lifecycleDisplayLabels.maintain).toBe('COMPLETED');
    });

    it('maps deploy to DEPLOY & QA', () => {
      expect(lifecycleDisplayLabels.deploy).toBe('DEPLOY & QA');
    });

    it('maps research to RESEARCH', () => {
      expect(lifecycleDisplayLabels.research).toBe('RESEARCH');
    });

    it('maps review to REVIEW', () => {
      expect(lifecycleDisplayLabels.review).toBe('REVIEW');
    });
  });

  describe('lifecycle running verbs', () => {
    const verbMap: Record<string, string> = {
      requirements: 'Analyzing',
      research: 'Researching',
      implementation: 'Implementing',
      review: 'Reviewing',
      deploy: 'Deploying',
      maintain: 'Maintaining',
    };

    for (const [phase, verb] of Object.entries(verbMap)) {
      it(`shows "${verb}" for ${phase} phase`, () => {
        renderFeatureNode({
          state: 'running',
          lifecycle: phase as FeatureNodeData['lifecycle'],
        });
        expect(screen.getByText(verb)).toBeInTheDocument();
      });
    }
  });

  describe('lifecycleRunningVerbs', () => {
    it('maps requirements to Analyzing', () => {
      expect(lifecycleRunningVerbs.requirements).toBe('Analyzing');
    });

    it('maps research to Researching', () => {
      expect(lifecycleRunningVerbs.research).toBe('Researching');
    });

    it('maps implementation to Implementing', () => {
      expect(lifecycleRunningVerbs.implementation).toBe('Implementing');
    });

    it('maps review to Reviewing', () => {
      expect(lifecycleRunningVerbs.review).toBe('Reviewing');
    });

    it('maps deploy to Deploying', () => {
      expect(lifecycleRunningVerbs.deploy).toBe('Deploying');
    });

    it('maps maintain to Maintaining', () => {
      expect(lifecycleRunningVerbs.maintain).toBe('Maintaining');
    });
  });

  describe('getAgentTypeIcon', () => {
    it('returns a brand icon component for claude-code', () => {
      const icon = getAgentTypeIcon('claude-code');
      expect(icon).not.toBe(DefaultAgentIcon);
      expect(icon.displayName).toBe('BrandIcon(Claude Code)');
    });

    it('returns a brand icon component for cursor', () => {
      const icon = getAgentTypeIcon('cursor');
      expect(icon).not.toBe(DefaultAgentIcon);
      expect(icon.displayName).toBe('BrandIcon(Cursor)');
    });

    it('returns DefaultAgentIcon for undefined', () => {
      expect(getAgentTypeIcon(undefined)).toBe(DefaultAgentIcon);
    });

    it('returns DefaultAgentIcon for unknown type', () => {
      expect(getAgentTypeIcon('unknown-agent')).toBe(DefaultAgentIcon);
    });
  });

  describe('selected highlight', () => {
    it('applies ring classes when selected is true', () => {
      renderFeatureNode(undefined, { selected: true });
      const card = screen.getByTestId('feature-node-card');
      expect(card.className).toContain('ring-2');
      expect(card.className).toContain('ring-primary');
    });

    it('does not apply ring classes when selected is false', () => {
      renderFeatureNode(undefined, { selected: false });
      const card = screen.getByTestId('feature-node-card');
      expect(card.className).not.toContain('ring-2');
      expect(card.className).not.toContain('ring-primary');
    });
  });
});
