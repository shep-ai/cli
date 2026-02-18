import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Label } from './label';

const meta: Meta<typeof RadioGroup> = {
  title: 'Primitives/RadioGroup',
  component: RadioGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="option-1">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-1" id="option-1" />
        <Label htmlFor="option-1">Option 1</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-2" id="option-2" />
        <Label htmlFor="option-2">Option 2</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-3" id="option-3" />
        <Label htmlFor="option-3">Option 3</Label>
      </div>
    </RadioGroup>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <RadioGroup defaultValue="comfortable" className="gap-4">
      <div className="flex items-start space-x-3">
        <RadioGroupItem value="compact" id="compact" className="mt-0.5" />
        <div className="grid gap-0.5">
          <Label htmlFor="compact">Compact</Label>
          <p className="text-muted-foreground text-sm">Smaller spacing between items</p>
        </div>
      </div>
      <div className="flex items-start space-x-3">
        <RadioGroupItem value="comfortable" id="comfortable" className="mt-0.5" />
        <div className="grid gap-0.5">
          <Label htmlFor="comfortable">Comfortable</Label>
          <p className="text-muted-foreground text-sm">Default spacing for readability</p>
        </div>
      </div>
      <div className="flex items-start space-x-3">
        <RadioGroupItem value="spacious" id="spacious" className="mt-0.5" />
        <div className="grid gap-0.5">
          <Label htmlFor="spacious">Spacious</Label>
          <p className="text-muted-foreground text-sm">Extra breathing room between items</p>
        </div>
      </div>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="option-1" disabled>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-1" id="disabled-1" />
        <Label htmlFor="disabled-1">Selected but disabled</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-2" id="disabled-2" />
        <Label htmlFor="disabled-2">Disabled option</Label>
      </div>
    </RadioGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <RadioGroup defaultValue="left" className="flex gap-4" orientation="horizontal">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="left" id="left" />
        <Label htmlFor="left">Left</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="center" id="center" />
        <Label htmlFor="center">Center</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="right" id="right" />
        <Label htmlFor="right">Right</Label>
      </div>
    </RadioGroup>
  ),
};
