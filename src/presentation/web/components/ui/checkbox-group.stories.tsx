import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CheckboxGroup } from './checkbox-group';

const DEMO_OPTIONS = [
  { id: 'prd', label: 'PRD', description: 'Auto-approve requirements move to planning.' },
  { id: 'plan', label: 'Plan', description: 'Auto-approve planning move to implementation.' },
  { id: 'merge', label: 'Merge', description: 'Auto-approve merge move to Done.' },
];

/**
 * **CheckboxGroup** is a tri-state parent checkbox with child items.
 *
 * - **Parent unchecked**: no children selected. Click → selects all.
 * - **Parent checked**: all children selected. Click → deselects all.
 * - **Parent indeterminate** (dash): some children selected. Click → selects all.
 *
 * Built on `Checkbox` and `CheckboxGroupItem`.
 */
const meta: Meta<typeof CheckboxGroup> = {
  title: 'Primitives/CheckboxGroup',
  component: CheckboxGroup,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CheckboxGroup>;

/** All unchecked — parent shows empty checkbox. */
export const AllUnchecked: Story = {
  render: function Render() {
    const [value, setValue] = useState<Record<string, boolean>>({
      prd: false,
      plan: false,
      merge: false,
    });
    return (
      <CheckboxGroup
        label="All"
        description="YOLO!"
        parentAriaLabel="Auto approve all"
        options={DEMO_OPTIONS}
        value={value}
        onValueChange={setValue}
      />
    );
  },
};

/** All checked — parent shows checkmark. */
export const AllChecked: Story = {
  render: function Render() {
    const [value, setValue] = useState<Record<string, boolean>>({
      prd: true,
      plan: true,
      merge: true,
    });
    return (
      <CheckboxGroup
        label="All"
        description="YOLO!"
        parentAriaLabel="Auto approve all"
        options={DEMO_OPTIONS}
        value={value}
        onValueChange={setValue}
      />
    );
  },
};

/** Partial selection — parent shows indeterminate dash. */
export const Indeterminate: Story = {
  render: function Render() {
    const [value, setValue] = useState<Record<string, boolean>>({
      prd: true,
      plan: false,
      merge: false,
    });
    return (
      <CheckboxGroup
        label="All"
        description="YOLO!"
        parentAriaLabel="Auto approve all"
        options={DEMO_OPTIONS}
        value={value}
        onValueChange={setValue}
      />
    );
  },
};

/** Disabled state — all controls non-interactive. */
export const Disabled: Story = {
  render: () => (
    <CheckboxGroup
      label="All"
      parentAriaLabel="Auto approve all"
      options={DEMO_OPTIONS}
      value={{ prd: true, plan: false, merge: true }}
      onValueChange={() => undefined}
      disabled
    />
  ),
};
