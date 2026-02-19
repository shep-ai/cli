import type { Meta, StoryObj } from '@storybook/react';
import { Code2, Terminal } from 'lucide-react';
import { ActionButton } from './action-button';

const meta: Meta<typeof ActionButton> = {
  title: 'Common/ActionButton',
  component: ActionButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    label: 'Open in IDE',
    loading: false,
    error: false,
    icon: Code2,
  },
};

export default meta;
type Story = StoryObj<typeof ActionButton>;

function noop() {
  // intentional no-op for stories
}

/** Default labeled button with outline variant. */
export const Default: Story = {
  args: {
    onClick: noop,
  },
};

/** Loading state — spinner replaces icon, button is disabled. */
export const Loading: Story = {
  args: {
    loading: true,
    onClick: noop,
  },
};

/** Error state — CircleAlert icon with destructive text color. */
export const Error: Story = {
  args: {
    error: true,
    onClick: noop,
  },
};

/** Icon-only mode — no label text, compact rendering. */
export const IconOnly: Story = {
  args: {
    iconOnly: true,
    variant: 'ghost',
    size: 'icon-xs',
    onClick: noop,
  },
};

/** Icon-only loading state. */
export const IconOnlyLoading: Story = {
  args: {
    iconOnly: true,
    variant: 'ghost',
    size: 'icon-xs',
    loading: true,
    onClick: noop,
  },
};

/** Icon-only error state. */
export const IconOnlyError: Story = {
  args: {
    iconOnly: true,
    variant: 'ghost',
    size: 'icon-xs',
    error: true,
    onClick: noop,
  },
};

/** Ghost variant with icon-xs size (used by repository node). */
export const GhostVariant: Story = {
  args: {
    variant: 'ghost',
    size: 'icon-xs',
    iconOnly: true,
    onClick: noop,
  },
};

/** Both buttons side-by-side (labeled, as in feature drawer). */
export const BothButtonsLabeled: Story = {
  render: () => (
    <div className="flex gap-2">
      <ActionButton label="Open in IDE" onClick={noop} loading={false} error={false} icon={Code2} />
      <ActionButton
        label="Open in Shell"
        onClick={noop}
        loading={false}
        error={false}
        icon={Terminal}
      />
    </div>
  ),
};

/** Both buttons side-by-side (icon-only, as on repository node). Always visible, grey by default, blue on hover. */
export const BothButtonsIconOnly: Story = {
  render: () => (
    <div className="flex gap-1">
      <ActionButton
        label="Open in IDE"
        onClick={noop}
        loading={false}
        error={false}
        icon={Code2}
        iconOnly
        variant="ghost"
        size="icon-xs"
      />
      <ActionButton
        label="Open in Shell"
        onClick={noop}
        loading={false}
        error={false}
        icon={Terminal}
        iconOnly
        variant="ghost"
        size="icon-xs"
      />
      <ActionButton
        label="Add"
        onClick={noop}
        loading={false}
        error={false}
        icon={Code2}
        iconOnly
        variant="ghost"
        size="icon-xs"
      />
    </div>
  ),
};
