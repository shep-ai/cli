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
    it('calls onConfirm with cleanup=true and cascadeDelete=false by default', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<DeleteFeatureDialog {...defaultProps} onConfirm={onConfirm} />);
      await user.click(screen.getByRole('button', { name: /delete$/i }));
      expect(onConfirm).toHaveBeenCalledWith(true, false, false);
    });

    it('calls onConfirm with cleanup=false when cleanup checkbox is unchecked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<DeleteFeatureDialog {...defaultProps} onConfirm={onConfirm} />);
      await user.click(screen.getByRole('checkbox', { name: /clean up worktree and branches/i }));
      await user.click(screen.getByRole('button', { name: /delete$/i }));
      expect(onConfirm).toHaveBeenCalledWith(false, false, false);
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
        screen.queryByRole('checkbox', { name: /delete sub-features/i })
      ).not.toBeInTheDocument();
    });

    it('does not show cascade checkbox when hasChildren is undefined', () => {
      render(<DeleteFeatureDialog {...defaultProps} />);
      expect(
        screen.queryByRole('checkbox', { name: /delete sub-features/i })
      ).not.toBeInTheDocument();
    });

    it('shows cascade checkbox when hasChildren is true', () => {
      render(<DeleteFeatureDialog {...defaultProps} hasChildren={true} />);
      const checkbox = screen.getByRole('checkbox', { name: /delete sub-features/i });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('data-state', 'unchecked');
    });

    it('calls onConfirm with cascadeDelete=true when cascade checkbox is checked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<DeleteFeatureDialog {...defaultProps} onConfirm={onConfirm} hasChildren={true} />);
      await user.click(screen.getByRole('checkbox', { name: /delete sub-features/i }));
      await user.click(screen.getByRole('button', { name: /delete$/i }));
      expect(onConfirm).toHaveBeenCalledWith(true, true, false);
    });

    it('calls onConfirm with cascadeDelete=false when cascade checkbox stays unchecked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<DeleteFeatureDialog {...defaultProps} onConfirm={onConfirm} hasChildren={true} />);
      await user.click(screen.getByRole('button', { name: /delete$/i }));
      expect(onConfirm).toHaveBeenCalledWith(true, false, false);
    });

    it('resets cascade checkbox to unchecked when dialog reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<DeleteFeatureDialog {...defaultProps} hasChildren={true} />);

      // Check the cascade checkbox
      await user.click(screen.getByRole('checkbox', { name: /delete sub-features/i }));
      expect(screen.getByRole('checkbox', { name: /delete sub-features/i })).toHaveAttribute(
        'data-state',
        'checked'
      );

      // Close dialog
      rerender(<DeleteFeatureDialog {...defaultProps} hasChildren={true} open={false} />);

      // Reopen dialog
      rerender(<DeleteFeatureDialog {...defaultProps} hasChildren={true} open={true} />);

      // Checkbox should be unchecked again
      expect(screen.getByRole('checkbox', { name: /delete sub-features/i })).toHaveAttribute(
        'data-state',
        'unchecked'
      );
    });

    it('disables cascade checkbox when isDeleting is true', () => {
      render(<DeleteFeatureDialog {...defaultProps} hasChildren={true} isDeleting />);
      expect(screen.getByRole('checkbox', { name: /delete sub-features/i })).toBeDisabled();
    });
  });

  describe('close PR checkbox', () => {
    it('does not render close-PR checkbox when hasOpenPr is false', () => {
      render(<DeleteFeatureDialog {...defaultProps} hasOpenPr={false} />);
      expect(
        screen.queryByRole('checkbox', { name: /close pull request/i })
      ).not.toBeInTheDocument();
    });

    it('does not render close-PR checkbox when hasOpenPr is undefined', () => {
      render(<DeleteFeatureDialog {...defaultProps} />);
      expect(
        screen.queryByRole('checkbox', { name: /close pull request/i })
      ).not.toBeInTheDocument();
    });

    it('renders close-PR checkbox when hasOpenPr is true', () => {
      render(<DeleteFeatureDialog {...defaultProps} hasOpenPr={true} />);
      const checkbox = screen.getByRole('checkbox', { name: /close pull request/i });
      expect(checkbox).toBeInTheDocument();
    });

    it('close-PR checkbox should be checked by default', () => {
      render(<DeleteFeatureDialog {...defaultProps} hasOpenPr={true} />);
      const checkbox = screen.getByRole('checkbox', { name: /close pull request/i });
      expect(checkbox).toHaveAttribute('data-state', 'checked');
    });

    it('close-PR checkbox should uncheck and disable when cleanup is unchecked', async () => {
      const user = userEvent.setup();
      render(<DeleteFeatureDialog {...defaultProps} hasOpenPr={true} />);

      // Uncheck cleanup
      await user.click(screen.getByRole('checkbox', { name: /clean up worktree and branches/i }));

      const closePrCheckbox = screen.getByRole('checkbox', { name: /close pull request/i });
      expect(closePrCheckbox).toHaveAttribute('data-state', 'unchecked');
      expect(closePrCheckbox).toBeDisabled();
    });

    it('close-PR checkbox should re-enable and re-check when cleanup is re-checked', async () => {
      const user = userEvent.setup();
      render(<DeleteFeatureDialog {...defaultProps} hasOpenPr={true} />);

      // Uncheck cleanup
      await user.click(screen.getByRole('checkbox', { name: /clean up worktree and branches/i }));

      // Re-check cleanup
      await user.click(screen.getByRole('checkbox', { name: /clean up worktree and branches/i }));

      const closePrCheckbox = screen.getByRole('checkbox', { name: /close pull request/i });
      expect(closePrCheckbox).toHaveAttribute('data-state', 'checked');
      expect(closePrCheckbox).not.toBeDisabled();
    });

    it('should pass closePr=true to onConfirm when checkbox is checked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<DeleteFeatureDialog {...defaultProps} onConfirm={onConfirm} hasOpenPr={true} />);
      await user.click(screen.getByRole('button', { name: /delete$/i }));
      expect(onConfirm).toHaveBeenCalledWith(true, false, true);
    });

    it('should pass closePr=false to onConfirm when checkbox is unchecked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<DeleteFeatureDialog {...defaultProps} onConfirm={onConfirm} hasOpenPr={true} />);

      // Uncheck closePr
      await user.click(screen.getByRole('checkbox', { name: /close pull request/i }));
      await user.click(screen.getByRole('button', { name: /delete$/i }));
      expect(onConfirm).toHaveBeenCalledWith(true, false, false);
    });

    it('resets close-PR checkbox to checked when dialog reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<DeleteFeatureDialog {...defaultProps} hasOpenPr={true} />);

      // Uncheck the close-PR checkbox
      await user.click(screen.getByRole('checkbox', { name: /close pull request/i }));
      expect(screen.getByRole('checkbox', { name: /close pull request/i })).toHaveAttribute(
        'data-state',
        'unchecked'
      );

      // Close dialog
      rerender(<DeleteFeatureDialog {...defaultProps} hasOpenPr={true} open={false} />);

      // Reopen dialog
      rerender(<DeleteFeatureDialog {...defaultProps} hasOpenPr={true} open={true} />);

      // Checkbox should be checked again
      expect(screen.getByRole('checkbox', { name: /close pull request/i })).toHaveAttribute(
        'data-state',
        'checked'
      );
    });

    it('disables close-PR checkbox when isDeleting is true', () => {
      render(<DeleteFeatureDialog {...defaultProps} hasOpenPr={true} isDeleting />);
      expect(screen.getByRole('checkbox', { name: /close pull request/i })).toBeDisabled();
    });

    it('user can independently uncheck closePr while cleanup remains checked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<DeleteFeatureDialog {...defaultProps} onConfirm={onConfirm} hasOpenPr={true} />);

      // Uncheck only closePr, leave cleanup checked
      await user.click(screen.getByRole('checkbox', { name: /close pull request/i }));

      // Verify cleanup is still checked
      expect(
        screen.getByRole('checkbox', { name: /clean up worktree and branches/i })
      ).toHaveAttribute('data-state', 'checked');

      // Verify closePr is unchecked
      expect(screen.getByRole('checkbox', { name: /close pull request/i })).toHaveAttribute(
        'data-state',
        'unchecked'
      );

      await user.click(screen.getByRole('button', { name: /delete$/i }));
      expect(onConfirm).toHaveBeenCalledWith(true, false, false);
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
