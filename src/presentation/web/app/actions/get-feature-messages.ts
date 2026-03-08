'use server';

import { resolve } from '@/lib/server-container';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';

export interface MessageData {
  role: string;
  content: string;
  options?: string[];
  selectedOption?: number;
  answer?: string;
}

type GetMessagesResult = { messages: MessageData[] } | { error: string };

export async function getFeatureMessages(featureId: string): Promise<GetMessagesResult> {
  if (!featureId.trim()) {
    return { error: 'Feature id is required' };
  }

  try {
    const repo = resolve<IFeatureRepository>('IFeatureRepository');
    const feature = await repo.findById(featureId);

    if (!feature) {
      return { error: 'Feature not found' };
    }

    const messages: MessageData[] = feature.messages.map((m) => ({
      role: m.role,
      content: m.content,
      options: m.options,
      selectedOption: m.selectedOption,
      answer: m.answer,
    }));

    return { messages };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load feature messages';
    return { error: message };
  }
}
