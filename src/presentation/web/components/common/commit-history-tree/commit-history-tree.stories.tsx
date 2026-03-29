import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CommitHistoryTree } from './commit-history-tree';
import type { CommitInfo } from '@/app/actions/get-repository-commits';

const meta: Meta<typeof CommitHistoryTree> = {
  title: 'Common/CommitHistoryTree',
  component: CommitHistoryTree,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="border-border bg-background w-[380px] overflow-y-auto rounded-lg border">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CommitHistoryTree>;

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

const sampleCommits: CommitInfo[] = [
  {
    hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    shortHash: 'a1b2c3d',
    subject: 'feat(web): add commit history tree component',
    authorName: 'Alex Dev',
    authorEmail: 'alex@example.com',
    date: daysAgo(0),
    refs: ['HEAD -> feat/commit-history-tree'],
  },
  {
    hash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6b2c3d4',
    shortHash: 'b2c3d4e',
    subject: 'fix(web): resolve chat concurrency issue in polling',
    authorName: 'Alex Dev',
    authorEmail: 'alex@example.com',
    date: daysAgo(1),
    refs: [],
  },
  {
    hash: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6c3d4e5f6',
    shortHash: 'c3d4e5f',
    subject: 'chore(release): 1.152.0 [skip ci]',
    authorName: 'Release Bot',
    authorEmail: 'bot@example.com',
    date: daysAgo(2),
    refs: ['origin/main', 'main', 'v1.152.0'],
  },
  {
    hash: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6d4e5f6a1b2',
    shortHash: 'd4e5f6a',
    subject: 'feat(agents): interactive feature agent with claude agent sdk',
    authorName: 'Sam Engineer',
    authorEmail: 'sam@example.com',
    date: daysAgo(3),
    refs: [],
  },
  {
    hash: 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6e5f6a1b2c3d4',
    shortHash: 'e5f6a1b',
    subject: 'fix(agents): deduplicate evidence across retry attempts',
    authorName: 'Sam Engineer',
    authorEmail: 'sam@example.com',
    date: daysAgo(4),
    refs: [],
  },
  {
    hash: 'f6a1b2c3d4e5f6a1b2c3d4e5f6f6a1b2c3d4e5f6',
    shortHash: 'f6a1b2c',
    subject: 'refactor(web): reorganize sidebar layout with improved component structure',
    authorName: 'Alex Dev',
    authorEmail: 'alex@example.com',
    date: daysAgo(5),
    refs: [],
  },
];

function InteractiveTemplate({
  commits,
  currentBranch,
  defaultBranch,
}: {
  commits: CommitInfo[];
  currentBranch: string;
  defaultBranch: string;
}) {
  const [activeBranch, setActiveBranch] = useState(currentBranch);

  return (
    <CommitHistoryTree
      commits={commits}
      loading={false}
      error={null}
      currentBranch={currentBranch}
      defaultBranch={defaultBranch}
      activeBranch={activeBranch}
      onBranchChange={setActiveBranch}
    />
  );
}

export const Default: Story = {
  render: () => (
    <InteractiveTemplate
      commits={sampleCommits}
      currentBranch="feat/commit-history-tree"
      defaultBranch="main"
    />
  ),
};

export const OnDefaultBranch: Story = {
  render: () => (
    <InteractiveTemplate commits={sampleCommits} currentBranch="main" defaultBranch="main" />
  ),
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = (_branch: string) => {};

export const Loading: Story = {
  args: {
    commits: null,
    loading: true,
    error: null,
    currentBranch: 'main',
    defaultBranch: 'main',
    activeBranch: 'main',
    onBranchChange: noop,
  },
};

export const Error: Story = {
  args: {
    commits: null,
    loading: false,
    error: 'Unable to determine default branch for repository. No remote HEAD configured.',
    currentBranch: 'main',
    defaultBranch: 'main',
    activeBranch: 'main',
    onBranchChange: noop,
  },
};

export const Empty: Story = {
  args: {
    commits: [],
    loading: false,
    error: null,
    currentBranch: 'main',
    defaultBranch: 'main',
    activeBranch: 'main',
    onBranchChange: noop,
  },
};

export const LongSubjects: Story = {
  render: () => (
    <InteractiveTemplate
      commits={[
        {
          hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          shortHash: 'a1b2c3d',
          subject:
            'feat(web): implement comprehensive commit history tree with branch selector, author avatars, ref badges, and copy hash functionality',
          authorName: 'Very Long Author Name Indeed',
          authorEmail: 'verylongname@example.com',
          date: daysAgo(0),
          refs: ['HEAD -> feat/very-long-branch-name-for-testing'],
        },
        {
          hash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6b2c3d4',
          shortHash: 'b2c3d4e',
          subject: 'fix: short fix',
          authorName: 'Al',
          authorEmail: 'al@x.com',
          date: daysAgo(7),
          refs: ['origin/main', 'main', 'tag: v1.0.0'],
        },
      ]}
      currentBranch="feat/very-long-branch-name-for-testing"
      defaultBranch="main"
    />
  ),
};
