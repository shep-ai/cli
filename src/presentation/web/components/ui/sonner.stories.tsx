import type { Meta, StoryObj } from '@storybook/react';
import { toast } from 'sonner';
import { Toaster } from './sonner';
import { Button } from './button';

const meta: Meta<typeof Toaster> = {
  title: 'UI/Toast',
  component: Toaster,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Button onClick={() => toast('Event has been created')}>Show Toast</Button>,
};

export const Description: Story = {
  render: () => (
    <Button
      onClick={() =>
        toast('Event has been created', {
          description: 'Sunday, December 03, 2023 at 9:00 AM',
        })
      }
    >
      Show Toast with Description
    </Button>
  ),
};

export const Success: Story = {
  render: () => (
    <Button variant="default" onClick={() => toast.success('Successfully saved!')}>
      Show Success Toast
    </Button>
  ),
};

export const Error: Story = {
  render: () => (
    <Button variant="destructive" onClick={() => toast.error('Something went wrong')}>
      Show Error Toast
    </Button>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Button
      onClick={() =>
        toast('Event deleted', {
          action: {
            label: 'Undo',
            onClick: () => toast('Restored!'),
          },
        })
      }
    >
      Show Toast with Action
    </Button>
  ),
};

export const PromiseToast: Story = {
  render: () => (
    <Button
      onClick={() => {
        const promiseFn = (): globalThis.Promise<{ name: string }> =>
          new globalThis.Promise((resolve) => setTimeout(() => resolve({ name: 'Sonner' }), 2000));

        toast.promise(promiseFn, {
          loading: 'Loading...',
          success: () => 'Data loaded successfully!',
          error: 'Error loading data',
        });
      }}
    >
      Show Promise Toast
    </Button>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast('Default toast')}>Default</Button>
      <Button onClick={() => toast.success('Success!')}>Success</Button>
      <Button onClick={() => toast.error('Error!')}>Error</Button>
      <Button onClick={() => toast.warning('Warning!')}>Warning</Button>
      <Button onClick={() => toast.info('Info')}>Info</Button>
    </div>
  ),
};
