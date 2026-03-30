import type { RepositoryCommitsData } from '@/app/actions/get-repository-commits';

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

const mockData: RepositoryCommitsData = {
  currentBranch: 'feat/commit-history-tree',
  defaultBranch: 'main',
  commits: [
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
      refs: ['origin/main', 'main'],
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
      subject: 'refactor(web): reorganize sidebar layout components',
      authorName: 'Alex Dev',
      authorEmail: 'alex@example.com',
      date: daysAgo(5),
      refs: [],
    },
    {
      hash: 'a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8',
      shortHash: 'a7b8c9d',
      subject: 'test(integration): add session batch polling tests',
      authorName: 'Jordan QA',
      authorEmail: 'jordan@example.com',
      date: daysAgo(7),
      refs: [],
    },
    {
      hash: 'b8c9d0e1f2a3b8c9d0e1f2a3b8c9d0e1f2b8c9d0',
      shortHash: 'b8c9d0e',
      subject: 'docs: update agent system documentation',
      authorName: 'Alex Dev',
      authorEmail: 'alex@example.com',
      date: daysAgo(10),
      refs: ['v1.151.0'],
    },
  ],
};

export async function getRepositoryCommits(
  _repositoryPath: string,
  _branch?: string,
  _limit?: number
): Promise<{ success: boolean; data?: RepositoryCommitsData; error?: string }> {
  return { success: true, data: mockData };
}
