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
 * - **Branch name** (required) — combobox with search for selecting a branch
 * - **Adopt Branch** button — disabled when no branch is selected or submitting
 * - **Cancel** button — closes the drawer
 *
 * ### States
 * - Default: no branch selected, submit disabled
 * - Loading branches: combobox shows loading spinner
 * - Loading submit: button shows spinner
 * - Error: error message shown below combobox
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
    branches: { description: 'Available branch names for the combobox dropdown' },
    branchesLoading: { control: 'boolean', description: 'Whether branches are loading' },
  },
};

export default meta;
type Story = StoryObj<typeof AdoptBranchDrawer>;

/* ---------------------------------------------------------------------------
 * Shared data
 * ------------------------------------------------------------------------- */

const logSubmit = fn().mockName('onSubmit');
const logClose = fn().mockName('onClose');

const sampleBranches = [
  'feat/user-auth',
  'feat/dashboard-redesign',
  'fix/login-bug',
  'fix/memory-leak',
  'chore/update-deps',
  'refactor/api-layer',
  'docs/readme-update',
  'release/v2.0',
  'hotfix/critical-fix',
  'develop',
];

/* ---------------------------------------------------------------------------
 * Trigger wrapper
 * ------------------------------------------------------------------------- */

function AdoptDrawerTrigger({
  label = 'Open Adopt Branch',
  isSubmitting = false,
  error,
  branches = sampleBranches,
  branchesLoading = false,
}: {
  label?: string;
  isSubmitting?: boolean;
  error?: string;
  branches?: string[];
  branchesLoading?: boolean;
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
        branches={branches}
        branchesLoading={branchesLoading}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

/** Default — click the trigger button to open the adopt branch drawer with branch combobox. */
export const Default: Story = {
  render: () => <AdoptDrawerTrigger />,
};

/** Pre-opened drawer with branch combobox for quick visual inspection. */
export const PreOpened: Story = {
  render: () => <AdoptDrawerTrigger label="Open Drawer" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open Drawer' }));
  },
};

/** Branches loading state — combobox shows "Loading branches..." */
export const BranchesLoading: Story = {
  render: () => <AdoptDrawerTrigger label="Open (Loading Branches)" branchesLoading />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open (Loading Branches)' }));
  },
};

/** Loading state — submit in progress, button shows spinner. */
export const Loading: Story = {
  render: () => <AdoptDrawerTrigger label="Open (Loading)" isSubmitting />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open (Loading)' }));
  },
};

/** Error state — error message visible below combobox. */
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

/** No branches available — empty state in the combobox dropdown. */
export const NoBranches: Story = {
  render: () => <AdoptDrawerTrigger label="Open (No Branches)" branches={[]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open (No Branches)' }));
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
        branches={sampleBranches}
      />
    </div>
  );
}

/** Adopt branch drawer rendered inside a full-page context — starts open. */
export const InDrawer: Story = {
  render: () => <AdoptDrawerShellTemplate />,
};
