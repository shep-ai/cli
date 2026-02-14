import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider, ReactFlow } from '@xyflow/react';
import { AddRepositoryNode } from '@/components/common/add-repository-node';
import type {
  AddRepositoryNodeData,
  AddRepositoryNodeType,
} from '@/components/common/add-repository-node';

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
  it('renders the label text', () => {
    renderAddRepositoryNode();
    expect(screen.getByText('Add Repository')).toBeInTheDocument();
  });

  it('renders the plus icon', () => {
    const { container } = renderAddRepositoryNode();
    const svg = container.querySelector('svg.lucide-plus');
    expect(svg).toBeInTheDocument();
  });

  it('renders a hidden file input with webkitdirectory', () => {
    renderAddRepositoryNode();
    const input = screen.getByTestId('add-repository-node-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('webkitdirectory');
  });

  it('clicking the button triggers the file input', () => {
    renderAddRepositoryNode();
    const input = screen.getByTestId('add-repository-node-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');
    const button = screen.getByTestId('add-repository-node-card');
    fireEvent.click(button);
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('fires onSelect with folder name when files are chosen', () => {
    const onSelect = vi.fn();
    renderAddRepositoryNode({ onSelect });
    const input = screen.getByTestId('add-repository-node-input');
    const file = new File([''], 'dummy.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'webkitRelativePath', { value: 'my-repo/dummy.txt' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onSelect).toHaveBeenCalledWith('my-repo');
  });
});
