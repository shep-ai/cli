import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './textarea';
import { Label } from './label';

const meta: Meta<typeof Textarea> = {
  title: 'Primitives/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    rows: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Type your message here...' },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="description">Description</Label>
      <Textarea id="description" placeholder="Describe the feature..." />
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Disabled textarea' },
};

export const WithValue: Story = {
  args: { defaultValue: 'This textarea has initial content that can be edited.' },
};
