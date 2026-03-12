import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteFeatureDialog } from '@/components/common/delete-feature-dialog';

describe('DeleteFeatureDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isDeleting: false,
    featureName: 'My Feature',
    featureId: 'feat-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('renders dialog content when open is true', () => {
      render(<DeleteFeatureDialog {...defaultProps} />);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('does not render dialog content when open is false', () => {
      render(<DeleteFeatureDialog {...defaultProps} open={false} />);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  describe('content', () => {
    it('renders feature name in description', () => {
      render(<DeleteFeatureDialog {...defaultProps} />);
      expect(screen.getByText(/My Feature/)).toBeInTheDocument();
    });

    it('renders feature id in description', () => {
      render(<DeleteFeatureDialog {...defaultProps} />);
      expect(screen.getByText(/feat-123/)).toBeInTheDocument();
    });

    it('renders cleanup checkbox checked by default', () => {
      render(<DeleteFeatureDialog {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox', { name: /clean up worktree and branches/i });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('confirm action', () => {
    it('calls onConfirm with cleanup=true and cascadeDelete=true by default', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<DeleteFeatureDialog {...defaultProps} onConfirm={onConfirm} />);
      await user.click(screen.getByRole('button', { name: /delete$/i }));
      expect(onConfirm).toHaveBeenCalledWith(true, true);
    });

    it('calls onConfirm with cleanup=false when cleanup checkbox is unchecked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<DeleteFeatureDialog {...defaultProps} onConfirm={onConfirm} />);
      await user.click(screen.getByRole('checkbox', { name: /clean up worktree and branches/i }));
      await user.click(screen.getByRole('button', { name: /delete$/i }));
      expect(onConfirm).toHaveBeenCalledWith(false, true);
    });
  });

  describe('deleting state', () => {
    it('disables delete button when isDeleting is true', () => {
      render(<DeleteFeatureDialog {...defaultProps} isDeleting />);
      expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
    });

    it('shows spinner when isDeleting is true', () => {
      render(<DeleteFeatureDialog {...defaultProps} isDeleting />);
      const button = screen.getByRole('button', { name: /deleting/i });
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('disables cancel button when isDeleting is true', () => {
      render(<DeleteFeatureDialog {...defaultProps} isDeleting />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('disables checkbox when isDeleting is true', () => {
      render(<DeleteFeatureDialog {...defaultProps} isDeleting />);
      expect(
        screen.getByRole('checkbox', { name: /clean up worktree and branches/i })
      ).toBeDisabled();
    });
  });

  describe('cascade delete checkbox', () => {
    it('does not show cascade checkbox when hasChildren is false', () => {
      render(<DeleteFeatureDialog {...defaultProps} hasChildren={false} />);
      expect(
        screen.queryByRole('checkbox', { name: /also delete sub-features/i })
      ).not.toBeInTheDocument();
    });

    it('does not show cascade checkbox when hasChildren is undefined', () => {
      render(<DeleteFeatureDialog {...defaultProps} />);
      expect(
        screen.queryByRole('checkbox', { name: /also delete sub-features/i })
      ).not.toBeInTheDocument();
    });

    it('shows cascade checkbox when hasChildren is true', () => {
      render(<DeleteFeatureDialog {...defaultProps} hasChildren={true} />);
      const checkbox = screen.getByRole('checkbox', { name: /also delete sub-features/i });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('data-state', 'checked');
    });

    it('calls onConfirm with cascadeDelete=false when cascade checkbox is unchecked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<DeleteFeatureDialog {...defaultProps} onConfirm={onConfirm} hasChildren={true} />);
      await user.click(screen.getByRole('checkbox', { name: /also delete sub-features/i }));
      await user.click(screen.getByRole('button', { name: /delete$/i }));
      expect(onConfirm).toHaveBeenCalledWith(true, false);
    });

    it('calls onConfirm with cascadeDelete=true when cascade checkbox stays checked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<DeleteFeatureDialog {...defaultProps} onConfirm={onConfirm} hasChildren={true} />);
      await user.click(screen.getByRole('button', { name: /delete$/i }));
      expect(onConfirm).toHaveBeenCalledWith(true, true);
    });

    it('resets cascade checkbox to checked when dialog reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<DeleteFeatureDialog {...defaultProps} hasChildren={true} />);

      // Uncheck the cascade checkbox
      await user.click(screen.getByRole('checkbox', { name: /also delete sub-features/i }));
      expect(screen.getByRole('checkbox', { name: /also delete sub-features/i })).toHaveAttribute(
        'data-state',
        'unchecked'
      );

      // Close dialog
      rerender(<DeleteFeatureDialog {...defaultProps} hasChildren={true} open={false} />);

      // Reopen dialog
      rerender(<DeleteFeatureDialog {...defaultProps} hasChildren={true} open={true} />);

      // Checkbox should be checked again
      expect(screen.getByRole('checkbox', { name: /also delete sub-features/i })).toHaveAttribute(
        'data-state',
        'checked'
      );
    });

    it('disables cascade checkbox when isDeleting is true', () => {
      render(<DeleteFeatureDialog {...defaultProps} hasChildren={true} isDeleting />);
      expect(screen.getByRole('checkbox', { name: /also delete sub-features/i })).toBeDisabled();
    });
  });

  describe('cancel action', () => {
    it('calls onOpenChange(false) when cancel is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<DeleteFeatureDialog {...defaultProps} onOpenChange={onOpenChange} />);
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('cleanup reset', () => {
    it('resets cleanup checkbox to checked when dialog reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<DeleteFeatureDialog {...defaultProps} />);

      // Uncheck the checkbox
      await user.click(screen.getByRole('checkbox', { name: /clean up worktree and branches/i }));
      expect(
        screen.getByRole('checkbox', { name: /clean up worktree and branches/i })
      ).toHaveAttribute('data-state', 'unchecked');

      // Close dialog
      rerender(<DeleteFeatureDialog {...defaultProps} open={false} />);

      // Reopen dialog
      rerender(<DeleteFeatureDialog {...defaultProps} open={true} />);

      // Checkbox should be checked again
      expect(
        screen.getByRole('checkbox', { name: /clean up worktree and branches/i })
      ).toHaveAttribute('data-state', 'checked');
    });
  });
});
