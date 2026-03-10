import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ShepLogo } from '@/components/common/shep-logo';

describe('ShepLogo', () => {
  it('renders an SVG element', () => {
    const { container } = render(<ShepLogo />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('applies hover:text-black class for hover color change', () => {
    const { container } = render(<ShepLogo />);
    const svg = container.querySelector('svg');
    expect(svg?.className.baseVal).toContain('hover:text-black');
  });

  it('applies hover:text-black class in dev variant', () => {
    const { container } = render(<ShepLogo variant="dev" />);
    const svg = container.querySelector('svg');
    expect(svg?.className.baseVal).toContain('hover:text-black');
  });

  it('preserves custom className alongside hover class', () => {
    const { container } = render(<ShepLogo className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg?.className.baseVal).toContain('hover:text-black');
    expect(svg?.className.baseVal).toContain('custom-class');
  });
});
