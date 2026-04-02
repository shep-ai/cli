export async function listGitHubOrganizations(): Promise<{
  orgs?: {
    login: string;
    description: string;
  }[];
  error?: string;
}> {
  return {
    orgs: [
      { login: 'acme-corp', description: 'Acme Corporation' },
      { login: 'open-source-collective', description: 'Open source projects' },
    ],
  };
}
