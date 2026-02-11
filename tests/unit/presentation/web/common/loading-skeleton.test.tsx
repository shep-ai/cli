import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingSkeleton } from '@/components/common/loading-skeleton';

describe('LoadingSkeleton', () => {
  it('renders with default line variant', () => {
    const { container } = render(<LoadingSkeleton />);
    const skeleton = container.firstElementChild as HTMLElement;
    expect(skeleton).toHaveClass('rounded-md');
  });

  it('renders circle variant with rounded-full', () => {
    const { container } = render(<LoadingSkeleton variant="circle" />);
    const skeleton = container.firstElementChild as HTMLElement;
    expect(skeleton).toHaveClass('rounded-full');
  });

  it('renders card variant with larger rectangle and rounded corners', () => {
    const { container } = render(<LoadingSkeleton variant="card" />);
    const skeleton = container.firstElementChild as HTMLElement;
    expect(skeleton).toHaveClass('rounded-lg');
  });

  it('applies custom width via prop', () => {
    const { container } = render(<LoadingSkeleton width="200px" />);
    const skeleton = container.firstElementChild as HTMLElement;
    expect(skeleton.style.width).toBe('200px');
  });

  it('applies custom height via prop', () => {
    const { container } = render(<LoadingSkeleton height="48px" />);
    const skeleton = container.firstElementChild as HTMLElement;
    expect(skeleton.style.height).toBe('48px');
  });

  it('applies custom className via cn()', () => {
    const { container } = render(<LoadingSkeleton className="custom-class" />);
    const skeleton = container.firstElementChild as HTMLElement;
    expect(skeleton).toHaveClass('custom-class');
  });

  it('has animate-pulse class for loading animation', () => {
    const { container } = render(<LoadingSkeleton />);
    const skeleton = container.firstElementChild as HTMLElement;
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('renders as a div element', () => {
    const { container } = render(<LoadingSkeleton />);
    const skeleton = container.firstElementChild as HTMLElement;
    expect(skeleton.tagName).toBe('DIV');
  });

  it('has aria attributes for accessibility', () => {
    const { container } = render(<LoadingSkeleton />);
    const skeleton = container.firstElementChild as HTMLElement;
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-label');
  });
});
