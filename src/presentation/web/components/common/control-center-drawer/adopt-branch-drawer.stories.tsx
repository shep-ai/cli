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
 * - **Repository** (required) — combobox for selecting which repository to adopt from
 * - **Branch name** (required) — combobox with search for selecting a branch (scoped to selected repo)
 * - **Adopt Branch** button — disabled when no repo/branch is selected or submitting
 * - **Cancel** button — closes the drawer
 *
 * ### States
 * - Default: no repo or branch selected, submit disabled
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
    onSubmit: { description: 'Called with branch name and repo path when submitted' },
    isSubmitting: { control: 'boolean', description: 'Shows loading state' },
    error: { control: 'text', description: 'Error message to display' },
    repositories: { description: 'Available repositories for selection' },
    selectedRepositoryPath: { description: 'Currently selected repository path' },
    onRepositoryChange: { description: 'Called when user selects a different repository' },
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
const logRepoChange = fn().mockName('onRepositoryChange');

const sampleRepositories = [
  { id: 'repo-1', name: 'my-app', path: '/Users/dev/projects/my-app' },
  { id: 'repo-2', name: 'api-server', path: '/Users/dev/projects/api-server' },
  { id: 'repo-3', name: 'shared-lib', path: '/Users/dev/projects/shared-lib' },
];

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
  repositories = sampleRepositories,
  selectedRepositoryPath = sampleRepositories[0].path,
  branches = sampleBranches,
  branchesLoading = false,
}: {
  label?: string;
  isSubmitting?: boolean;
  error?: string;
  repositories?: { id: string; name: string; path: string }[];
  selectedRepositoryPath?: string;
  branches?: string[];
  branchesLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(selectedRepositoryPath);

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
        onSubmit={(branchName, repoPath) => {
          logSubmit(branchName, repoPath);
          setOpen(false);
        }}
        isSubmitting={isSubmitting}
        error={error}
        repositories={repositories}
        selectedRepositoryPath={selectedRepo}
        onRepositoryChange={(path) => {
          setSelectedRepo(path);
          logRepoChange(path);
        }}
        branches={branches}
        branchesLoading={branchesLoading}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

/** Default — click the trigger button to open the adopt branch drawer with repo and branch selectors. */
export const Default: Story = {
  render: () => <AdoptDrawerTrigger />,
};

/** Pre-opened drawer with repository and branch comboboxes for quick visual inspection. */
export const PreOpened: Story = {
  render: () => <AdoptDrawerTrigger label="Open Drawer" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open Drawer' }));
  },
};

/** No repository selected — branch selector shows "Select a repository first..." */
export const NoRepoSelected: Story = {
  render: () => <AdoptDrawerTrigger label="Open (No Repo)" selectedRepositoryPath="" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open (No Repo)' }));
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
  const [selectedRepo, setSelectedRepo] = useState(sampleRepositories[0].path);

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
        onSubmit={(branchName, repoPath) => {
          logSubmit(branchName, repoPath);
          setOpen(false);
        }}
        repositories={sampleRepositories}
        selectedRepositoryPath={selectedRepo}
        onRepositoryChange={(path) => {
          setSelectedRepo(path);
          logRepoChange(path);
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
