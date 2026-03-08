interface Attachment {
  path: string;
  name: string;
}

export function composeUserInput(
  description: string,
  attachments: Attachment[] | undefined
): string {
  if (!attachments || attachments.length === 0) {
    return description;
  }

  const refs = attachments.map((a) => `@${a.path}`).join(' ');
  return `${description}\n\n${refs}`;
}
