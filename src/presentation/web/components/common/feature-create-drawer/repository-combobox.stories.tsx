import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RepositoryCombobox } from './feature-create-drawer';
import type { RepositoryOption } from './feature-create-drawer';
import { FeatureFlagsProvider } from '@/hooks/feature-flags-context';
import type { FeatureFlagsState } from '@/lib/feature-flags';

const SAMPLE_REPOSITORIES: RepositoryOption[] = [
  { id: 'repo-001', name: 'my-app', path: '/Users/dev/projects/my-app' },
  { id: 'repo-002', name: 'api-service', path: '/Users/dev/projects/api-service' },
  { id: 'repo-003', name: 'shared-lib', path: '/Users/dev/libs/shared-lib' },
  { id: 'repo-004', name: 'docs-site', path: '/Users/dev/projects/docs-site' },
];

const flagsWithGitHubImport: FeatureFlagsState = {
  skills: false,
  envDeploy: false,
  debug: false,
  githubImport: true,
  adoptBranch: false,
  reactFileManager: false,
};

const flagsWithoutGitHubImport: FeatureFlagsState = {
  skills: false,
  envDeploy: false,
  debug: false,
  githubImport: false,
  adoptBranch: false,
  reactFileManager: false,
};

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
  repositories: initialRepos,
  initialValue,
  disabled,
  flags,
}: {
  repositories: RepositoryOption[];
  initialValue?: string;
  disabled?: boolean;
  flags?: FeatureFlagsState;
}) {
  const [repos, setRepos] = useState<RepositoryOption[]>(initialRepos);
  const [value, setValue] = useState<string | undefined>(initialValue);

  const combobox = (
    <div className="w-80">
      <RepositoryCombobox
        repositories={repos}
        value={value}
        onChange={setValue}
        onAddRepository={(repo) => {
          setRepos((prev) => [...prev, repo]);
          setValue(repo.path);
        }}
        disabled={disabled}
      />
      {value ? <p className="text-muted-foreground mt-2 text-xs">Selected: {value}</p> : null}
    </div>
  );

  if (flags) {
    return <FeatureFlagsProvider flags={flags}>{combobox}</FeatureFlagsProvider>;
  }

  return combobox;
}

/** Default state with multiple repositories available for selection. */
export const WithRepositories: Story = {
  render: () => <RepositoryComboboxWrapper repositories={SAMPLE_REPOSITORIES} />,
};

/** Empty list — shows "No repositories found." message and "Add new repository..." option. */
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

/** GitHub import enabled — "Import from GitHub..." button visible in dropdown. */
export const WithGitHubImport: Story = {
  render: () => (
    <RepositoryComboboxWrapper repositories={SAMPLE_REPOSITORIES} flags={flagsWithGitHubImport} />
  ),
};

/** GitHub import disabled — "Import from GitHub..." button hidden. */
export const WithGitHubImportDisabled: Story = {
  render: () => (
    <RepositoryComboboxWrapper
      repositories={SAMPLE_REPOSITORIES}
      flags={flagsWithoutGitHubImport}
    />
  ),
};

/** Empty list with GitHub import — shows import option alongside add repository. */
export const EmptyWithGitHubImport: Story = {
  render: () => <RepositoryComboboxWrapper repositories={[]} flags={flagsWithGitHubImport} />,
};
