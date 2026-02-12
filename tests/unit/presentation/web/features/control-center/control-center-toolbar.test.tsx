import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider, ReactFlow } from '@xyflow/react';
import {
  ControlCenterToolbar,
  type ControlCenterToolbarProps,
} from '@/components/features/control-center/control-center-toolbar';

function renderToolbar(props?: Partial<ControlCenterToolbarProps>) {
  return render(
    <ReactFlowProvider>
      <ReactFlow nodes={[]} edges={[]}>
        <ControlCenterToolbar {...props} />
      </ReactFlow>
    </ReactFlowProvider>
  );
}

describe('ControlCenterToolbar', () => {
  it('renders "Add Feature" button text', () => {
    renderToolbar();
    expect(screen.getByText('Add Feature')).toBeInTheDocument();
  });

  it('renders "Auto-Layout" button text', () => {
    renderToolbar();
    expect(screen.getByText('Auto-Layout')).toBeInTheDocument();
  });

  it('Auto-Layout button is disabled', () => {
    renderToolbar();
    const button = screen.getByTestId('toolbar-auto-layout');
    expect(button).toBeDisabled();
  });

  it('calls onAddFeature when Add Feature button is clicked', () => {
    const onAddFeature = vi.fn();
    renderToolbar({ onAddFeature });
    fireEvent.click(screen.getByTestId('toolbar-add-feature'));
    expect(onAddFeature).toHaveBeenCalledOnce();
  });

  it('does not throw when rendered without callbacks', () => {
    expect(() => renderToolbar()).not.toThrow();
  });
});
