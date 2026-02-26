import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeploymentState } from '@shepai/core/domain/generated/output';
import { DeploymentStatusBadge } from '@/components/common/deployment-status-badge';

describe('DeploymentStatusBadge', () => {
  it('renders spinning loader badge when status is Booting', () => {
    const { container } = render(<DeploymentStatusBadge status={DeploymentState.Booting} />);

    expect(screen.getByText('Starting...')).toBeInTheDocument();
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    const badge = container.querySelector('[class*="bg-blue"]');
    expect(badge).toBeInTheDocument();
  });

  it('renders green badge with clickable URL when status is Ready', () => {
    const { container } = render(
      <DeploymentStatusBadge status={DeploymentState.Ready} url="http://localhost:3000" />
    );

    const link = screen.getByRole('link', { name: /localhost:3000/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'http://localhost:3000');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    const badge = container.querySelector('[class*="bg-green"]');
    expect(badge).toBeInTheDocument();
  });

  it('renders "Ready" text when status is Ready but no URL', () => {
    render(<DeploymentStatusBadge status={DeploymentState.Ready} />);

    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('renders nothing when status is Stopped', () => {
    const { container } = render(<DeploymentStatusBadge status={DeploymentState.Stopped} />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when status is null', () => {
    const { container } = render(<DeploymentStatusBadge status={null} />);

    expect(container.innerHTML).toBe('');
  });
});
