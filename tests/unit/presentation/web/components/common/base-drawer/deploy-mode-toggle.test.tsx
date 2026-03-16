import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeployModeToggle } from '@/components/common/base-drawer/deploy-mode-toggle';

describe('DeployModeToggle', () => {
  it('renders Fast and Agent mode options', () => {
    render(<DeployModeToggle mode="fast" onModeChange={vi.fn()} />);

    expect(screen.getByRole('radio', { name: /fast mode/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /agent mode/i })).toBeInTheDocument();
  });

  it('highlights the selected Fast mode', () => {
    render(<DeployModeToggle mode="fast" onModeChange={vi.fn()} />);

    const fastBtn = screen.getByRole('radio', { name: /fast mode/i });
    expect(fastBtn).toHaveAttribute('aria-checked', 'true');

    const agentBtn = screen.getByRole('radio', { name: /agent mode/i });
    expect(agentBtn).toHaveAttribute('aria-checked', 'false');
  });

  it('highlights the selected Agent mode', () => {
    render(<DeployModeToggle mode="agent" onModeChange={vi.fn()} />);

    const fastBtn = screen.getByRole('radio', { name: /fast mode/i });
    expect(fastBtn).toHaveAttribute('aria-checked', 'false');

    const agentBtn = screen.getByRole('radio', { name: /agent mode/i });
    expect(agentBtn).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onModeChange with "agent" when Agent option is clicked', () => {
    const onModeChange = vi.fn();
    render(<DeployModeToggle mode="fast" onModeChange={onModeChange} />);

    fireEvent.click(screen.getByRole('radio', { name: /agent mode/i }));
    expect(onModeChange).toHaveBeenCalledWith('agent');
  });

  it('calls onModeChange with "fast" when Fast option is clicked', () => {
    const onModeChange = vi.fn();
    render(<DeployModeToggle mode="agent" onModeChange={onModeChange} />);

    fireEvent.click(screen.getByRole('radio', { name: /fast mode/i }));
    expect(onModeChange).toHaveBeenCalledWith('fast');
  });

  it('shows "(auto)" label next to auto-detected fast mode', () => {
    render(<DeployModeToggle mode="fast" autoDetectedMode="fast" onModeChange={vi.fn()} />);

    expect(screen.getByText('(auto)')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /fast mode \(auto-detected\)/i })).toBeInTheDocument();
  });

  it('shows "(auto)" label next to auto-detected agent mode', () => {
    render(<DeployModeToggle mode="agent" autoDetectedMode="agent" onModeChange={vi.fn()} />);

    expect(screen.getByText('(auto)')).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /agent mode \(auto-detected\)/i })
    ).toBeInTheDocument();
  });

  it('has correct radiogroup role on container', () => {
    render(<DeployModeToggle mode="fast" onModeChange={vi.fn()} />);

    expect(screen.getByRole('radiogroup', { name: /analysis mode/i })).toBeInTheDocument();
  });
});
