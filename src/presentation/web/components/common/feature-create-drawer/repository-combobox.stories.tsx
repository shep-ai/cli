import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RepositoryCombobox } from './feature-create-drawer';
import type { RepositoryOption } from './feature-create-drawer';

const SAMPLE_REPOSITORIES: RepositoryOption[] = [
  { id: 'repo-001', name: 'my-app', path: '/Users/dev/projects/my-app' },
  { id: 'repo-002', name: 'api-service', path: '/Users/dev/projects/api-service' },
  { id: 'repo-003', name: 'shared-lib', path: '/Users/dev/libs/shared-lib' },
  { id: 'repo-004', name: 'docs-site', path: '/Users/dev/projects/docs-site' },
];

const meta: Meta<typeof RepositoryCombobox> = {
  title: 'Drawers/Feature/RepositoryCombobox',
  component: RepositoryCombobox,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof RepositoryCombobox>;

function RepositoryComboboxWrapper({
  repositories,
  initialValue,
  disabled,
}: {
  repositories: RepositoryOption[];
  initialValue?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<string | undefined>(initialValue);

  return (
    <div className="w-80">
      <RepositoryCombobox
        repositories={repositories}
        value={value}
        onChange={setValue}
        disabled={disabled}
      />
      {value ? <p className="text-muted-foreground mt-2 text-xs">Selected: {value}</p> : null}
    </div>
  );
}

/** Default state with multiple repositories available for selection. */
export const WithRepositories: Story = {
  render: () => <RepositoryComboboxWrapper repositories={SAMPLE_REPOSITORIES} />,
};

/** Empty list — shows "No repositories found." message when opened. */
export const EmptyList: Story = {
  render: () => <RepositoryComboboxWrapper repositories={[]} />,
};

/** Pre-selected repository — trigger button shows the selected repo name. */
export const PreSelected: Story = {
  render: () => (
    <RepositoryComboboxWrapper
      repositories={SAMPLE_REPOSITORIES}
      initialValue="/Users/dev/projects/api-service"
    />
  ),
};

/** Disabled state — combobox trigger button is non-interactive. */
export const Disabled: Story = {
  render: () => <RepositoryComboboxWrapper repositories={SAMPLE_REPOSITORIES} disabled />,
};
