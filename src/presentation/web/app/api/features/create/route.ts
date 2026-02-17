import { NextResponse } from 'next/server';
import { createFeature } from '@shepai/core/infrastructure/di/use-cases-bridge';

interface Attachment {
  path: string;
  name: string;
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
  const { name, description, repositoryPath, attachments } = body as {
    name?: string;
    description?: string;
    repositoryPath?: string;
    attachments?: Attachment[];
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (!repositoryPath?.trim()) {
    return NextResponse.json({ error: 'repositoryPath is required' }, { status: 400 });
  }

  const userInput = composeUserInput(name, description, attachments);

  try {
    const result = await createFeature({ userInput, repositoryPath });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create feature';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
