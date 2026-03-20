'use server';

import { resolve } from '@/lib/server-container';
import type { ListWorkflowsUseCase } from '@shepai/core/application/use-cases/workflows/list-workflows.use-case';
import type { ScheduledWorkflow } from '@shepai/core/domain/generated/output';

export interface ListWorkflowsResult {
  workflows?: ScheduledWorkflow[];
  error?: string;
}

export async function listWorkflows(repositoryPath?: string): Promise<ListWorkflowsResult> {
  try {
    const useCase = resolve<ListWorkflowsUseCase>('ListWorkflowsUseCase');
    const workflows = await useCase.execute(repositoryPath ? { repositoryPath } : undefined);
    return { workflows };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list workflows';
    return { error: message };
  }
}
