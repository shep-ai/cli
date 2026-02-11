import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/layouts/header';

describe('Header', () => {
  it('renders title text', () => {
    render(<Header title="Dashboard" />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders optional breadcrumbs slot', () => {
    render(
      <Header title="Settings" breadcrumbs={<nav data-testid="breadcrumbs">Home / Settings</nav>} />
    );

    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    expect(screen.getByText('Home / Settings')).toBeInTheDocument();
  });

  it('renders optional actions slot', () => {
    render(
      <Header title="Features" actions={<button data-testid="action-btn">New Feature</button>} />
    );

    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
    expect(screen.getByText('New Feature')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Header title="Test" className="custom-header" />);

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('custom-header');
  });

  it('has proper semantic structure (header element)', () => {
    render(<Header title="Semantic Test" />);

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header.tagName).toBe('HEADER');
  });
});
