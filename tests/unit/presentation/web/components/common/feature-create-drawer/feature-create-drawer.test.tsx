import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureCreateDrawer } from '@/components/common/feature-create-drawer';

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

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  isSubmitting: false,
};

function renderDrawer(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<FeatureCreateDrawer {...props} />);
}

describe('FeatureCreateDrawer', () => {
  describe('rendering', () => {
    it('renders the drawer header when open', () => {
      renderDrawer();
      expect(screen.getByText('NEW FEATURE')).toBeInTheDocument();
    });

    it('renders feature name input', () => {
      renderDrawer();
      expect(screen.getByPlaceholderText('e.g. GitHub OAuth Login')).toBeInTheDocument();
    });

    it('renders description textarea', () => {
      renderDrawer();
      expect(screen.getByPlaceholderText('Describe what this feature does...')).toBeInTheDocument();
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
    it('accepts text in the name field', async () => {
      const user = userEvent.setup();
      renderDrawer();

      const nameInput = screen.getByPlaceholderText('e.g. GitHub OAuth Login');
      await user.type(nameInput, 'Auth Module');
      expect(nameInput).toHaveValue('Auth Module');
    });

    it('accepts text in the description field', async () => {
      const user = userEvent.setup();
      renderDrawer();

      const descInput = screen.getByPlaceholderText('Describe what this feature does...');
      await user.type(descInput, 'Implement OAuth2');
      expect(descInput).toHaveValue('Implement OAuth2');
    });
  });

  describe('validation', () => {
    it('disables submit button when name is empty', () => {
      renderDrawer();
      expect(screen.getByRole('button', { name: '+ Create Feature' })).toBeDisabled();
    });

    it('enables submit button when name has content', async () => {
      const user = userEvent.setup();
      renderDrawer();

      await user.type(screen.getByPlaceholderText('e.g. GitHub OAuth Login'), 'My Feature');
      expect(screen.getByRole('button', { name: '+ Create Feature' })).toBeEnabled();
    });

    it('disables submit button when name is only whitespace', async () => {
      const user = userEvent.setup();
      renderDrawer();

      await user.type(screen.getByPlaceholderText('e.g. GitHub OAuth Login'), '   ');
      expect(screen.getByRole('button', { name: '+ Create Feature' })).toBeDisabled();
    });
  });

  describe('submission', () => {
    it('calls onSubmit with trimmed form data', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      await user.type(screen.getByPlaceholderText('e.g. GitHub OAuth Login'), '  Auth Module  ');
      await user.type(
        screen.getByPlaceholderText('Describe what this feature does...'),
        '  OAuth2 flow  '
      );
      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));

      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Auth Module',
        description: 'OAuth2 flow',
        attachments: [],
      });
    });

    it('includes attachments in submission payload', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      renderDrawer({ onSubmit });

      await user.type(screen.getByPlaceholderText('e.g. GitHub OAuth Login'), 'Feature');

      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);

      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));

      expect(onSubmit).toHaveBeenCalledOnce();
      const submittedData = onSubmit.mock.calls[0][0];
      expect(submittedData.attachments).toHaveLength(1);
      expect(submittedData.attachments[0].name).toBe('test.png');
    });
  });

  describe('submitting state', () => {
    it('disables name input when isSubmitting', () => {
      renderDrawer({ isSubmitting: true });
      expect(screen.getByPlaceholderText('e.g. GitHub OAuth Login')).toBeDisabled();
    });

    it('disables description textarea when isSubmitting', () => {
      renderDrawer({ isSubmitting: true });
      expect(screen.getByPlaceholderText('Describe what this feature does...')).toBeDisabled();
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

    it('clears form data on submit so next open starts fresh', async () => {
      const onSubmit = vi.fn();
      const onClose = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(
        <FeatureCreateDrawer open={true} onClose={onClose} onSubmit={onSubmit} />
      );

      // Fill form and submit
      await user.type(screen.getByPlaceholderText('e.g. GitHub OAuth Login'), 'My Feature');
      await user.click(screen.getByRole('button', { name: '+ Create Feature' }));
      expect(onSubmit).toHaveBeenCalledOnce();

      // Unmount and remount to simulate close + reopen
      rerender(<div />);
      rerender(<FeatureCreateDrawer open={true} onClose={onClose} onSubmit={onSubmit} />);

      expect(screen.getByPlaceholderText('e.g. GitHub OAuth Login')).toHaveValue('');
      expect(screen.getByPlaceholderText('Describe what this feature does...')).toHaveValue('');
    });
  });

  describe('attachments', () => {
    it('displays attachment card after file upload', async () => {
      const user = userEvent.setup();
      renderDrawer();

      const file = new File(['data'], 'readme.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);

      expect(screen.getByText('readme.pdf')).toBeInTheDocument();
    });

    it('supports multiple file uploads', async () => {
      const user = userEvent.setup();
      renderDrawer();

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const file1 = new File(['a'], 'file1.png', { type: 'image/png' });
      await user.upload(fileInput, file1);

      const file2 = new File(['b'], 'file2.ts', { type: 'text/typescript' });
      await user.upload(fileInput, file2);

      expect(screen.getByText('file1.png')).toBeInTheDocument();
      expect(screen.getByText('file2.ts')).toBeInTheDocument();
    });

    it('removes attachment when remove button is clicked', async () => {
      const user = userEvent.setup();
      renderDrawer();

      const file = new File(['data'], 'to-remove.json', { type: 'application/json' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);

      expect(screen.getByText('to-remove.json')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Remove to-remove.json' }));
      expect(screen.queryByText('to-remove.json')).not.toBeInTheDocument();
    });

    it('shows attachment count badge', async () => {
      const user = userEvent.setup();
      renderDrawer();

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, [
        new File(['a'], 'a.png', { type: 'image/png' }),
        new File(['b'], 'b.pdf', { type: 'application/pdf' }),
      ]);

      expect(screen.getByText('(2)')).toBeInTheDocument();
    });
  });
});
