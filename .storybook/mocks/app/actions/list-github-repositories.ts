export async function listGitHubRepositories(input?: {
  search?: string;
  limit?: number;
  owner?: string;
}): Promise<{
  repos?: {
    name: string;
    nameWithOwner: string;
    description: string;
    isPrivate: boolean;
    pushedAt: string;
  }[];
  error?: string;
}> {
  const repos = [
    {
      name: 'my-app',
      nameWithOwner: 'user/my-app',
      description: 'A sample application',
      isPrivate: false,
      pushedAt: '2026-01-15T10:00:00Z',
    },
    {
      name: 'private-lib',
      nameWithOwner: 'user/private-lib',
      description: 'Internal library',
      isPrivate: true,
      pushedAt: '2026-01-10T08:00:00Z',
    },
  ];

  if (input?.search) {
    const q = input.search.toLowerCase();
    return { repos: repos.filter((r) => r.name.toLowerCase().includes(q)) };
  }

  return { repos };
}
