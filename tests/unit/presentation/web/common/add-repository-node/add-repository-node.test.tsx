import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactFlowProvider, ReactFlow } from '@xyflow/react';
import { AddRepositoryNode } from '@/components/common/add-repository-node';
import type {
  AddRepositoryNodeData,
  AddRepositoryNodeType,
} from '@/components/common/add-repository-node';

// Mock the pickFolder module
vi.mock('@/components/common/add-repository-node/pick-folder', () => ({
  pickFolder: vi.fn(),
}));

import { pickFolder } from '@/components/common/add-repository-node/pick-folder';

const mockPickFolder = vi.mocked(pickFolder);

const nodeTypes = { addRepositoryNode: AddRepositoryNode };

const defaultData: AddRepositoryNodeData = {};

function renderAddRepositoryNode(dataOverrides?: Partial<AddRepositoryNodeData>) {
  const data = { ...defaultData, ...dataOverrides };
  const nodes: AddRepositoryNodeType[] = [
    { id: 'test-node', type: 'addRepositoryNode', position: { x: 0, y: 0 }, data },
  ];
  return render(
    <ReactFlowProvider>
      <ReactFlow nodes={nodes} nodeTypes={nodeTypes} proOptions={{ hideAttribution: true }} />
    </ReactFlowProvider>
  );
}

describe('AddRepositoryNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the label text', () => {
    renderAddRepositoryNode();
    expect(screen.getByText('Add Repository')).toBeInTheDocument();
  });

  it('renders the plus icon', () => {
    const { container } = renderAddRepositoryNode();
    const svg = container.querySelector('svg.lucide-plus');
    expect(svg).toBeInTheDocument();
  });

  it('calls pickFolder API and fires onSelect with the returned path', async () => {
    const onSelect = vi.fn();
    mockPickFolder.mockResolvedValue('/Users/dev/my-repo');

    renderAddRepositoryNode({ onSelect });
    const button = screen.getByTestId('add-repository-node-card');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockPickFolder).toHaveBeenCalledOnce();
      expect(onSelect).toHaveBeenCalledWith('/Users/dev/my-repo');
    });
  });

  it('does not call onSelect when user cancels (pickFolder returns null)', async () => {
    const onSelect = vi.fn();
    mockPickFolder.mockResolvedValue(null);

    renderAddRepositoryNode({ onSelect });
    const button = screen.getByTestId('add-repository-node-card');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockPickFolder).toHaveBeenCalledOnce();
    });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows loading state while dialog is open', async () => {
    let resolvePickFolder: (value: string | null) => void;
    mockPickFolder.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePickFolder = resolve;
        })
    );

    renderAddRepositoryNode();
    const button = screen.getByTestId('add-repository-node-card');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Opening...')).toBeInTheDocument();
    });

    // Resolve the dialog
    resolvePickFolder!(null);

    await waitFor(() => {
      expect(screen.getByText('Add Repository')).toBeInTheDocument();
    });
  });
});
