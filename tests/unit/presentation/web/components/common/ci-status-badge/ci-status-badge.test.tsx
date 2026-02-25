import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CiStatus } from '@shepai/core/domain/generated/output';
import { CiStatusBadge } from '@/components/common/ci-status-badge';

describe('CiStatusBadge', () => {
  it('renders green badge with "Passing" text for CiStatus.Success', () => {
    const { container } = render(<CiStatusBadge status={CiStatus.Success} />);

    expect(screen.getByText('Passing')).toBeInTheDocument();
    const badge = container.querySelector('[class*="bg-green"]');
    expect(badge).toBeInTheDocument();
  });

  it('renders yellow badge with animated spinner for CiStatus.Pending', () => {
    const { container } = render(<CiStatusBadge status={CiStatus.Pending} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders red badge with "Failing" text for CiStatus.Failure', () => {
    const { container } = render(<CiStatusBadge status={CiStatus.Failure} />);

    expect(screen.getByText('Failing')).toBeInTheDocument();
    const badge = container.querySelector('[class*="bg-red"]');
    expect(badge).toBeInTheDocument();
  });
});
