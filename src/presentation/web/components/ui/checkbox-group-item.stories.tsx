import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CheckboxGroupItem } from './checkbox-group-item';

/**
 * **CheckboxGroupItem** renders a single checkbox row with a label and optional
 * description. It is the building block used inside `CheckboxGroup` but can
 * also be used standalone when you need a labelled checkbox with a description.
 */
const meta: Meta<typeof CheckboxGroupItem> = {
  title: 'Primitives/CheckboxGroupItem',
  component: CheckboxGroupItem,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CheckboxGroupItem>;

/** Unchecked item with label only. */
export const Default: Story = {
  render: function Render() {
    const [checked, setChecked] = useState(false);
    return (
      <CheckboxGroupItem
        id="demo"
        label="Enable notifications"
        checked={checked}
        onCheckedChange={setChecked}
      />
    );
  },
};

/** Item with label and description text. */
export const WithDescription: Story = {
  render: function Render() {
    const [checked, setChecked] = useState(false);
    return (
      <CheckboxGroupItem
        id="demo-desc"
        label="Auto-approve PRD"
        description="Automatically approve requirements and move to planning."
        checked={checked}
        onCheckedChange={setChecked}
      />
    );
  },
};

/** Disabled state — both checked and unchecked. */
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <CheckboxGroupItem
        id="disabled-off"
        label="Disabled unchecked"
        description="Cannot be toggled."
        checked={false}
        onCheckedChange={() => undefined}
        disabled
      />
      <CheckboxGroupItem
        id="disabled-on"
        label="Disabled checked"
        description="Cannot be toggled."
        checked
        onCheckedChange={() => undefined}
        disabled
      />
    </div>
  ),
};
