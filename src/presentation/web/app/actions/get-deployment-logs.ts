'use server';

import { resolve } from '@/lib/server-container';
import type {
  IDeploymentService,
  LogEntry,
} from '@shepai/core/application/ports/output/services/deployment-service.interface';

export async function getDeploymentLogs(targetId: string): Promise<LogEntry[] | null> {
  if (!targetId?.trim()) {
    return null;
  }

  const deploymentService = resolve<IDeploymentService>('IDeploymentService');
  return deploymentService.getLogs(targetId);
}
