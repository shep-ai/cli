'use server';

import { resolve } from '@/lib/server-container';
import type { ListGitHubOrganizationsUseCase } from '@shepai/core/application/use-cases/repositories/list-github-organizations.use-case';
import type { GitHubOrganization } from '@shepai/core/application/ports/output/services/github-repository-service.interface';
import { GitHubAuthError } from '@shepai/core/application/ports/output/services/github-repository-service.interface';

export async function listGitHubOrganizations(): Promise<{
  orgs?: GitHubOrganization[];
  error?: string;
}> {
  try {
    const useCase = resolve<ListGitHubOrganizationsUseCase>('ListGitHubOrganizationsUseCase');
    const orgs = await useCase.execute();
    return { orgs };
  } catch (error: unknown) {
    if (error instanceof GitHubAuthError) {
      return { error: 'GitHub CLI is not authenticated. Run `gh auth login` to sign in.' };
    }
    const message = error instanceof Error ? error.message : 'Failed to list organizations';
    return { error: message };
  }
}
