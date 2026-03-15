export async function addRepository(input: {
  path: string;
  name?: string;
}): Promise<{ repository?: { id: string; name: string; path: string }; error?: string }> {
  const name = input.name ?? input.path.split('/').pop() ?? 'unknown';
  return {
    repository: {
      id: `repo-${Date.now()}`,
      name,
      path: input.path,
    },
  };
}
