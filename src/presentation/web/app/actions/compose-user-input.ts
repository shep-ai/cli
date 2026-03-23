interface Attachment {
  path: string;
  name: string;
  notes?: string;
}

export function composeUserInput(
  description: string,
  attachments: Attachment[] | undefined
): string {
  if (!attachments || attachments.length === 0) {
    return description;
  }

  const refs = attachments
    .map((a) => (a.notes?.trim() ? `@${a.path} [Note: ${a.notes.trim()}]` : `@${a.path}`))
    .join(' ');
  return `${description}\n\n${refs}`;
}
