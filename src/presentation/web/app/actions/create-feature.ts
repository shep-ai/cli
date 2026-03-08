'use server';

import { resolve } from '@/lib/server-container';
import type { CreateFeatureUseCase } from '@shepai/core/application/use-cases/features/create/create-feature.use-case';
import type { Feature } from '@shepai/core/domain/generated/output';
import { composeUserInput } from './compose-user-input';

interface Attachment {
  path: string;
  name: string;
}

interface ApprovalGates {
  allowPrd: boolean;
  allowPlan: boolean;
  allowMerge: boolean;
}

interface CreateFeatureInput {
  description: string;
  repositoryPath: string;
  attachments?: Attachment[];
  sessionId?: string;
  approvalGates?: {
    allowPrd: boolean;
    allowPlan: boolean;
    allowMerge?: boolean;
  };
  push?: boolean;
  openPr?: boolean;
  parentId?: string;
  /** When true, skip SDLC phases and implement directly from the prompt. */
  fast?: boolean;
  /** Optional agent type override for this feature run */
  agentType?: string;
  /** Optional model identifier for this feature run */
  model?: string;
}

export async function createFeature(
  input: CreateFeatureInput
): Promise<{ feature?: Feature; error?: string }> {
  const {
    description,
    repositoryPath,
    attachments,
    sessionId,
    approvalGates,
    push,
    openPr,
    parentId,
    fast,
    agentType,
    model,
  } = input;

  if (!description?.trim()) {
    return { error: 'description is required' };
  }

  if (!repositoryPath?.trim()) {
    return { error: 'repositoryPath is required' };
  }

  const userInput = composeUserInput(description, attachments);
  const gates: ApprovalGates = {
    allowPrd: approvalGates?.allowPrd ?? false,
    allowPlan: approvalGates?.allowPlan ?? false,
    allowMerge: approvalGates?.allowMerge ?? false,
  };

  try {
    const createFeatureUseCase = resolve<CreateFeatureUseCase>('CreateFeatureUseCase');

    // Phase 1 (fast): create DB record with real UUID — returns immediately
    const { feature, shouldSpawn } = await createFeatureUseCase.createRecord({
      userInput,
      repositoryPath,
      approvalGates: gates,
      push: push ?? false,
      openPr: openPr ?? false,
      ...(parentId ? { parentId } : {}),
      description,
      ...(fast ? { fast } : {}),
      ...(agentType ? { agentType } : {}),
      ...(model ? { model } : {}),
    });

    // Phase 2 (background): metadata generation, worktree, spec, agent spawn
    // Fire-and-forget — the UI gets the real feature ID immediately
    createFeatureUseCase
      .initializeAndSpawn(
        feature,
        {
          userInput,
          repositoryPath,
          approvalGates: gates,
          push: push ?? false,
          openPr: openPr ?? false,
          ...(parentId ? { parentId } : {}),
          ...(fast ? { fast } : {}),
          ...(agentType ? { agentType } : {}),
          ...(model ? { model } : {}),
          ...(sessionId ? { sessionId } : {}),
        },
        shouldSpawn
      )
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('[createFeature] initializeAndSpawn failed:', err);
      });

    return { feature };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create feature';
    return { error: message };
  }
}
