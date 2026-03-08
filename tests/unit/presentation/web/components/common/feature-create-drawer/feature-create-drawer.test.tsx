import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureCreateDrawer } from '@/components/common/feature-create-drawer';
import { DrawerCloseGuardProvider } from '@/hooks/drawer-close-guard';
import type { FileAttachment } from '@shepai/core/infrastructure/services/file-dialog.service';

// Mock pickFiles client helper
const mockPickFiles = vi.fn<() => Promise<FileAttachment[] | null>>();
vi.mock('@/components/common/feature-create-drawer/pick-files', () => ({
  pickFiles: () => mockPickFiles(),
}));

const mockCreatePlay = vi.fn();

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: vi.fn((action: string) => {
    if (action === 'create') return { play: mockCreatePlay, stop: vi.fn(), isPlaying: false };
    return { play: vi.fn(), stop: vi.fn(), isPlaying: false };
  }),
}));

// Vaul drawer uses pointer capture + getComputedStyle().transform in jsdom — stub to avoid exceptions
beforeAll(() => {
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();

  const original = window.getComputedStyle;
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
    const style = original(el, pseudo);
    if (!style.transform) {
      Object.defineProperty(style, 'transform', { value: 'none', configurable: true });
    }
    return style;
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  mockPickFiles.mockResolvedValue(null);
});

const descriptionPlaceholder =
  'e.g. Add GitHub OAuth login with callback handling and token refresh...';

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  repositoryPath: '/Users/dev/my-repo',
  isSubmitting: false,
};

function renderDrawer(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(
    <DrawerCloseGuardProvider>
      <FeatureCreateDrawer {...props} />
    </DrawerCloseGuardProvider>
  );
}

const mockPdf: FileAttachment = {
  path: '/Users/dev/docs/requirements.pdf',
  name: 'requirements.pdf',
  size: 42000,
};

const mockPng: FileAttachment = {
  path: '/Users/dev/images/screenshot.png',
  name: 'screenshot.png',
  size: 150000,
};

const mockTs: FileAttachment = {
  path: '/Users/dev/src/index.ts',
  name: 'index.ts',
  size: 1024,
};

