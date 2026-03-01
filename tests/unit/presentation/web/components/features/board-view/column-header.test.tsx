import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ColumnHeader } from '@/components/features/board-view/column-header';

describe('ColumnHeader', () => {
  it('renders column label text', () => {
    render(<ColumnHeader label="Requirements" count={5} />);
    expect(screen.getByText('Requirements')).toBeInTheDocument();
  });

  it('renders count badge with correct number', () => {
    render(<ColumnHeader label="Implementation" count={12} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders zero count with secondary badge variant', () => {
    render(<ColumnHeader label="Done" count={0} />);
    const badge = screen.getByText('0');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-secondary');
  });

  it('renders non-zero count with default badge variant', () => {
    render(<ColumnHeader label="Review" count={3} />);
    const badge = screen.getByText('3');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-primary');
  });

  it('renders large count numbers', () => {
    render(<ColumnHeader label="Backlog" count={150} />);
    expect(screen.getByText('150')).toBeInTheDocument();
  });
});
