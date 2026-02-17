import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { ControlCenter } from '@/components/features/control-center';
import type { FeatureNodeType } from '@/components/common/feature-node';

const mockFeatureNode: FeatureNodeType = {
  id: 'node-1',
  type: 'featureNode',
  position: { x: 0, y: 0 },
  data: {
    name: 'Test Feature',
    description: 'A test feature',
    featureId: '#f1',
    lifecycle: 'requirements',
    state: 'running',
    progress: 50,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/test-feature',
  },
};

const mockFeatureNode2: FeatureNodeType = {
  id: 'node-2',
  type: 'featureNode',
  position: { x: 400, y: 0 },
  data: {
    name: 'Another Feature',
    description: 'Second feature',
    featureId: '#f2',
    lifecycle: 'implementation',
    state: 'done',
    progress: 100,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/another-feature',
  },
};

describe('ControlCenter', () => {
  it('renders the control-center container', () => {
    render(<ControlCenter initialNodes={[]} initialEdges={[]} />);
    expect(screen.getByTestId('control-center')).toBeInTheDocument();
  });

  it('shows empty state when no nodes provided', () => {
    render(<ControlCenter initialNodes={[]} initialEdges={[]} />);
    expect(screen.getByTestId('control-center-empty-state')).toBeInTheDocument();
    expect(screen.getByText('Add Repository')).toBeInTheDocument();
  });

  it('renders feature nodes when initialNodes has feature nodes', () => {
    render(<ControlCenter initialNodes={[mockFeatureNode, mockFeatureNode2]} initialEdges={[]} />);
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    expect(screen.getByText('Another Feature')).toBeInTheDocument();
  });
});
