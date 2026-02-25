import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SystemSection } from './system-section';
import type { SystemConfig } from '@shepai/core/domain/generated/output';

const meta: Meta<typeof SystemSection> = {
  title: 'Features/Settings/SystemSection',
  component: SystemSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    onSave: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const defaultSystem: SystemConfig = {
  autoUpdate: true,
  logLevel: 'info',
};

const debugSystem: SystemConfig = {
  autoUpdate: false,
  logLevel: 'debug',
};

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const Default: Story = {
  args: {
    system: defaultSystem,
  },
};

export const DebugMode: Story = {
  args: {
    system: debugSystem,
  },
};
