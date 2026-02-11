import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/common/empty-state';

describe('EmptyState', () => {
  it('renders title text', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders title as h3 heading', () => {
    render(<EmptyState title="No items found" />);
    const heading = screen.getByRole('heading', { level: 3, name: 'No items found' });
    expect(heading).toBeInTheDocument();
  });

  it('renders optional icon when provided', () => {
    render(<EmptyState title="No items" icon={<svg data-testid="custom-icon" />} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders optional description when provided', () => {
    render(<EmptyState title="No items" description="Try adding some items to get started." />);
    expect(screen.getByText('Try adding some items to get started.')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<EmptyState title="No items" />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(0);
  });

  it('renders optional action slot', () => {
    render(<EmptyState title="No items" action={<button>Add Item</button>} />);
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
  });

  it('applies custom className via cn()', () => {
    render(<EmptyState title="No items" className="custom-class" data-testid="empty-state" />);
    const element = screen.getByTestId('empty-state');
    expect(element).toHaveClass('custom-class');
  });

  it('has centered layout structure', () => {
    render(<EmptyState title="No items" data-testid="empty-state" />);
    const element = screen.getByTestId('empty-state');
    expect(element).toHaveClass('flex');
    expect(element).toHaveClass('flex-col');
    expect(element).toHaveClass('items-center');
    expect(element).toHaveClass('text-center');
  });

  it('has proper accessible structure', () => {
    render(
      <EmptyState
        title="No results"
        description="Try a different search term."
        icon={<svg data-testid="icon" aria-hidden="true" />}
        action={<button>Reset Search</button>}
      />
    );

    expect(screen.getByRole('heading', { level: 3, name: 'No results' })).toBeInTheDocument();
    expect(screen.getByText('Try a different search term.')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Search' })).toBeInTheDocument();
  });
});
