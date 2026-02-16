import { useState } from 'react';
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
 * - **Attachments** (optional) — native OS file picker with extension-based icon system:
 *   image → blue, PDF → red, code/text → emerald, generic → gray.
 *   Each attachment card shows the **full absolute file path**.
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
 * - Attachments use native OS file picker via `pickFiles()` — returns `FileAttachment[]`
 *   with full absolute paths, filenames, and sizes
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
 * Submitting/loading state — all form fields are disabled, submit button shows "Creating...".
 * Click the trigger to open and observe the disabled form.
 */
export const Submitting: Story = {
  render: () => <CreateDrawerTrigger isSubmitting label="Open (Submitting)" />,
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
 * Interactive story — full paths shown in submitted data panel
 * ------------------------------------------------------------------------- */

/**
 * Fully interactive story — open the drawer, fill the form, and click
 * "Add Files" to attach files via the native OS file picker.
 *
 * **Submitted data** is displayed in a styled panel showing `FileAttachment[]`
 * with **full absolute file paths**, filenames, and sizes.
 *
 * In Storybook, the native picker won't work (no backend), but submitted data
 * would show the paths if files were attached programmatically.
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
                      path: f.path,
                      name: f.name,
                      size: f.size,
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
