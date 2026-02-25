import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { WorkflowConfig } from '@shepai/core/domain/generated/output';
import { WorkflowSection } from '@/components/features/settings/workflow-section';

const defaultWorkflow: WorkflowConfig = {
  openPrOnImplementationComplete: false,
  approvalGateDefaults: {
    allowPrd: false,
    allowPlan: false,
    allowMerge: false,
    pushOnImplementationComplete: false,
  },
  ciMaxFixAttempts: 3,
  ciWatchTimeoutMs: 600000,
  ciLogMaxChars: 50000,
};

describe('WorkflowSection', () => {
  it('renders all workflow toggles', () => {
    render(<WorkflowSection workflow={defaultWorkflow} onSave={vi.fn()} />);

    // PR settings toggle
    expect(screen.getByLabelText(/open pr on implementation complete/i)).toBeInTheDocument();

    // Approval gate toggles
    expect(screen.getByLabelText(/auto-approve requirements/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auto-approve planning/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auto-approve merge/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/push on implementation complete/i)).toBeInTheDocument();
  });

  it('displays ciWatchTimeoutMs as minutes', () => {
    render(
      <WorkflowSection
        workflow={{ ...defaultWorkflow, ciWatchTimeoutMs: 600000 }}
        onSave={vi.fn()}
      />
    );

    const minutesInput = screen.getByLabelText(/ci watch timeout/i);
    expect(minutesInput).toHaveValue(10);
  });

  it('converts minutes back to ms on save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);

    render(
      <WorkflowSection
        workflow={{ ...defaultWorkflow, ciWatchTimeoutMs: 600000 }}
        onSave={onSave}
      />
    );

    const minutesInput = screen.getByLabelText(/ci watch timeout/i);
    await user.clear(minutesInput);
    await user.type(minutesInput, '15');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ ciWatchTimeoutMs: 900000 }));
  });

  it('renders CI config inputs with correct constraints', () => {
    render(<WorkflowSection workflow={defaultWorkflow} onSave={vi.fn()} />);

    const maxAttempts = screen.getByLabelText(/max fix attempts/i);
    expect(maxAttempts).toHaveAttribute('type', 'number');
    expect(maxAttempts).toHaveAttribute('min', '1');
    expect(maxAttempts).toHaveAttribute('max', '10');

    expect(screen.getByLabelText(/ci log max chars/i)).toBeInTheDocument();
    expect(screen.getAllByText(/characters/i).length).toBeGreaterThan(0);
  });

  it('renders save button', () => {
    render(<WorkflowSection workflow={defaultWorkflow} onSave={vi.fn()} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('calls onSave with complete workflow config including nested approvalGateDefaults', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);

    render(<WorkflowSection workflow={defaultWorkflow} onSave={onSave} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        openPrOnImplementationComplete: false,
        approvalGateDefaults: expect.objectContaining({
          allowPrd: false,
          allowPlan: false,
          allowMerge: false,
          pushOnImplementationComplete: false,
        }),
        ciMaxFixAttempts: 3,
        ciWatchTimeoutMs: 600000,
        ciLogMaxChars: 50000,
      })
    );
  });
});