describe('FeatureCreateDrawer', () => {
  describe('rendering', () => {
    it('renders the drawer header when open', () => {
      renderDrawer();
      expect(screen.getByText('NEW FEATURE')).toBeInTheDocument();
    });

    it('does not render a feature name input', () => {
      renderDrawer();
      expect(screen.queryByPlaceholderText('e.g. GitHub OAuth Login')).not.toBeInTheDocument();
    });

    it('renders description textarea with updated label', () => {
      renderDrawer();
      expect(screen.getByText('DESCRIBE YOUR FEATURE')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(descriptionPlaceholder)).toBeInTheDocument();
    });

    it('renders add files button', () => {
      renderDrawer();
      expect(screen.getByRole('button', { name: /add files/i })).toBeInTheDocument();
    });

    it('renders cancel and submit buttons', () => {
      renderDrawer();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '+ Create Feature' })).toBeInTheDocument();
    });
  });

  describe('form input', () => {
    it('accepts text in the description field', async () => {
      const user = userEvent.setup();
      renderDrawer();

      const descInput = screen.getByPlaceholderText(descriptionPlaceholder);
      await user.type(descInput, 'Implement OAuth2');
      expect(descInput).toHaveValue('Implement OAuth2');
    });
  });

  describe('validation', () => {
    it('disables submit button when description is empty', () => {
      renderDrawer();
      expect(screen.getByRole('button', { name: '+ Create Feature' })).toBeDisabled();
    });

    it('enables submit button when description has content', async () => {
      const user = userEvent.setup();
      renderDrawer();

      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'Add OAuth login');
      expect(screen.getByRole('button', { name: '+ Create Feature' })).toBeEnabled();
    });

    it('disables submit button when description is only whitespace', async () => {
      const user = userEvent.setup();
      renderDrawer();

      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), '   ');
      expect(screen.getByRole('button', { name: '+ Create Feature' })).toBeDisabled();
    });
  });

  describe('submission', () => {
    it('calls onSubmit with payload containing description (no name field)', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), '  OAuth2 flow  ');
      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));

      expect(onSubmit).toHaveBeenCalledOnce();
      const payload = onSubmit.mock.calls[0][0];
      expect(payload).toEqual({
        description: 'OAuth2 flow',
        attachments: [],
        repositoryPath: '/Users/dev/my-repo',
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
        push: false,
        openPr: false,
        fast: false,
      });
      expect(payload).not.toHaveProperty('name');
    });

    it('includes attachments array with file objects', async () => {
      mockPickFiles.mockResolvedValue([mockPdf]);
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'Add a feature');
      await user.click(screen.getByRole('button', { name: /add files/i }));

      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));

      expect(onSubmit).toHaveBeenCalledOnce();
      const submittedData = onSubmit.mock.calls[0][0];
      expect(submittedData.description).toBe('Add a feature');
      expect(submittedData.attachments).toEqual([mockPdf]);
      expect(submittedData.repositoryPath).toBe('/Users/dev/my-repo');
      expect(submittedData).not.toHaveProperty('name');
    });

    it('sends approvalGates with only PRD checked', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'Add a feature');
      await user.click(screen.getByLabelText('PRD'));
      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: true, allowPlan: false, allowMerge: false },
        })
      );
    });

    it('sends all-true approvalGates when all checkboxes are checked', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'Add a feature');
      await user.click(screen.getByLabelText('PRD'));
      await user.click(screen.getByLabelText('Plan'));
      await user.click(screen.getByLabelText('Merge'));
      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
        })
      );
    });

    it('sends all-false approvalGates when no checkboxes are checked', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'Add a feature');
      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
        })
      );
    });
  });

  describe('checkbox reset on close', () => {
    it('resets all checkboxes to unchecked after close and reopen', async () => {
      const onClose = vi.fn();
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(
        <DrawerCloseGuardProvider>
          <FeatureCreateDrawer
            open={true}
            onClose={onClose}
            onSubmit={onSubmit}
            repositoryPath="/repo"
          />
        </DrawerCloseGuardProvider>
      );

      // Check some boxes
      await user.click(screen.getByLabelText('PRD'));
      await user.click(screen.getByLabelText('Merge'));
      expect(screen.getByLabelText('PRD')).toBeChecked();
      expect(screen.getByLabelText('Merge')).toBeChecked();

      // Close and reopen (unmount/remount simulates close + reopen)
      rerender(<div />);
      rerender(
        <DrawerCloseGuardProvider>
          <FeatureCreateDrawer
            open={true}
            onClose={onClose}
            onSubmit={onSubmit}
            repositoryPath="/repo"
          />
        </DrawerCloseGuardProvider>
      );

      // Default should be restored - all unchecked including parent
      expect(screen.getByLabelText('Auto approve all')).not.toBeChecked();
      expect(screen.getByLabelText('PRD')).not.toBeChecked();
      expect(screen.getByLabelText('Plan')).not.toBeChecked();
      expect(screen.getByLabelText('Merge')).not.toBeChecked();
    });
  });

  describe('submitting state', () => {
    it('disables description textarea when isSubmitting', () => {
      renderDrawer({ isSubmitting: true });
      expect(screen.getByPlaceholderText(descriptionPlaceholder)).toBeDisabled();
    });

    it('disables add files button when isSubmitting', () => {
      renderDrawer({ isSubmitting: true });
      expect(screen.getByRole('button', { name: /add files/i })).toBeDisabled();
    });

    it('shows "Creating..." on submit button when isSubmitting', () => {
      renderDrawer({ isSubmitting: true });
      expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument();
    });

    it('disables cancel button when isSubmitting', () => {
      renderDrawer({ isSubmitting: true });
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });
  });

  describe('auto-approve checkboxes', () => {
    it('renders "APPROVE" section title and "Autonomous Mode" parent label', () => {
      renderDrawer();
      expect(screen.getByText('APPROVE')).toBeInTheDocument();
      expect(screen.getByText('Autonomous Mode')).toBeInTheDocument();
    });

    it('renders parent checkbox and 3 child checkboxes', () => {
      renderDrawer();
      expect(screen.getByLabelText('Auto approve all')).toBeInTheDocument();
      expect(screen.getByLabelText('PRD')).toBeInTheDocument();
      expect(screen.getByLabelText('Plan')).toBeInTheDocument();
      expect(screen.getByLabelText('Merge')).toBeInTheDocument();
    });

    it('each child checkbox has a description', () => {
      renderDrawer();
      expect(screen.getByText('Auto-approve requirements move to planning.')).toBeInTheDocument();
      expect(screen.getByText('Auto-approve planning move to implementation.')).toBeInTheDocument();
      expect(screen.getByText('Auto-approve merge move to Done.')).toBeInTheDocument();
    });

    it('all checkboxes are unchecked by default', () => {
      renderDrawer();
      expect(screen.getByLabelText('Auto approve all')).not.toBeChecked();
      expect(screen.getByLabelText('PRD')).not.toBeChecked();
      expect(screen.getByLabelText('Plan')).not.toBeChecked();
      expect(screen.getByLabelText('Merge')).not.toBeChecked();
    });

    it('all checkboxes are disabled when isSubmitting=true', () => {
      renderDrawer({ isSubmitting: true });
      expect(screen.getByLabelText('Auto approve all')).toBeDisabled();
      expect(screen.getByLabelText('PRD')).toBeDisabled();
      expect(screen.getByLabelText('Plan')).toBeDisabled();
      expect(screen.getByLabelText('Merge')).toBeDisabled();
    });

    it('clicking PRD checkbox toggles it on', async () => {
      const user = userEvent.setup();
      renderDrawer();

      const prdCheckbox = screen.getByLabelText('PRD');
      expect(prdCheckbox).not.toBeChecked();
      await user.click(prdCheckbox);
      expect(prdCheckbox).toBeChecked();
    });
  });

  describe('auto-approve parent checkbox (tri-state)', () => {
    it('parent is unchecked when no children are selected', () => {
      renderDrawer();
      const parent = screen.getByLabelText('Auto approve all');
      expect(parent).not.toBeChecked();
      expect(parent).toHaveAttribute('data-state', 'unchecked');
    });

    it('parent becomes indeterminate when some children are selected', async () => {
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByLabelText('PRD'));

      const parent = screen.getByLabelText('Auto approve all');
      expect(parent).toHaveAttribute('data-state', 'indeterminate');
    });

    it('parent becomes checked when all children are selected', async () => {
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByLabelText('PRD'));
      await user.click(screen.getByLabelText('Plan'));
      await user.click(screen.getByLabelText('Merge'));

      const parent = screen.getByLabelText('Auto approve all');
      expect(parent).toHaveAttribute('data-state', 'checked');
    });

    it('clicking parent selects all children when none are selected', async () => {
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByLabelText('Auto approve all'));

      expect(screen.getByLabelText('PRD')).toBeChecked();
      expect(screen.getByLabelText('Plan')).toBeChecked();
      expect(screen.getByLabelText('Merge')).toBeChecked();
    });

    it('clicking parent selects all children when some are selected (indeterminate)', async () => {
      const user = userEvent.setup();
      renderDrawer();

      // Select only PRD → parent becomes indeterminate
      await user.click(screen.getByLabelText('PRD'));
      expect(screen.getByLabelText('Auto approve all')).toHaveAttribute(
        'data-state',
        'indeterminate'
      );

      // Click parent → all should become checked
      await user.click(screen.getByLabelText('Auto approve all'));

      expect(screen.getByLabelText('PRD')).toBeChecked();
      expect(screen.getByLabelText('Plan')).toBeChecked();
      expect(screen.getByLabelText('Merge')).toBeChecked();
      expect(screen.getByLabelText('Auto approve all')).toHaveAttribute('data-state', 'checked');
    });

    it('clicking parent deselects all children when all are selected', async () => {
      const user = userEvent.setup();
      renderDrawer();

      // Select all
      await user.click(screen.getByLabelText('Auto approve all'));
      expect(screen.getByLabelText('Auto approve all')).toHaveAttribute('data-state', 'checked');

      // Click parent again → all should be deselected
      await user.click(screen.getByLabelText('Auto approve all'));

      expect(screen.getByLabelText('PRD')).not.toBeChecked();
      expect(screen.getByLabelText('Plan')).not.toBeChecked();
      expect(screen.getByLabelText('Merge')).not.toBeChecked();
      expect(screen.getByLabelText('Auto approve all')).toHaveAttribute('data-state', 'unchecked');
    });

    it('unchecking last child transitions parent from indeterminate to unchecked', async () => {
      const user = userEvent.setup();
      renderDrawer();

      // Check one child
      await user.click(screen.getByLabelText('Plan'));
      expect(screen.getByLabelText('Auto approve all')).toHaveAttribute(
        'data-state',
        'indeterminate'
      );

      // Uncheck it
      await user.click(screen.getByLabelText('Plan'));
      expect(screen.getByLabelText('Auto approve all')).toHaveAttribute('data-state', 'unchecked');
    });

    it('submits correct approvalGates after parent select-all', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'Add a feature');
      await user.click(screen.getByLabelText('Auto approve all'));
      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
        })
      );
    });
  });

  describe('close behavior', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onClose });

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onClose when close (X) button is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onClose });

      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('clears all form fields after submit without unmounting', async () => {
      mockPickFiles.mockResolvedValue([mockPdf]);
      const onSubmit = vi.fn();
      const onClose = vi.fn();
      const user = userEvent.setup();
      const features: { id: string; name: string }[] = [
        { id: 'feat-aaa-111', name: 'Parent Feature' },
      ];

      render(
        <DrawerCloseGuardProvider>
          <FeatureCreateDrawer
            open={true}
            onClose={onClose}
            onSubmit={onSubmit}
            repositoryPath="/repo"
            features={features}
          />
        </DrawerCloseGuardProvider>
      );

      // Fill description
      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'Some description');

      // Check approval gates: PRD, Plan, Merge
      await user.click(screen.getByLabelText('PRD'));
      await user.click(screen.getByLabelText('Plan'));
      await user.click(screen.getByLabelText('Merge'));

      // Check "Create PR" (which forces push=true)
      await user.click(screen.getByLabelText('Create PR'));

      // Check "Fast Mode"
      await user.click(screen.getByLabelText('Fast Mode'));

      // Select a parent feature
      await user.click(screen.getByTestId('parent-feature-combobox'));
      await user.click(screen.getByTestId('parent-feature-option-feat-aaa-111'));

      // Add an attachment
      await user.click(screen.getByRole('button', { name: /add files/i }));
      expect(screen.getByText('requirements.pdf')).toBeInTheDocument();

      // Submit the form
      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));
      expect(onSubmit).toHaveBeenCalledOnce();

      // Assert all fields are reset to defaults (component is still mounted)
      expect(screen.getByPlaceholderText(descriptionPlaceholder)).toHaveValue('');
      expect(screen.getByLabelText('Fast Mode')).not.toBeChecked();
      expect(screen.getByLabelText('PRD')).not.toBeChecked();
      expect(screen.getByLabelText('Plan')).not.toBeChecked();
      expect(screen.getByLabelText('Merge')).not.toBeChecked();
      expect(screen.getByLabelText('Push')).not.toBeChecked();
      expect(screen.getByLabelText('Create PR')).not.toBeChecked();
      expect(screen.getByTestId('parent-feature-combobox')).toHaveTextContent(
        'Select parent feature...'
      );
      expect(screen.queryByText('requirements.pdf')).not.toBeInTheDocument();
    }, 10_000);

    it('clears form data on submit so next open starts fresh', async () => {
      const onSubmit = vi.fn();
      const onClose = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(
        <DrawerCloseGuardProvider>
          <FeatureCreateDrawer
            open={true}
            onClose={onClose}
            onSubmit={onSubmit}
            repositoryPath="/repo"
          />
        </DrawerCloseGuardProvider>
      );

      // Fill form and submit
      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'My Feature');
      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));
      expect(onSubmit).toHaveBeenCalledOnce();

      // Unmount and remount to simulate close + reopen
      rerender(<div />);
      rerender(
        <DrawerCloseGuardProvider>
          <FeatureCreateDrawer
            open={true}
            onClose={onClose}
            onSubmit={onSubmit}
            repositoryPath="/repo"
          />
        </DrawerCloseGuardProvider>
      );

      expect(screen.getByPlaceholderText(descriptionPlaceholder)).toHaveValue('');
    });
  });

  describe('attachments (native file picker)', () => {
    it('calls pickFiles and displays attachment card with full path', async () => {
      mockPickFiles.mockResolvedValue([mockPdf]);
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByRole('button', { name: /add files/i }));

      expect(mockPickFiles).toHaveBeenCalledOnce();
      expect(screen.getByText('requirements.pdf')).toBeInTheDocument();
      expect(screen.getByText('/Users/dev/docs/requirements.pdf')).toBeInTheDocument();
    });

    it('displays file size', async () => {
      mockPickFiles.mockResolvedValue([mockPdf]);
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByRole('button', { name: /add files/i }));

      expect(screen.getByText('41.0 KB')).toBeInTheDocument();
    });

    it('supports multiple file selections across multiple picks', async () => {
      const user = userEvent.setup();
      renderDrawer();

      mockPickFiles.mockResolvedValueOnce([mockPdf]);
      await user.click(screen.getByRole('button', { name: /add files/i }));

      mockPickFiles.mockResolvedValueOnce([mockPng, mockTs]);
      await user.click(screen.getByRole('button', { name: /add files/i }));

      expect(screen.getByText('requirements.pdf')).toBeInTheDocument();
      expect(screen.getByText('screenshot.png')).toBeInTheDocument();
      expect(screen.getByText('index.ts')).toBeInTheDocument();
    });

    it('removes attachment when remove button is clicked', async () => {
      mockPickFiles.mockResolvedValue([mockPdf]);
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByRole('button', { name: /add files/i }));
      expect(screen.getByText('requirements.pdf')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Remove requirements.pdf' }));
      expect(screen.queryByText('requirements.pdf')).not.toBeInTheDocument();
    });

    it('shows attachment count badge', async () => {
      mockPickFiles.mockResolvedValue([mockPdf, mockPng]);
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByRole('button', { name: /add files/i }));

      expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    it('does not add files when user cancels the picker', async () => {
      mockPickFiles.mockResolvedValue(null);
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByRole('button', { name: /add files/i }));

      expect(screen.queryByText('requirements.pdf')).not.toBeInTheDocument();
    });

    it('handles pickFiles error gracefully', async () => {
      mockPickFiles.mockRejectedValue(new Error('Dialog failed'));
      const user = userEvent.setup();
      renderDrawer();

      // Should not throw — error is swallowed
      await user.click(screen.getByRole('button', { name: /add files/i }));

      expect(screen.queryByText('requirements.pdf')).not.toBeInTheDocument();
    });
  });

  describe('sound effects', () => {
    beforeEach(() => {
      mockCreatePlay.mockReset();
    });

    it('plays create sound on form submit', async () => {
      const user = userEvent.setup();
      renderDrawer();
      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'My Feature');
      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));
      expect(mockCreatePlay).toHaveBeenCalledOnce();
    });
  });

  describe('fast mode toggle', () => {
    it('renders fast mode checkbox with label and description', () => {
      renderDrawer();
      expect(screen.getByLabelText('Fast Mode')).toBeInTheDocument();
      expect(
        screen.getByText('Skip SDLC phases and implement directly from your prompt.')
      ).toBeInTheDocument();
    });

    it('renders MODE section label', () => {
      renderDrawer();
      expect(screen.getByText('MODE')).toBeInTheDocument();
    });

    it('fast mode is unchecked by default', () => {
      renderDrawer();
      expect(screen.getByLabelText('Fast Mode')).not.toBeChecked();
    });

    it('toggling fast mode checkbox updates form state', async () => {
      const user = userEvent.setup();
      renderDrawer();

      const checkbox = screen.getByLabelText('Fast Mode');
      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('submitting with fast mode on includes fast=true in payload', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'Fix the typo');
      await user.click(screen.getByLabelText('Fast Mode'));
      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));

      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit.mock.calls[0][0]).toEqual(expect.objectContaining({ fast: true }));
    });

    it('submitting with fast mode off includes fast=false in payload', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'Fix the typo');
      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));

      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit.mock.calls[0][0]).toEqual(expect.objectContaining({ fast: false }));
    });

    it('fast mode checkbox has accessible label', () => {
      renderDrawer();
      const checkbox = screen.getByLabelText('Fast Mode');
      expect(checkbox).toHaveAttribute('id', 'fast-mode');
    });

    it('fast mode checkbox is disabled when isSubmitting', () => {
      renderDrawer({ isSubmitting: true });
      expect(screen.getByLabelText('Fast Mode')).toBeDisabled();
    });

    it('fast mode resets to unchecked after submit', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'My Feature');
      await user.click(screen.getByLabelText('Fast Mode'));
      expect(screen.getByLabelText('Fast Mode')).toBeChecked();

      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));

      // After submit, form resets — fast mode should be unchecked
      expect(screen.getByLabelText('Fast Mode')).not.toBeChecked();
    });
  });
});
