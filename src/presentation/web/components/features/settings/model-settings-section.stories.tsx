import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ModelSettingsSection } from './model-settings-section';
import type { ModelConfiguration } from '@shepai/core/domain/generated/output';

const meta: Meta<typeof ModelSettingsSection> = {
  title: 'Features/Settings/ModelSettingsSection',
  component: ModelSettingsSection,
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

const defaultModels: ModelConfiguration = {
  analyze: 'claude-sonnet-4-5-20250929',
  requirements: 'claude-sonnet-4-5-20250929',
  plan: 'claude-sonnet-4-5-20250929',
  implement: 'claude-sonnet-4-5-20250929',
};

const mixedModels: ModelConfiguration = {
  analyze: 'claude-opus-4-6',
  requirements: 'claude-sonnet-4-5-20250929',
  plan: 'claude-opus-4-6',
  implement: 'claude-sonnet-4-5-20250929',
};

const emptyModels: ModelConfiguration = {
  analyze: '',
  requirements: '',
  plan: '',
  implement: '',
};

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const Default: Story = {
  args: {
    models: defaultModels,
  },
};

export const MixedModels: Story = {
  args: {
    models: mixedModels,
  },
};

export const EmptyModels: Story = {
  args: {
    models: emptyModels,
  },
};
