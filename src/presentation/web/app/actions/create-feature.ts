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
  name: string;
  description?: string;
  repositoryPath: string;
  attachments?: Attachment[];
  approvalGates?: {
    allowPrd: boolean;
    allowPlan: boolean;
    allowMerge?: boolean;
  };
}

function composeUserInput(
  name: string,
  description: string | undefined,
  attachments: Attachment[] | undefined
): string {
  let userInput = `Feature: ${name}`;

  if (description) {
    userInput += `\n\n${description}`;
  }

  if (attachments && attachments.length > 0) {
    const paths = attachments.map((a) => `- ${a.path}`).join('\n');
    userInput += `\n\nAttached files:\n${paths}`;
  }

  return userInput;
}

export async function createFeature(
  input: CreateFeatureInput
): Promise<{ feature?: Feature; error?: string }> {
  const { name, description, repositoryPath, attachments, approvalGates } = input;

  if (!name?.trim()) {
    return { error: 'name is required' };
  }

  if (!repositoryPath?.trim()) {
    return { error: 'repositoryPath is required' };
  }

  const userInput = composeUserInput(name, description, attachments);
  const gates: ApprovalGates = {
    allowPrd: approvalGates?.allowPrd ?? false,
    allowPlan: approvalGates?.allowPlan ?? false,
    allowMerge: approvalGates?.allowMerge ?? false,
  };

  try {
    const createFeatureUseCase = resolve<CreateFeatureUseCase>('CreateFeatureUseCase');
    const result = await createFeatureUseCase.execute({
      userInput,
      repositoryPath,
      approvalGates: gates,
    });
    return { feature: result.feature };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create feature';
    return { error: message };
  }
}
