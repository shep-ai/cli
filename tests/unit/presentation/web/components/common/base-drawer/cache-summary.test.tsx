import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CacheSummary } from '@/components/common/base-drawer/cache-summary';
import type { AnalysisSummary } from '@/hooks/use-deploy-action';

const baseSummary: AnalysisSummary = {
  canStart: true,
  language: 'TypeScript',
  framework: 'Next.js',
  commandCount: 2,
  ports: [3000, 3001],
  source: 'FastPath',
};

describe('CacheSummary', () => {
  it('displays language and framework', () => {
    render(<CacheSummary summary={baseSummary} onEdit={vi.fn()} onReAnalyze={vi.fn()} />);

    expect(screen.getByText('TypeScript / Next.js')).toBeInTheDocument();
  });

  it('displays language without framework when not provided', () => {
    const summary: AnalysisSummary = { ...baseSummary, framework: undefined };
    render(<CacheSummary summary={summary} onEdit={vi.fn()} onReAnalyze={vi.fn()} />);

    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('displays commands count', () => {
    render(<CacheSummary summary={baseSummary} onEdit={vi.fn()} onReAnalyze={vi.fn()} />);

    expect(screen.getByText('2 commands')).toBeInTheDocument();
  });

  it('displays singular "command" for count 1', () => {
    const summary: AnalysisSummary = { ...baseSummary, commandCount: 1 };
    render(<CacheSummary summary={summary} onEdit={vi.fn()} onReAnalyze={vi.fn()} />);

    expect(screen.getByText('1 command')).toBeInTheDocument();
  });

  it('displays ports', () => {
    render(<CacheSummary summary={baseSummary} onEdit={vi.fn()} onReAnalyze={vi.fn()} />);

    expect(screen.getByText('3000, 3001')).toBeInTheDocument();
  });

  it('does not display ports when not available', () => {
    const summary: AnalysisSummary = { ...baseSummary, ports: undefined };
    const { container } = render(
      <CacheSummary summary={summary} onEdit={vi.fn()} onReAnalyze={vi.fn()} />
    );

    // Only language and commands icons should be present, no globe icon for ports
    const icons = container.querySelectorAll('svg');
    // Code icon + Terminal icon + Pencil icon + RefreshCw icon = 4
    expect(icons.length).toBe(4);
  });

  it('calls onEdit when Edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<CacheSummary summary={baseSummary} onEdit={onEdit} onReAnalyze={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /edit config/i }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('calls onReAnalyze when Re-analyze button is clicked', () => {
    const onReAnalyze = vi.fn();
    render(<CacheSummary summary={baseSummary} onEdit={vi.fn()} onReAnalyze={onReAnalyze} />);

    fireEvent.click(screen.getByRole('button', { name: /re-analyze/i }));
    expect(onReAnalyze).toHaveBeenCalledOnce();
  });

  it('disables Re-analyze button when reAnalyzing is true', () => {
    render(
      <CacheSummary summary={baseSummary} onEdit={vi.fn()} onReAnalyze={vi.fn()} reAnalyzing />
    );

    expect(screen.getByRole('button', { name: /re-analyze/i })).toBeDisabled();
  });

  it('has data-testid="cache-summary"', () => {
    render(<CacheSummary summary={baseSummary} onEdit={vi.fn()} onReAnalyze={vi.fn()} />);

    expect(screen.getByTestId('cache-summary')).toBeInTheDocument();
  });
});
