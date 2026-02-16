import { useState, useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, fn } from '@storybook/test';
import { FeatureCreateDrawer } from './feature-create-drawer';
import type { CreateFeatureFormData } from './feature-create-drawer';
import { Button } from '@/components/ui/button';

/* ---------------------------------------------------------------------------
 * Meta — component-level docs + interactive controls
 * ------------------------------------------------------------------------- */

/**
 * **FeatureCreateDrawer** is a right-side sliding drawer containing a form to
 * create a new feature in the Control Center.
 *
 * ### Form sections
 * - **Feature Name** (required) — text input, submit is disabled when empty
 * - **Description** (optional) — multi-line textarea
 * - **Attachments** (optional) — file picker with MIME-based icon system:
 *   image → blue, PDF → red, code/text → emerald, generic → gray
 *
 * ### Props
 * | Prop | Type | Description |
 * |------|------|-------------|
 * | `open` | `boolean` | Controls drawer visibility |
 * | `onClose` | `() => void` | Called on dismiss (close button, cancel, or backdrop) |
 * | `onSubmit` | `(data: CreateFeatureFormData) => void` | Called with `{ name, description, attachments }` |
 * | `isSubmitting` | `boolean` | Disables all fields and shows "Creating..." on submit button |
 *
 * ### Behavior
 * - Form resets (name, description, attachments cleared) when the drawer closes
 * - Submit button is disabled when name is empty OR `isSubmitting` is true
 * - Non-modal (`modal={false}`) — canvas stays interactive behind the drawer
 * - Fixed width: 384px (`w-96`)
 */
const meta: Meta<typeof FeatureCreateDrawer> = {
  title: 'Composed/FeatureCreateDrawer',
  component: FeatureCreateDrawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the drawer is visible.',
    },
    onClose: {
      description:
        'Callback fired when the drawer is dismissed (close button, cancel, or backdrop click).',
    },
    onSubmit: {
      description:
        'Callback fired with `CreateFeatureFormData` when the form is submitted. Receives `{ name, description, attachments }`.',
    },
    isSubmitting: {
      control: 'boolean',
      description:
        'When true, all form fields and buttons are disabled, and the submit button shows "Creating...".',
    },
  },
};

export default meta;
type Story = StoryObj<typeof FeatureCreateDrawer>;

/* ---------------------------------------------------------------------------
 * Mock file fixtures — cover all four MIME icon categories
 * ------------------------------------------------------------------------- */

/** Image file → ImageIcon (blue-50/blue-600) */
const mockScreenshot = new File(['screenshot-data'], 'dashboard-screenshot.png', {
  type: 'image/png',
});

/** PDF file → FileTextIcon (red-50/red-600) */
const mockPdf = new File(['pdf-content'], 'requirements-document.pdf', {
  type: 'application/pdf',
});

/** Code/text file → CodeIcon (emerald-50/emerald-600) */
const mockTypeScript = new File(['export const config = {};'], 'api-config.ts', {
  type: 'text/typescript',
});

/** JSON file → CodeIcon (emerald-50/emerald-600) */
const mockJson = new File(['{"key": "value"}'], 'openapi-spec.json', {
  type: 'application/json',
});

/** Generic/unknown file → FileIcon (gray-50/gray-600) */
const mockZip = new File(['binary-data'], 'assets-bundle.zip', {
  type: 'application/zip',
});

/* ---------------------------------------------------------------------------
 * Shared action loggers
 * ------------------------------------------------------------------------- */

const logSubmit = fn().mockName('onSubmit');
const logClose = fn().mockName('onClose');

/* ---------------------------------------------------------------------------
 * Trigger wrapper — every story uses this so nothing auto-opens on Docs page
 * ------------------------------------------------------------------------- */

