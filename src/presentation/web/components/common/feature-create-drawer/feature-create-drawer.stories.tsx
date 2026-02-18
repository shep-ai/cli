import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, fn } from '@storybook/test';
import { FeatureCreateDrawer } from './feature-create-drawer';
import type { CreateFeatureInput } from '@shepai/core/application/use-cases/features/create/types';
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
 * - **Auto Approve** — Tri-state parent checkbox with 3 child checkboxes (PRD, Plan, Merge).
 *   Parent shows indeterminate when some children are selected, checks/unchecks all on click.
 * - **Attachments** (optional) — native OS file picker with extension-based icon system:
 *   image → blue, PDF → red, code/text → emerald, generic → gray.
 *   Each attachment card shows the **full absolute file path**.
 *
 * ### Props
 * | Prop | Type | Description |
 * |------|------|-------------|
 * | `open` | `boolean` | Controls drawer visibility |
 * | `onClose` | `() => void` | Called on dismiss (close button, cancel, or backdrop) |
 * | `onSubmit` | `(data: CreateFeatureInput) => void` | Called with `{ userInput, repositoryPath, approvalGates }` |
 * | `repositoryPath` | `string` | Repository path (mandatory) included in the submitted data |
 * | `isSubmitting` | `boolean` | Disables all fields and shows "Creating..." on submit button |
 *
 * ### Behavior
 * - Form resets (name, description, attachments, checkboxes) when the drawer closes
 * - Submit button is disabled when name is empty OR `isSubmitting` is true
 * - `approvalGates` always included: `{ allowPrd, allowPlan, allowMerge }` (all false by default)
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
        'Callback fired with `CreateFeatureInput` when the form is submitted. Receives `{ userInput, repositoryPath, approvalGates }`.',
    },
    repositoryPath: {
      control: 'text',
      description: 'Repository path (mandatory) included in the submitted data.',
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
        repositoryPath="/Users/dev/my-repo"
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
 * Auto-approve checkbox stories
 * ------------------------------------------------------------------------- */

/**
 * All checkboxes unchecked (default) — drawer opens with no auto-approve gates enabled.
 * This is the safest default: every phase requires manual review.
 */
export const AllUnchecked: Story = {
  render: () => <CreateDrawerTrigger label="Open (All Unchecked)" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open (All Unchecked)' }));
  },
};

/**
 * All checkboxes checked via parent "Auto Approve" — fully autonomous mode.
 * Clicking the parent checkbox selects all children at once.
 */
export const AllChecked: Story = {
  render: () => <CreateDrawerTrigger label="Open (All Checked)" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open (All Checked)' }));

    const body = within(canvasElement.ownerDocument.body);
    const parent = await body.findByLabelText('Auto approve all');
    await userEvent.click(parent);
  },
};

/**
 * Only PRD checkbox checked — parent shows **indeterminate** (dash) state,
 * indicating partial selection at a glance.
 */
export const PrdOnly: Story = {
  render: () => <CreateDrawerTrigger label="Open (PRD Only)" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open (PRD Only)' }));

    const body = within(canvasElement.ownerDocument.body);
    const prd = await body.findByLabelText('PRD');
    await userEvent.click(prd);
  },
};

/**
 * Only Merge checkbox checked — parent shows **indeterminate** (dash) state.
 * Manual review for requirements and planning, auto-approve merge to Done.
 */
export const MergeOnly: Story = {
  render: () => <CreateDrawerTrigger label="Open (Merge Only)" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open (Merge Only)' }));

    const body = within(canvasElement.ownerDocument.body);
    const merge = await body.findByLabelText('Merge');
    await userEvent.click(merge);
  },
};

/* ---------------------------------------------------------------------------
 * Interactive story — full paths shown in submitted data panel
 * ------------------------------------------------------------------------- */

/**
 * Fully interactive story — open the drawer, fill the form, toggle checkboxes,
 * and click "Add Files" to attach files via the native OS file picker.
 *
 * **Submitted data** is displayed in a styled panel showing `CreateFeatureInput`
 * with `approvalGates: { allowPrd, allowPlan, allowMerge }`.
 *
 * In Storybook, the native picker won't work (no backend), but submitted data
 * would show the paths if files were attached programmatically.
 */
export const Interactive: Story = {
  render: function InteractiveRender() {
    const [open, setOpen] = useState(false);
    const [submitted, setSubmitted] = useState<CreateFeatureInput | null>(null);

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
                {JSON.stringify(submitted, null, 2)}
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
          repositoryPath="/Users/dev/my-repo"
        />
      </div>
    );
  },
};
