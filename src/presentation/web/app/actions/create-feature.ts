'use server';

import { resolve } from '@/lib/server-container';
import type { CreateFeatureUseCase } from '@shepai/core/application/use-cases/features/create/create-feature.use-case';
import type { Feature } from '@shepai/core/domain/generated/output';

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
  /** Optional model identifier for this feature run */
  model?: string;
}

function composeUserInput(description: string, attachments: Attachment[] | undefined): string {
  let userInput = description;

  if (attachments && attachments.length > 0) {
    const paths = attachments.map((a) => `- ${a.path}`).join('\n');
    userInput += `\n\nAttached files:\n${paths}`;
  }

  return userInput;
}

export async function createFeature(
  input: CreateFeatureInput
): Promise<{ feature?: Feature; error?: string }> {
  const { description, repositoryPath, attachments, approvalGates, push, openPr, parentId, fast, model } =
    input;

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
          ...(model ? { model } : {}),
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