/** Starts closed — click button to open. Actions are logged. */
function CreateDrawerTrigger({
  isSubmitting = false,
  label = 'Open Create Feature',
}: {
  isSubmitting?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen items-start p-4">
      <Button variant="outline" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <FeatureCreateDrawer
        open={open}
        onClose={() => {
          setOpen(false);
          logClose();
        }}
        onSubmit={(data) => {
          logSubmit(data);
          setOpen(false);
        }}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Per-state stories
 * ------------------------------------------------------------------------- */

/** Default empty form — click the trigger button to open the create feature drawer. */
export const Default: Story = {
  render: () => <CreateDrawerTrigger />,
};

/**
 * Pre-filled form — click to open, then name and description are typed in.
 * Demonstrates the form in a "ready to submit" state.
 */
export const PreFilled: Story = {
  render: () => <CreateDrawerTrigger label="Open Pre-Filled" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open Pre-Filled' }));

    // Drawer renders in a portal — query from document body
    const body = within(canvasElement.ownerDocument.body);
    const nameInput = await body.findByPlaceholderText('e.g. GitHub OAuth Login');
    const descInput = body.getByPlaceholderText('Describe what this feature does...');

    await userEvent.type(nameInput, 'GitHub OAuth Login');
    await userEvent.type(
      descInput,
      'Implement OAuth2 authentication with GitHub as the identity provider. Includes login, callback handling, and token refresh.'
    );
  },
};

/**
 * Drawer with multiple file attachments of varying MIME types.
 *
 * Showcases the **AttachmentCard** sub-component with MIME-based icon mapping:
 * - image (`image/png`) → blue ImageIcon
 * - PDF (`application/pdf`) → red FileTextIcon
 * - code (`text/typescript`, `application/json`) → emerald CodeIcon
 * - generic (`application/zip`) → gray FileIcon
 */
export const WithAttachments: Story = {
  render: () => <CreateDrawerTrigger label="Open With Attachments" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open With Attachments' }));

    // Drawer renders in a portal — query from document body
    const body = within(canvasElement.ownerDocument.body);
    const nameInput = await body.findByPlaceholderText('e.g. GitHub OAuth Login');
    await userEvent.type(nameInput, 'Dashboard Redesign');

    const fileInput = canvasElement.ownerDocument.body.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await userEvent.upload(fileInput, [mockScreenshot, mockPdf, mockTypeScript, mockJson, mockZip]);
  },
};

/**
 * Submitting/loading state — all form fields are disabled, submit button shows "Creating...".
 * Click the trigger to open and observe the disabled form.
 */
export const Submitting: Story = {
  render: () => <CreateDrawerTrigger isSubmitting label="Open (Submitting)" />,
};

/**
 * Pre-opened submitting state with fields pre-filled.
 * Demonstrates how the form looks mid-submission with data already entered.
 */
export const SubmittingPreOpened: Story = {
  render: () => <CreateDrawerTrigger isSubmitting label="Open Submitting (Pre-filled)" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open Submitting (Pre-filled)' }));

    // Drawer renders in a portal — query from document body
    const body = within(canvasElement.ownerDocument.body);
    const nameInput = await body.findByPlaceholderText('e.g. GitHub OAuth Login');
    const descInput = body.getByPlaceholderText('Describe what this feature does...');

    await userEvent.type(nameInput, 'GitHub OAuth Login');
    await userEvent.type(descInput, 'Implement OAuth2 authentication with GitHub.');
  },
};

/**
 * Validation state — open the drawer with an empty name field.
 * The "+ Create Feature" button is disabled because name validation fails.
 */
export const ValidationDisabled: Story = {
  render: () => <CreateDrawerTrigger label="Open Validation Demo" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open Validation Demo' }));
  },
};

/** Click to open the drawer for quick visual inspection. */
export const PreOpened: Story = {
  render: () => <CreateDrawerTrigger label="Open Drawer" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open Drawer' }));
  },
};

/* ---------------------------------------------------------------------------
 * Interactive / matrix stories
 * ------------------------------------------------------------------------- */

/**
 * Fully interactive story — open the drawer, fill the form, add files via
 * the native file picker, and click "+ Create Feature".
 *
 * **Submitted data** is displayed in a styled panel next to the trigger button
 * AND logged to the Storybook **Actions** panel, so you can inspect the exact
 * `CreateFeatureFormData` payload that would be sent to the backend.
 */
