import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryFilter } from '@/components/features/skills/category-filter';

describe('CategoryFilter', () => {
  it('renders all 5 category buttons', () => {
    render(<CategoryFilter activeCategory={null} onCategoryChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /All/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Workflow/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Code Generation/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analysis/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reference/ })).toBeInTheDocument();
  });

  it('All button has default variant when activeCategory is null', () => {
    render(<CategoryFilter activeCategory={null} onCategoryChange={vi.fn()} />);
    const allButton = screen.getByRole('button', { name: /All/ });
    expect(allButton).toHaveAttribute('data-variant', 'default');
  });

  it('Workflow button has default variant when activeCategory is Workflow', () => {
    render(<CategoryFilter activeCategory="Workflow" onCategoryChange={vi.fn()} />);
    const workflowButton = screen.getByRole('button', { name: /Workflow/ });
    expect(workflowButton).toHaveAttribute('data-variant', 'default');
  });

  it('non-active buttons have outline variant', () => {
    render(<CategoryFilter activeCategory="Workflow" onCategoryChange={vi.fn()} />);
    const allButton = screen.getByRole('button', { name: /All/ });
    expect(allButton).toHaveAttribute('data-variant', 'outline');
    const analysisButton = screen.getByRole('button', { name: /Analysis/ });
    expect(analysisButton).toHaveAttribute('data-variant', 'outline');
  });

  it('clicking a category button calls onCategoryChange with correct value', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    render(<CategoryFilter activeCategory={null} onCategoryChange={onCategoryChange} />);

    await user.click(screen.getByRole('button', { name: /Workflow/ }));
    expect(onCategoryChange).toHaveBeenCalledWith('Workflow');
  });

  it('clicking All button calls onCategoryChange with null', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    render(<CategoryFilter activeCategory="Workflow" onCategoryChange={onCategoryChange} />);

    await user.click(screen.getByRole('button', { name: /All/ }));
    expect(onCategoryChange).toHaveBeenCalledWith(null);
  });

  it('clicking Code Generation calls onCategoryChange with "Code Generation"', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    render(<CategoryFilter activeCategory={null} onCategoryChange={onCategoryChange} />);

    await user.click(screen.getByRole('button', { name: /Code Generation/ }));
    expect(onCategoryChange).toHaveBeenCalledWith('Code Generation');
  });

  it('renders category counts when counts prop is provided', () => {
    const counts = { Workflow: 8, 'Code Generation': 1, Analysis: 2, Reference: 7 };
    render(<CategoryFilter activeCategory={null} onCategoryChange={vi.fn()} counts={counts} />);
    expect(screen.getByText('(8)')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.getByText('(7)')).toBeInTheDocument();
  });

  it('does not render counts for All button', () => {
    const counts = { Workflow: 8, 'Code Generation': 1, Analysis: 2, Reference: 7 };
    render(<CategoryFilter activeCategory={null} onCategoryChange={vi.fn()} counts={counts} />);
    const allButton = screen.getByRole('button', { name: /All/ });
    expect(allButton).not.toHaveTextContent('(');
  });

  it('has role="group" with accessible label', () => {
    render(<CategoryFilter activeCategory={null} onCategoryChange={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Filter by category' })).toBeInTheDocument();
  });
});
