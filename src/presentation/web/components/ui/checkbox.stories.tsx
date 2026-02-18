import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './checkbox';
import { Label } from './label';

const meta: Meta<typeof Checkbox> = {
  title: 'Primitives/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Checkbox />,
};

export const Checked: Story = {
  render: () => <Checkbox defaultChecked />,
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Checkbox disabled />
      <Checkbox disabled defaultChecked />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};
