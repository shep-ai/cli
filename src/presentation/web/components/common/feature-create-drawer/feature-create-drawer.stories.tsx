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
 * Trigger wrappers
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

/** Pre-opened drawer — visible on mount, action-logged callbacks. */
function PreOpenedDrawer({ isSubmitting = false }: { isSubmitting?: boolean }) {
  return (
    <div className="flex h-screen items-start p-4">
      <FeatureCreateDrawer
        open={true}
        onClose={logClose}
        onSubmit={logSubmit}
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
 * Pre-filled form — drawer opens with name and description already entered.
 * Demonstrates the form in a "ready to submit" state.
 *
 * Uses a `play` function to type into the uncontrolled form fields after the
 * drawer renders, simulating real user input.
 */
export const PreFilled: Story = {
  render: () => <PreOpenedDrawer />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const nameInput = canvas.getByPlaceholderText('e.g. GitHub OAuth Login');
    const descInput = canvas.getByPlaceholderText('Describe what this feature does...');

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
 *
 * Uses `userEvent.upload` to inject mock `File` objects into the hidden file input.
 */
export const WithAttachments: Story = {
  render: () => <PreOpenedDrawer />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const nameInput = canvas.getByPlaceholderText('e.g. GitHub OAuth Login');
    await userEvent.type(nameInput, 'Dashboard Redesign');

    const fileInput = canvasElement.querySelector('input[type="file"]') as HTMLInputElement;
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
 *
 * **Note:** The play function fills fields before the component re-renders with
 * `isSubmitting`, so the final visual shows disabled fields with values.
 */
export const SubmittingPreOpened: Story = {
  render: () => <PreOpenedDrawer isSubmitting />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const nameInput = canvas.getByPlaceholderText('e.g. GitHub OAuth Login');
    const descInput = canvas.getByPlaceholderText('Describe what this feature does...');

    await userEvent.type(nameInput, 'GitHub OAuth Login');
    await userEvent.type(descInput, 'Implement OAuth2 authentication with GitHub.');
  },
};

/**
 * Validation state — drawer is open with an empty name field.
 * The "+ Create Feature" button is disabled because name validation fails.
 *
 * Demonstrates the form's built-in validation guard: submit requires a
 * non-empty trimmed name.
 */
export const ValidationDisabled: Story = {
  render: () => <PreOpenedDrawer />,
};

/** Pre-opened drawer for quick visual inspection without clicking a trigger. */
export const PreOpened: Story = {
  render: () => <PreOpenedDrawer />,
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
function FormPhaseDrawer({ phase }: { phase: FormPhase }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === 'empty') return;

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
  }, [phase]);

  return (
    <div ref={containerRef} className="flex-1">
      <FeatureCreateDrawer
        key={phase}
        open={true}
        onClose={logClose}
        onSubmit={logSubmit}
        isSubmitting={phase === 'submitting'}
      />
    </div>
  );
}

/**
 * Form states matrix — switch between **Empty**, **Partial** (name only),
 * **Complete** (all fields + attachments), and **Submitting** states via
 * sidebar buttons.
 *
 * Demonstrates how the drawer looks at each stage of the form completion
 * lifecycle. Each phase forces a full React remount via `key={phase}` and
 * programmatically fills fields to match the selected state.
 */
export const FormStatesMatrix: Story = {
  render: function FormStatesMatrixRender() {
    const [phase, setPhase] = useState<FormPhase>('empty');

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
              onClick={() => setPhase(p)}
              className={`rounded-md px-3 py-1.5 text-left text-sm ${
                p === phase ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {formPhaseLabels[p]}
            </button>
          ))}
        </div>
        <FormPhaseDrawer phase={phase} />
      </div>
    );
  },
};
