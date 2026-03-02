import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { markdownComponents } from '@/lib/markdown-components';

describe('markdownComponents', () => {
  it('exports all expected component keys', () => {
    const expectedKeys = ['p', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'a'];
    for (const key of expectedKeys) {
      expect(markdownComponents).toHaveProperty(key);
    }
  });

  it('renders links with target="_blank" and rel="noopener noreferrer"', () => {
    const AnchorComponent = markdownComponents.a as React.FC<{
      children: React.ReactNode;
      href: string;
    }>;
    render(<AnchorComponent href="https://example.com">example</AnchorComponent>);

    const link = screen.getByRole('link', { name: 'example' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('renders paragraphs with muted text styling', () => {
    const PComponent = markdownComponents.p as React.FC<{ children: React.ReactNode }>;
    render(<PComponent>Hello world</PComponent>);

    const p = screen.getByText('Hello world');
    expect(p.tagName).toBe('P');
    expect(p.className).toContain('text-muted-foreground');
  });

  it('renders inline code with muted background', () => {
    const CodeComponent = markdownComponents.code as React.FC<{
      children: React.ReactNode;
      className?: string;
    }>;
    render(<CodeComponent>myFunction()</CodeComponent>);

    const code = screen.getByText('myFunction()');
    expect(code.tagName).toBe('CODE');
    expect(code.className).toContain('bg-muted');
  });

  it('renders strong text with foreground styling', () => {
    const StrongComponent = markdownComponents.strong as React.FC<{ children: React.ReactNode }>;
    render(<StrongComponent>bold text</StrongComponent>);

    const strong = screen.getByText('bold text');
    expect(strong.tagName).toBe('STRONG');
    expect(strong.className).toContain('font-semibold');
  });
});
