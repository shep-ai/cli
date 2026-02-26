'use server';

import { resolve } from '@/lib/server-container';
import type {
  IDeploymentService,
  DeploymentStatus,
} from '@shepai/core/application/ports/output/services/deployment-service.interface';

export async function getDeploymentStatus(targetId: string): Promise<DeploymentStatus | null> {
  if (!targetId?.trim()) {
    return null;
  }

  const deploymentService = resolve<IDeploymentService>('IDeploymentService');
  return deploymentService.getStatus(targetId);
}
