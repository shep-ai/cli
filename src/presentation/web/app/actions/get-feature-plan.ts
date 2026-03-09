'use server';

import { resolve } from '@/lib/server-container';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';

export interface PlanTaskData {
  title: string;
  description: string;
  state: string;
}

export interface PlanData {
  state: string;
  overview: string;
  tasks: PlanTaskData[];
}

type GetPlanResult = { plan: PlanData | undefined } | { error: string };

export async function getFeaturePlan(featureId: string): Promise<GetPlanResult> {
  if (!featureId.trim()) {
    return { error: 'Feature id is required' };
  }

  try {
    const repo = resolve<IFeatureRepository>('IFeatureRepository');
    const feature = await repo.findById(featureId);

    if (!feature) {
      return { error: 'Feature not found' };
    }

    if (!feature.plan) {
      return { plan: undefined };
    }

    const plan: PlanData = {
      state: feature.plan.state,
      overview: feature.plan.overview,
      tasks: feature.plan.tasks.map((t) => ({
        title: t.title ?? '',
        description: t.description ?? '',
        state: t.state,
      })),
    };

    return { plan };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load feature plan';
    return { error: message };
  }
}
