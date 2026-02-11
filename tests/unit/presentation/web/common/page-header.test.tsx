import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '@/components/common/page-header';

describe('PageHeader', () => {
  it('renders title text', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders optional description when provided', () => {
    render(<PageHeader title="Dashboard" description="Overview of your projects" />);
    expect(screen.getByText('Overview of your projects')).toBeInTheDocument();
  });

  it('does not render description element when not provided', () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    const description = container.querySelector('p');
    expect(description).not.toBeInTheDocument();
  });

  it('renders children in action slot', () => {
    render(
      <PageHeader title="Dashboard">
        <button>Create New</button>
      </PageHeader>
    );
    expect(screen.getByRole('button', { name: /create new/i })).toBeInTheDocument();
  });

  it('applies custom className via cn() merging', () => {
    const { container } = render(<PageHeader title="Dashboard" className="custom-class" />);
    const header = container.querySelector('header');
    expect(header).toHaveClass('custom-class');
  });

  it('uses h1 heading element for title', () => {
    render(<PageHeader title="Dashboard" />);
    const heading = screen.getByRole('heading', { level: 1, name: 'Dashboard' });
    expect(heading).toBeInTheDocument();
  });

  it('has proper semantic structure with header element', () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header).toContainElement(screen.getByRole('heading', { level: 1 }));
  });

  it('does not render action slot wrapper when no children provided', () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    const actionSlot = container.querySelector('[data-slot="actions"]');
    expect(actionSlot).not.toBeInTheDocument();
  });
});
