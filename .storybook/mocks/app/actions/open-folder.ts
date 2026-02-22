export async function openFolder(
  _repositoryPath: string
): Promise<{ success: boolean; error?: string; path?: string }> {
  return { success: false, error: 'Not available in Storybook' };
}
