'use server';

import { resolve } from '@/lib/server-container';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';

/**
 * Lightweight server action to fetch a single feature's name and description.
 * Used by the SSE effect to update node metadata after AI metadata generation
 * without a full graph reconcile (which can overwrite SSE-driven state).
 */
export async function getFeatureMetadata(
  featureId: string
): Promise<{ name: string; description: string } | null> {
  const featureRepo = resolve<IFeatureRepository>('IFeatureRepository');
  const feature = await featureRepo.findById(featureId);
  if (!feature) return null;
  return { name: feature.name, description: feature.description };
}
