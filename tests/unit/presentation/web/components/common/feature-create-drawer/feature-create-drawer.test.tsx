import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

    it('renders attach files button', () => {
      renderDrawer();
      expect(screen.getByRole('button', { name: /attach files/i })).toBeInTheDocument();
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
      expect(payload).toMatchObject({
        description: 'OAuth2 flow',
        attachments: [],
        repositoryPath: '/Users/dev/my-repo',
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
        push: false,
        openPr: false,
        fast: false,
      });
      expect(payload).toHaveProperty('sessionId');
      expect(payload).not.toHaveProperty('name');
    });

    it('includes attachments array with file objects', async () => {
      mockPickFiles.mockResolvedValue([mockPdf]);
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'Add a feature');
      await user.click(screen.getByRole('button', { name: /attach files/i }));

      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));

      expect(onSubmit).toHaveBeenCalledOnce();
      const submittedData = onSubmit.mock.calls[0][0];
      expect(submittedData.description).toBe('Add a feature');
      expect(submittedData.attachments).toHaveLength(1);
      expect(submittedData.attachments[0]).toMatchObject({
        name: 'requirements.pdf',
        size: 42000,
        path: '/Users/dev/docs/requirements.pdf',
      });
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

  describe('switch reset on close', () => {
    it('resets all switches to unchecked after close and reopen', async () => {
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

      // Toggle some switches
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

      // Default should be restored - all unchecked
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
      expect(screen.getByRole('button', { name: /attach files/i })).toBeDisabled();
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

  describe('auto-approve switches', () => {
    it('renders "APPROVE" section title', () => {
      renderDrawer();
      expect(screen.getByText('APPROVE')).toBeInTheDocument();
    });

    it('renders 3 approval switches and an All toggle button', () => {
      renderDrawer();
      expect(screen.getByLabelText('PRD')).toBeInTheDocument();
      expect(screen.getByLabelText('Plan')).toBeInTheDocument();
      expect(screen.getByLabelText('Merge')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('all switches are unchecked by default', () => {
      renderDrawer();
      expect(screen.getByLabelText('PRD')).not.toBeChecked();
      expect(screen.getByLabelText('Plan')).not.toBeChecked();
      expect(screen.getByLabelText('Merge')).not.toBeChecked();
    });

    it('all switches are disabled when isSubmitting=true', () => {
      renderDrawer({ isSubmitting: true });
      expect(screen.getByLabelText('PRD')).toBeDisabled();
      expect(screen.getByLabelText('Plan')).toBeDisabled();
      expect(screen.getByLabelText('Merge')).toBeDisabled();
    });

    it('clicking PRD switch toggles it on', async () => {
      const user = userEvent.setup();
      renderDrawer();

      const prdSwitch = screen.getByLabelText('PRD');
      expect(prdSwitch).not.toBeChecked();
      await user.click(prdSwitch);
      expect(prdSwitch).toBeChecked();
    });
  });

  describe('auto-approve All toggle button', () => {
    it('clicking All button selects all switches when none are selected', async () => {
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByText('All'));

      expect(screen.getByLabelText('PRD')).toBeChecked();
      expect(screen.getByLabelText('Plan')).toBeChecked();
      expect(screen.getByLabelText('Merge')).toBeChecked();
    });

    it('clicking All button selects all when some are selected', async () => {
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByLabelText('PRD'));
      await user.click(screen.getByText('All'));

      expect(screen.getByLabelText('PRD')).toBeChecked();
      expect(screen.getByLabelText('Plan')).toBeChecked();
      expect(screen.getByLabelText('Merge')).toBeChecked();
    });

    it('clicking All button deselects all when all are selected', async () => {
      const user = userEvent.setup();
      renderDrawer();

      // Select all via button
      await user.click(screen.getByText('All'));
      expect(screen.getByLabelText('PRD')).toBeChecked();

      // Click again to deselect all
      await user.click(screen.getByText('All'));

      expect(screen.getByLabelText('PRD')).not.toBeChecked();
      expect(screen.getByLabelText('Plan')).not.toBeChecked();
      expect(screen.getByLabelText('Merge')).not.toBeChecked();
    });

    it('submits correct approvalGates after All toggle', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'Add a feature');
      await user.click(screen.getByText('All'));
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
            initialParentId=""
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
      await user.click(screen.getByLabelText('PR'));

      // Check "Fast Mode"
      await user.click(screen.getByLabelText('Fast Mode'));

      // Select a parent feature
      await user.click(screen.getByTestId('parent-feature-combobox'));
      await user.click(screen.getByTestId('parent-feature-option-feat-aaa-111'));

      // Add an attachment
      await user.click(screen.getByRole('button', { name: /attach files/i }));
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
      expect(screen.getByLabelText('PR')).not.toBeChecked();
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
    it('calls pickFiles and displays attachment chip', async () => {
      mockPickFiles.mockResolvedValue([mockPdf]);
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByRole('button', { name: /attach files/i }));

      expect(mockPickFiles).toHaveBeenCalledOnce();
      expect(screen.getByText('requirements.pdf')).toBeInTheDocument();
    });

    it('displays file size', async () => {
      mockPickFiles.mockResolvedValue([mockPdf]);
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByRole('button', { name: /attach files/i }));

      expect(screen.getByText('41.0 KB')).toBeInTheDocument();
    });

    it('supports multiple file selections across multiple picks', async () => {
      const user = userEvent.setup();
      renderDrawer();

      mockPickFiles.mockResolvedValueOnce([mockPdf]);
      await user.click(screen.getByRole('button', { name: /attach files/i }));

      mockPickFiles.mockResolvedValueOnce([mockPng, mockTs]);
      await user.click(screen.getByRole('button', { name: /attach files/i }));

      expect(screen.getByText('requirements.pdf')).toBeInTheDocument();
      expect(screen.getByTitle('screenshot.png')).toBeInTheDocument();
      expect(screen.getByText('index.ts')).toBeInTheDocument();
    });

    it('removes attachment when remove button is clicked', async () => {
      mockPickFiles.mockResolvedValue([mockPdf]);
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByRole('button', { name: /attach files/i }));
      expect(screen.getByText('requirements.pdf')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Remove requirements.pdf' }));
      expect(screen.queryByText('requirements.pdf')).not.toBeInTheDocument();
    });

    it('shows multiple attachment chips', async () => {
      mockPickFiles.mockResolvedValue([mockPdf, mockPng]);
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByRole('button', { name: /attach files/i }));

      expect(screen.getByText('requirements.pdf')).toBeInTheDocument();
      expect(screen.getByTitle('screenshot.png')).toBeInTheDocument();
    });

    it('does not add files when user cancels the picker', async () => {
      mockPickFiles.mockResolvedValue(null);
      const user = userEvent.setup();
      renderDrawer();

      await user.click(screen.getByRole('button', { name: /attach files/i }));

      expect(screen.queryByText('requirements.pdf')).not.toBeInTheDocument();
    });

    it('does not add duplicate files when the same file is picked again', async () => {
      const user = userEvent.setup();
      renderDrawer();

      // Pick mockPdf the first time
      mockPickFiles.mockResolvedValueOnce([mockPdf]);
      await user.click(screen.getByRole('button', { name: /attach files/i }));
      expect(screen.getByText('requirements.pdf')).toBeInTheDocument();

      // Pick mockPdf again (same path) along with a new file
      mockPickFiles.mockResolvedValueOnce([mockPdf, mockPng]);
      await user.click(screen.getByRole('button', { name: /attach files/i }));

      // Should have 2 files, not 3 — mockPdf is deduped
      expect(screen.getAllByText('requirements.pdf')).toHaveLength(1);
      expect(screen.getByTitle('screenshot.png')).toBeInTheDocument();
    });

    it('handles pickFiles error gracefully', async () => {
      mockPickFiles.mockRejectedValue(new Error('Dialog failed'));
      const user = userEvent.setup();
      renderDrawer();

      // Should not throw — error is swallowed
      await user.click(screen.getByRole('button', { name: /attach files/i }));

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
    it('renders fast mode switch with label', () => {
      renderDrawer();
      expect(screen.getByLabelText('Fast Mode')).toBeInTheDocument();
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

  describe('keyboard shortcut (Ctrl/Cmd+Enter)', () => {
    it('submits the form when Ctrl+Enter is pressed in the textarea', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      const textarea = screen.getByPlaceholderText(descriptionPlaceholder);
      await user.type(textarea, 'OAuth2 flow');
      await user.keyboard('{Control>}{Enter}{/Control}');

      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit.mock.calls[0][0].description).toBe('OAuth2 flow');
    });

    it('submits the form when Meta+Enter is pressed in the textarea', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      const textarea = screen.getByPlaceholderText(descriptionPlaceholder);
      await user.type(textarea, 'OAuth2 flow');
      await user.keyboard('{Meta>}{Enter}{/Meta}');

      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit.mock.calls[0][0].description).toBe('OAuth2 flow');
    });

    it('does not submit when description is empty and Ctrl+Enter is pressed', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      const textarea = screen.getByPlaceholderText(descriptionPlaceholder);
      await user.click(textarea);
      await user.keyboard('{Control>}{Enter}{/Control}');

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not submit when isSubmitting and Ctrl+Enter is pressed', () => {
      const onSubmit = vi.fn();
      renderDrawer({ onSubmit, isSubmitting: true });

      // Textarea is disabled when isSubmitting, so we fire the event on the form
      const form = document.getElementById('create-feature-form')!;
      form.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true })
      );

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not submit on plain Enter (without modifier)', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      const textarea = screen.getByPlaceholderText(descriptionPlaceholder);
      await user.type(textarea, 'OAuth2 flow');
      // Plain Enter in a textarea should just add a newline, not submit
      await user.keyboard('{Enter}');

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('drag-drop and paste uploads', () => {
    function createUploadResponse(name: string, mimeType = 'application/octet-stream') {
      return {
        id: `att-${crypto.randomUUID().slice(0, 8)}`,
        name,
        size: 5000,
        mimeType,
        path: `/tmp/repo/.shep/attachments/pending-abc/${name}`,
        createdAt: '2026-03-08T10:00:00.000Z',
      };
    }

    beforeEach(() => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(async (_url: string, options: { body: FormData }) => {
          const body = options.body;
          const file = body.get('file') as File;
          const resp = createUploadResponse(file.name, file.type || 'application/octet-stream');
          return { ok: true, json: () => Promise.resolve(resp) };
        })
      );
    });

    function createDropEvent(files: File[]) {
      const dataTransfer = {
        files,
        items: files.map((f) => ({ kind: 'file', getAsFile: () => f })),
        types: ['Files'],
      };
      return { dataTransfer };
    }

    function getDropZone() {
      return screen.getByRole('region', { name: 'File drop zone' });
    }

    it('shows attachment chip after dropping a valid file', async () => {
      renderDrawer();
      const file = new File(['image data'], 'screenshot.png', { type: 'image/png' });
      const dropZone = getDropZone();

      fireEvent.drop(dropZone, createDropEvent([file]));

      await waitFor(() => {
        expect(screen.getByTitle('screenshot.png')).toBeInTheDocument();
      });
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('shows inline error for files exceeding 10 MB without calling upload API', async () => {
      renderDrawer();
      const bigFile = new File(['x'.repeat(100)], 'huge.png', { type: 'image/png' });
      Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 });
      const dropZone = getDropZone();

      fireEvent.drop(dropZone, createDropEvent([bigFile]));

      await waitFor(() => {
        expect(screen.getByText(/exceeds 10 MB/i)).toBeInTheDocument();
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('shows inline error for disallowed file extensions', async () => {
      renderDrawer();
      const exeFile = new File(['binary'], 'malware.exe', { type: 'application/x-msdownload' });
      const dropZone = getDropZone();

      fireEvent.drop(dropZone, createDropEvent([exeFile]));

      await waitFor(() => {
        expect(screen.getByText(/not allowed/i)).toBeInTheDocument();
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('applies drag-over class on dragenter and removes it on dragleave', () => {
      renderDrawer();
      const dropZone = getDropZone();

      fireEvent.dragEnter(dropZone, createDropEvent([]));
      expect(dropZone).toHaveAttribute('data-drag-over', 'true');

      fireEvent.dragLeave(dropZone, createDropEvent([]));
      expect(dropZone).toHaveAttribute('data-drag-over', 'false');
    });

    it('shows attachment chip after pasting an image from clipboard', async () => {
      renderDrawer();
      const file = new File(['image data'], 'image.png', { type: 'image/png' });
      const textarea = screen.getByPlaceholderText(descriptionPlaceholder);

      const clipboardData = {
        items: [{ kind: 'file', getAsFile: () => file }],
        files: [file],
      };
      fireEvent.paste(textarea, { clipboardData });

      await waitFor(() => {
        expect(screen.getByTitle('image.png')).toBeInTheDocument();
      });
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('includes sessionId in the upload request', async () => {
      renderDrawer();
      const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
      const dropZone = getDropZone();

      fireEvent.drop(dropZone, createDropEvent([file]));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledOnce();
      });

      const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('/api/attachments/upload');
      const body = options.body as FormData;
      expect(body.get('sessionId')).toBeTruthy();
    });

    it('includes sessionId in submitted payload', async () => {
      renderDrawer();
      const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
      const dropZone = getDropZone();
      const user = userEvent.setup();

      fireEvent.drop(dropZone, createDropEvent([file]));
      await waitFor(() => {
        expect(screen.getByText('doc.pdf')).toBeInTheDocument();
      });

      // Fill description and submit
      await user.type(screen.getByPlaceholderText(descriptionPlaceholder), 'My feature');
      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));

      const payload = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(payload).toHaveProperty('sessionId');
      expect(typeof payload.sessionId).toBe('string');
    });
  });
});