export const Interactive: Story = {
  render: function InteractiveRender() {
    const [open, setOpen] = useState(false);
    const [submitted, setSubmitted] = useState<CreateFeatureFormData | null>(null);

    return (
      <div className="flex h-screen items-start gap-4 p-4">
        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={() => setOpen(true)}>
            Open Create Feature
          </Button>
          {submitted ? (
            <div className="bg-muted/50 max-w-sm rounded-md border p-3">
              <span className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">
                Last submitted
              </span>
              <pre className="mt-1 text-xs whitespace-pre-wrap">
                {JSON.stringify(
                  {
                    name: submitted.name,
                    description: submitted.description,
                    attachments: submitted.attachments.map((f) => ({
                      name: f.name,
                      size: f.size,
                      type: f.type,
                    })),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          ) : null}
        </div>
        <FeatureCreateDrawer
          open={open}
          onClose={() => {
            setOpen(false);
            logClose();
          }}
          onSubmit={(data) => {
            logSubmit(data);
            setSubmitted(data);
            setOpen(false);
          }}
        />
      </div>
    );
  },
};

/* ---------------------------------------------------------------------------
 * Form states matrix — sidebar switcher
 * ------------------------------------------------------------------------- */

type FormPhase = 'empty' | 'partial' | 'complete' | 'submitting';

const formPhaseLabels: Record<FormPhase, string> = {
  empty: 'Empty',
  partial: 'Partial (name only)',
  complete: 'Complete (all fields)',
  submitting: 'Submitting',
};

/**
 * Uses `key={phase}` to force React remount (resetting internal state), then
 * programmatically fills form fields via native value setters after mount.
 */
function FormPhaseDrawer({ phase, open }: { phase: FormPhase; open: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || phase === 'empty') return;

    const raf = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;

      const nameInput = container.querySelector<HTMLInputElement>('#feature-name');
      const descInput = container.querySelector<HTMLTextAreaElement>('#feature-description');
      const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');

      // Set name for partial, complete, and submitting
      if (nameInput) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
        setter.call(nameInput, 'GitHub OAuth Login');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Set description for complete and submitting
      if (descInput && (phase === 'complete' || phase === 'submitting')) {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          'value'
        )!.set!;
        setter.call(
          descInput,
          'Implement OAuth2 authentication with GitHub as the identity provider.'
        );
        descInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Add attachments for complete and submitting
      if (fileInput && (phase === 'complete' || phase === 'submitting')) {
        const dt = new DataTransfer();
        [mockScreenshot, mockPdf, mockTypeScript].forEach((f) => dt.items.add(f));
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [phase, open]);

  return (
    <div ref={containerRef} className="flex-1">
      <FeatureCreateDrawer
        key={phase}
        open={open}
        onClose={logClose}
        onSubmit={logSubmit}
        isSubmitting={phase === 'submitting'}
      />
    </div>
  );
}

/**
 * Form states matrix — click a phase button to open the drawer in that state.
 * Click the same button again (or close the drawer) to dismiss it.
 *
 * Demonstrates how the drawer looks at each stage of the form completion
 * lifecycle. Each phase forces a full React remount via `key={phase}` and
 * programmatically fills fields to match the selected state.
 */
export const FormStatesMatrix: Story = {
  render: function FormStatesMatrixRender() {
    const [phase, setPhase] = useState<FormPhase>('empty');
    const [open, setOpen] = useState(false);

    return (
      <div className="flex h-screen">
        <div className="flex flex-col gap-2 p-4">
          <span className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
            Form state
          </span>
          {(Object.keys(formPhaseLabels) as FormPhase[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                if (open && p === phase) {
                  setOpen(false);
                } else {
                  setPhase(p);
                  setOpen(true);
                }
              }}
              className={`rounded-md px-3 py-1.5 text-left text-sm ${
                open && p === phase
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {formPhaseLabels[p]}
            </button>
          ))}
        </div>
        <FormPhaseDrawer phase={phase} open={open} />
      </div>
    );
  },
};
