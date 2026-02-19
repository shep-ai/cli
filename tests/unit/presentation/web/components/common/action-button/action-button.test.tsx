import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Code2 } from 'lucide-react';
import { ActionButton } from '@/components/common/action-button';

describe('ActionButton', () => {
  const defaultProps = {
    label: 'Open in IDE',
    onClick: vi.fn(),
    loading: false,
    error: false,
    icon: Code2,
  };

  describe('label rendering', () => {
    it('renders label text when iconOnly is false (default)', () => {
      render(<ActionButton {...defaultProps} />);
      expect(screen.getByRole('button', { name: /open in ide/i })).toHaveTextContent('Open in IDE');
    });

    it('does not render label text when iconOnly is true', () => {
      render(<ActionButton {...defaultProps} iconOnly />);
      const button = screen.getByRole('button', { name: /open in ide/i });
      expect(button).not.toHaveTextContent('Open in IDE');
    });
  });

  describe('aria-label', () => {
    it('has aria-label when iconOnly is false', () => {
      render(<ActionButton {...defaultProps} />);
      expect(screen.getByRole('button', { name: /open in ide/i })).toHaveAttribute(
        'aria-label',
        'Open in IDE'
      );
    });

    it('has aria-label when iconOnly is true', () => {
      render(<ActionButton {...defaultProps} iconOnly />);
      expect(screen.getByRole('button', { name: /open in ide/i })).toHaveAttribute(
        'aria-label',
        'Open in IDE'
      );
    });
  });

  describe('icon states', () => {
    it('renders Loader2 spinner when loading is true', () => {
      render(<ActionButton {...defaultProps} loading />);
      const button = screen.getByRole('button', { name: /open in ide/i });
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('renders CircleAlert when error is true', () => {
      render(<ActionButton {...defaultProps} error />);
      const button = screen.getByRole('button', { name: /open in ide/i });
      expect(button.querySelector('.lucide-circle-alert')).toBeInTheDocument();
    });

    it('renders provided icon in normal state', () => {
      render(<ActionButton {...defaultProps} />);
      const button = screen.getByRole('button', { name: /open in ide/i });
      // Should have an SVG icon, and it should NOT be the spinner or error icon
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).not.toHaveClass('animate-spin');
      expect(svg).not.toHaveClass('lucide-circle-alert');
    });
  });

  describe('disabled state', () => {
    it('button is disabled when loading is true', () => {
      render(<ActionButton {...defaultProps} loading />);
      expect(screen.getByRole('button', { name: /open in ide/i })).toBeDisabled();
    });

    it('button is not disabled when loading is false', () => {
      render(<ActionButton {...defaultProps} />);
      expect(screen.getByRole('button', { name: /open in ide/i })).not.toBeDisabled();
    });
  });

  describe('error styling', () => {
    it('applies text-destructive class when error is true', () => {
      render(<ActionButton {...defaultProps} error />);
      expect(screen.getByRole('button', { name: /open in ide/i })).toHaveClass('text-destructive');
    });

    it('does not apply text-destructive class when error is false', () => {
      render(<ActionButton {...defaultProps} />);
      expect(screen.getByRole('button', { name: /open in ide/i })).not.toHaveClass(
        'text-destructive'
      );
    });
  });

  describe('variant and size props', () => {
    it('uses default variant outline and size sm', () => {
      render(<ActionButton {...defaultProps} />);
      const button = screen.getByRole('button', { name: /open in ide/i });
      expect(button).toHaveAttribute('data-variant', 'outline');
      expect(button).toHaveAttribute('data-size', 'sm');
    });

    it('accepts custom variant and size props', () => {
      render(<ActionButton {...defaultProps} variant="ghost" size="icon-xs" />);
      const button = screen.getByRole('button', { name: /open in ide/i });
      expect(button).toHaveAttribute('data-variant', 'ghost');
      expect(button).toHaveAttribute('data-size', 'icon-xs');
    });
  });

  describe('click handler', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      render(<ActionButton {...defaultProps} onClick={onClick} />);
      screen.getByRole('button', { name: /open in ide/i }).click();
      expect(onClick).toHaveBeenCalledOnce();
    });
  });
});
