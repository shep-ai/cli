import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import { CreateFeatureUseCase } from '@shepai/core/application/use-cases/features/create/create-feature.use-case';

interface Attachment {
  path: string;
  name: string;
}

interface ApprovalGates {
  allowPrd: boolean;
  allowPlan: boolean;
  allowMerge: boolean;
}

function isValidApprovalGates(
  value: unknown
): value is ApprovalGates | Omit<ApprovalGates, 'allowMerge'> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.allowPrd !== 'boolean' || typeof obj.allowPlan !== 'boolean') return false;
  if ('allowMerge' in obj && typeof obj.allowMerge !== 'boolean') return false;
  return true;
}

function normalizeApprovalGates(
  gates: ApprovalGates | Omit<ApprovalGates, 'allowMerge'>
): ApprovalGates {
  return {
    allowPrd: gates.allowPrd,
    allowPlan: gates.allowPlan,
    allowMerge: 'allowMerge' in gates ? (gates as ApprovalGates).allowMerge : false,
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

export async function POST(request: Request) {
  const body = await request.json();
  const { name, description, repositoryPath, attachments, approvalGates } = body as {
    name?: string;
    description?: string;
    repositoryPath?: string;
    attachments?: Attachment[];
    approvalGates?: unknown;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (!repositoryPath?.trim()) {
    return NextResponse.json({ error: 'repositoryPath is required' }, { status: 400 });
  }

  if (approvalGates !== undefined && !isValidApprovalGates(approvalGates)) {
    return NextResponse.json(
      {
        error:
          'approvalGates must be an object with boolean allowPrd, allowPlan, and optional boolean allowMerge',
      },
      { status: 400 }
    );
  }

  const userInput = composeUserInput(name, description, attachments);
  const defaultGates: ApprovalGates = { allowPrd: false, allowPlan: false, allowMerge: false };
  const gates: ApprovalGates = isValidApprovalGates(approvalGates)
    ? normalizeApprovalGates(approvalGates)
    : defaultGates;

  try {
    const createFeatureUseCase = resolve(CreateFeatureUseCase);
    const result = await createFeatureUseCase.execute({ userInput, repositoryPath, approvalGates: gates });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create feature';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
