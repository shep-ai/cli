'use server';

import { resolve } from '@/lib/server-container';
import type { IDeploymentService } from '@shepai/core/application/ports/output/services/deployment-service.interface';

export async function stopDeployment(
  targetId: string
): Promise<{ success: boolean; error?: string }> {
  if (!targetId?.trim()) {
    return { success: false, error: 'targetId is required' };
  }

  try {
    const deploymentService = resolve<IDeploymentService>('IDeploymentService');
    await deploymentService.stop(targetId);

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to stop deployment';
    return { success: false, error: message };
  }
}
