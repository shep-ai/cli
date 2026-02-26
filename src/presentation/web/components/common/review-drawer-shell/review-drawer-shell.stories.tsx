import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ReviewDrawerShell } from './review-drawer-shell';

const meta: Meta<typeof ReviewDrawerShell> = {
  title: 'Drawers/Review/ReviewDrawerShell',
  component: ReviewDrawerShell,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ReviewDrawerShell>;

function ShellTemplate(
  props: Omit<React.ComponentProps<typeof ReviewDrawerShell>, 'open' | 'onClose' | 'children'>
) {
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
      <ReviewDrawerShell {...props} open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-muted-foreground text-sm">Review content goes here</p>
        </div>
      </ReviewDrawerShell>
    </div>
  );
}

/** Default shell with action buttons. */
export const Default: Story = {
  render: () => (
    <ShellTemplate
      featureName="User Authentication Flow"
      featureDescription="Implement OAuth2 login with social providers and MFA support"
      featureId="FEAT-042"
      repositoryPath="/Users/dev/my-project"
      branch="feat/auth-flow"
      specPath="/Users/dev/my-project/specs/042-auth-flow"
    />
  ),
};

/** Shell with inline delete button. */
export const WithDelete: Story = {
  render: () => (
    <ShellTemplate
      featureName="User Authentication Flow"
      featureId="FEAT-042"
      repositoryPath="/Users/dev/my-project"
      branch="feat/auth-flow"
      specPath="/Users/dev/my-project/specs/042-auth-flow"
      onDelete={fn().mockName('onDelete')}
    />
  ),
};

/** Shell with delete in progress. */
export const DeletingState: Story = {
  render: () => (
    <ShellTemplate
      featureName="User Authentication Flow"
      featureId="FEAT-042"
      repositoryPath="/Users/dev/my-project"
      branch="feat/auth-flow"
      onDelete={fn().mockName('onDelete')}
      isDeleting
    />
  ),
};

/** Shell without action buttons (no repositoryPath). */
export const NoActions: Story = {
  render: () => <ShellTemplate featureName="Standalone Feature" featureId="FEAT-001" />,
};
