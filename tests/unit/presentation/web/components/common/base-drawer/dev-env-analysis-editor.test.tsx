import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalysisSource } from '@shepai/core/domain/generated/output';
import type { DevEnvironmentAnalysis } from '@shepai/core/domain/generated/output';
import { DevEnvAnalysisEditor } from '@/components/common/base-drawer/dev-env-analysis-editor';

const baseAnalysis: DevEnvironmentAnalysis = {
  id: 'test-id',
  cacheKey: 'git@github.com:org/repo.git',
  canStart: true,
  commands: [{ command: 'npm run dev', description: 'Start dev server' }],
  ports: [3000],
  prerequisites: ['Node.js 18+'],
  environmentVariables: { PORT: '3000' },
  language: 'TypeScript',
  framework: 'Next.js',
  source: AnalysisSource.FastPath,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('DevEnvAnalysisEditor', () => {
  it('renders all fields from analysis', () => {
    render(<DevEnvAnalysisEditor analysis={baseAnalysis} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByTestId('dev-env-analysis-editor')).toBeInTheDocument();
    expect(screen.getByLabelText(/can start/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toHaveValue('TypeScript');
    expect(screen.getByLabelText('Framework')).toHaveValue('Next.js');
    expect(screen.getByLabelText('Command 1')).toHaveValue('npm run dev');
    expect(screen.getByLabelText('Command 1 description')).toHaveValue('Start dev server');
    expect(screen.getByLabelText('Port 1')).toHaveValue(3000);
    expect(screen.getByLabelText('Prerequisite 1')).toHaveValue('Node.js 18+');
    expect(screen.getByLabelText('Env var 1 key')).toHaveValue('PORT');
    expect(screen.getByLabelText('Env var 1 value')).toHaveValue('3000');
  });

  it('adds a command when Add command button is clicked', () => {
    render(<DevEnvAnalysisEditor analysis={baseAnalysis} onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /add command/i }));
    expect(screen.getByLabelText('Command 2')).toBeInTheDocument();
  });

  it('removes a command when Remove button is clicked', () => {
    render(<DevEnvAnalysisEditor analysis={baseAnalysis} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Command 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remove command 1/i }));
    expect(screen.queryByLabelText('Command 1')).not.toBeInTheDocument();
  });

  it('toggles canStart switch', async () => {
    const user = userEvent.setup();
    render(<DevEnvAnalysisEditor analysis={baseAnalysis} onSave={vi.fn()} onCancel={vi.fn()} />);

    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('data-state', 'checked');

    await user.click(switchEl);
    expect(switchEl).toHaveAttribute('data-state', 'unchecked');

    // Reason field should appear when canStart is false
    expect(screen.getByLabelText('Reason')).toBeInTheDocument();
  });

  it('calls onSave with updated analysis on form submit', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<DevEnvAnalysisEditor analysis={baseAnalysis} onSave={onSave} onCancel={vi.fn()} />);

    // Change language
    const langInput = screen.getByLabelText('Language');
    await user.clear(langInput);
    await user.type(langInput, 'JavaScript');

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledOnce();
    const savedAnalysis = onSave.mock.calls[0][0];
    expect(savedAnalysis.language).toBe('JavaScript');
    expect(savedAnalysis.canStart).toBe(true);
    expect(savedAnalysis.commands).toHaveLength(1);
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<DevEnvAnalysisEditor analysis={baseAnalysis} onSave={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('adds a port when Add port button is clicked', () => {
    render(<DevEnvAnalysisEditor analysis={baseAnalysis} onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /add port/i }));
    expect(screen.getByLabelText('Port 2')).toBeInTheDocument();
  });

  it('adds a prerequisite when Add prerequisite button is clicked', () => {
    render(<DevEnvAnalysisEditor analysis={baseAnalysis} onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /add prerequisite/i }));
    expect(screen.getByLabelText('Prerequisite 2')).toBeInTheDocument();
  });

  it('adds an environment variable when Add variable button is clicked', () => {
    render(<DevEnvAnalysisEditor analysis={baseAnalysis} onSave={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /add environment variable/i }));
    expect(screen.getByLabelText('Env var 2 key')).toBeInTheDocument();
  });

  it('shows reason field only when canStart is false', () => {
    const notStartableAnalysis: DevEnvironmentAnalysis = {
      ...baseAnalysis,
      canStart: false,
      reason: 'No server to start',
    };
    render(
      <DevEnvAnalysisEditor analysis={notStartableAnalysis} onSave={vi.fn()} onCancel={vi.fn()} />
    );

    expect(screen.getByLabelText('Reason')).toHaveValue('No server to start');
  });
});
