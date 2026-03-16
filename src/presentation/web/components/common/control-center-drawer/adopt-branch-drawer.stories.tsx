import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, fn } from '@storybook/test';
import { AdoptBranchDrawer } from './adopt-branch-drawer';
import { Button } from '@/components/ui/button';

/* ---------------------------------------------------------------------------
 * Meta
 * ------------------------------------------------------------------------- */

/**
 * **AdoptBranchDrawer** is a right-side sliding drawer for importing an
 * existing git branch into Shep's feature tracking system.
 *
 * ### Form
 * - **Branch name** (required) — text input for the branch name
 * - **Adopt Branch** button — disabled when input is empty or submitting
 * - **Cancel** button — closes the drawer
 *
 * ### States
 * - Default: empty input, submit disabled
 * - Loading: input disabled, button shows spinner
 * - Error: error message shown below input
 */
const meta: Meta<typeof AdoptBranchDrawer> = {
  title: 'Drawers/Feature/AdoptBranchDrawer',
  component: AdoptBranchDrawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    open: { control: 'boolean', description: 'Controls drawer visibility' },
    onClose: { description: 'Called when the drawer is dismissed' },
    onSubmit: { description: 'Called with the branch name when the form is submitted' },
    isSubmitting: { control: 'boolean', description: 'Shows loading state' },
    error: { control: 'text', description: 'Error message to display' },
  },
};

export default meta;
type Story = StoryObj<typeof AdoptBranchDrawer>;

/* ---------------------------------------------------------------------------
 * Shared action loggers
 * ------------------------------------------------------------------------- */

const logSubmit = fn().mockName('onSubmit');
const logClose = fn().mockName('onClose');

/* ---------------------------------------------------------------------------
 * Trigger wrapper
 * ------------------------------------------------------------------------- */

function AdoptDrawerTrigger({
  label = 'Open Adopt Branch',
  isSubmitting = false,
  error,
}: {
  label?: string;
  isSubmitting?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen items-start p-4">
      <Button variant="outline" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <AdoptBranchDrawer
        open={open}
        onClose={() => {
          setOpen(false);
          logClose();
        }}
        onSubmit={(branchName) => {
          logSubmit(branchName);
          setOpen(false);
        }}
        isSubmitting={isSubmitting}
        error={error}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

/** Default empty form — click the trigger button to open the adopt branch drawer. */
export const Default: Story = {
  render: () => <AdoptDrawerTrigger />,
};

/** Pre-opened drawer for quick visual inspection. */
export const PreOpened: Story = {
  render: () => <AdoptDrawerTrigger label="Open Drawer" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open Drawer' }));
  },
};

/** Drawer with branch name typed in — ready to submit. */
export const WithBranchName: Story = {
  render: () => <AdoptDrawerTrigger label="Open (With Branch)" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open (With Branch)' }));

    const body = within(canvasElement.ownerDocument.body);
    const input = await body.findByPlaceholderText('e.g. fix/login-bug or feat/user-auth');
    await userEvent.type(input, 'fix/login-bug');
  },
};

/** Loading state — input disabled, button shows spinner. */
export const Loading: Story = {
  render: () => <AdoptDrawerTrigger label="Open (Loading)" isSubmitting />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open (Loading)' }));
  },
};

/** Error state — error message visible below input. */
export const WithError: Story = {
  render: () => (
    <AdoptDrawerTrigger
      label="Open (Error)"
      error='Branch "main" cannot be adopted. The main branch should not be tracked as a feature.'
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open (Error)' }));
  },
};

/* ---------------------------------------------------------------------------
 * Shell template — starts open in full-page context
 * ------------------------------------------------------------------------- */

function AdoptDrawerShellTemplate() {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ height: '100vh', background: '#f8fafc', padding: '2rem' }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '6px' }}
      >
        Open Drawer
      </button>
      <AdoptBranchDrawer
        open={open}
        onClose={() => {
          setOpen(false);
          logClose();
        }}
        onSubmit={(branchName) => {
          logSubmit(branchName);
          setOpen(false);
        }}
      />
    </div>
  );
}

/** Adopt branch drawer rendered inside a full-page context — starts open. */
export const InDrawer: Story = {
  render: () => <AdoptDrawerShellTemplate />,
};
