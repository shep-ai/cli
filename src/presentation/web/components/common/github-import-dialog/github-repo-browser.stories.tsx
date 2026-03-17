import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { GitHubRepoBrowser } from './github-repo-browser';
import type { GitHubRepo } from '@shepai/core/application/ports/output/services/github-repository-service.interface';

const mockRepos: GitHubRepo[] = [
  {
    name: 'awesome-app',
    nameWithOwner: 'octocat/awesome-app',
    description: 'An awesome application built with React and TypeScript',
    isPrivate: false,
    pushedAt: '2025-03-15T10:00:00Z',
  },
  {
    name: 'secret-project',
    nameWithOwner: 'octocat/secret-project',
    description: 'Top secret private repository',
    isPrivate: true,
    pushedAt: '2025-03-14T08:00:00Z',
  },
  {
    name: 'open-source-lib',
    nameWithOwner: 'octocat/open-source-lib',
    description: 'A reusable open-source library for everyone',
    isPrivate: false,
    pushedAt: '2025-03-13T15:30:00Z',
  },
  {
    name: 'private-infra',
    nameWithOwner: 'octocat/private-infra',
    description: '',
    isPrivate: true,
    pushedAt: '2025-03-12T12:00:00Z',
  },
  {
    name: 'docs-site',
    nameWithOwner: 'octocat/docs-site',
    description: 'Documentation website powered by Next.js',
    isPrivate: false,
    pushedAt: '2025-03-11T09:00:00Z',
  },
];

const meta: Meta<typeof GitHubRepoBrowser> = {
  title: 'Composed/GitHubRepoBrowser',
  component: GitHubRepoBrowser,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    onSelect: fn().mockName('onSelect'),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GitHubRepoBrowser>;

export const Default: Story = {
  args: {
    fetchRepos: () => Promise.resolve({ repos: mockRepos }),
  },
};

export const Loading: Story = {
  args: {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    fetchRepos: () => new Promise(() => {}), // never resolves
  },
};

export const Empty: Story = {
  args: {
    fetchRepos: () => Promise.resolve({ repos: [] }),
  },
};

export const Error: Story = {
  args: {
    fetchRepos: () =>
      Promise.resolve({
        error: 'GitHub CLI is not authenticated. Run `gh auth login` to sign in.',
      }),
  },
};
