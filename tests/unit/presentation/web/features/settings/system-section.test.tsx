import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SystemSection } from '@/components/features/settings/system-section';
import type { SystemConfig } from '@shepai/core/domain/generated/output';

const defaultSystem: SystemConfig = {
  autoUpdate: true,
  logLevel: 'info',
};

describe('SystemSection', () => {
  it('renders auto-update toggle', () => {
    render(<SystemSection system={defaultSystem} onSave={vi.fn()} />);
    expect(screen.getByLabelText(/auto.update/i)).toBeInTheDocument();
  });

  it('renders auto-update toggle with correct initial state', () => {
    render(<SystemSection system={defaultSystem} onSave={vi.fn()} />);
    const toggle = screen.getByRole('switch', { name: /auto.update/i });
    expect(toggle).toHaveAttribute('data-state', 'checked');
  });

  it('renders auto-update toggle unchecked when false', () => {
    render(<SystemSection system={{ ...defaultSystem, autoUpdate: false }} onSave={vi.fn()} />);
    const toggle = screen.getByRole('switch', { name: /auto.update/i });
    expect(toggle).toHaveAttribute('data-state', 'unchecked');
  });

  it('renders log level select with correct initial value', () => {
    render(<SystemSection system={defaultSystem} onSave={vi.fn()} />);
    const trigger = screen.getByRole('combobox', { name: /log level/i });
    expect(trigger).toHaveTextContent('info');
  });

  it('renders log level select with different initial values', () => {
    render(<SystemSection system={{ ...defaultSystem, logLevel: 'error' }} onSave={vi.fn()} />);
    const trigger = screen.getByRole('combobox', { name: /log level/i });
    expect(trigger).toHaveTextContent('error');
  });

  it('renders a save button', () => {
    render(<SystemSection system={defaultSystem} onSave={vi.fn()} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('calls onSave with updated system config when save is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);
    render(<SystemSection system={defaultSystem} onSave={onSave} />);

    // Toggle autoUpdate off
    const toggle = screen.getByRole('switch', { name: /auto.update/i });
    await user.click(toggle);

    // Click save
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith({
      autoUpdate: false,
      logLevel: 'info',
    });
  });

  it('calls onSave with current system config when no changes made', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);
    render(<SystemSection system={defaultSystem} onSave={onSave} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith({
      autoUpdate: true,
      logLevel: 'info',
    });
  });
});
