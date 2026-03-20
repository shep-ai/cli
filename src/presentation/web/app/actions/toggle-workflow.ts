'use server';

import { revalidatePath } from 'next/cache';
import { resolve } from '@/lib/server-container';
import type { ToggleWorkflowUseCase } from '@shepai/core/application/use-cases/workflows/toggle-workflow.use-case';
import type { ScheduledWorkflow } from '@shepai/core/domain/generated/output';

export interface ToggleWorkflowResult {
  workflow?: ScheduledWorkflow;
  success: boolean;
  error?: string;
}

export async function toggleWorkflow(
  workflowId: string,
  enabled: boolean
): Promise<ToggleWorkflowResult> {
  try {
    const useCase = resolve<ToggleWorkflowUseCase>('ToggleWorkflowUseCase');
    const workflow = await useCase.execute(workflowId, enabled);
    revalidatePath('/workflows');
    return { workflow, success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to toggle workflow';
    return { success: false, error: message };
  }
}
