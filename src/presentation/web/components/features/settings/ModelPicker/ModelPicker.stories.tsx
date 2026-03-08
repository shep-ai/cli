import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ModelPicker } from './index';

const meta: Meta<typeof ModelPicker> = {
  title: 'Features/Settings/ModelPicker',
  component: ModelPicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    onModelChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state — current model is claude-sonnet-4-6, the advertised list
 * for claude-code is populated from the mock server action.
 */
export const Default: Story = {
  args: {
    initialModel: 'claude-sonnet-4-6',
  },
};

/**
 * Custom model — a free-text identifier not present in the advertised list.
 * Demonstrates that the combobox accepts arbitrary strings.
 */
export const CustomModel: Story = {
  args: {
    initialModel: 'claude-opus-4-7-experimental',
  },
};

/**
 * Disabled state — picker is non-interactive (e.g. during form submission).
 */
export const Disabled: Story = {
  args: {
    initialModel: 'claude-sonnet-4-6',
    disabled: true,
  },
};

/**
 * Opus selected — verifies the checkmark appears on the right item.
 */
export const OpusSelected: Story = {
  args: {
    initialModel: 'claude-opus-4-6',
  },
};
