import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ShepLogo } from '@/components/common/shep-logo';

describe('ShepLogo', () => {
  it('renders an svg element', () => {
    const { container } = render(<ShepLogo />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('does not apply a color class in default variant', () => {
    const { container } = render(<ShepLogo />);
    const svg = container.querySelector('svg')!;
    expect(svg.className.baseVal).not.toContain('text-blue');
  });

  it('applies blue color class in dev variant', () => {
    const { container } = render(<ShepLogo variant="dev" />);
    const svg = container.querySelector('svg')!;
    expect(svg.className.baseVal).toContain('text-blue-500');
  });

  it('uses the specified size', () => {
    const { container } = render(<ShepLogo size={32} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('height')).toBe('32');
  });
});
