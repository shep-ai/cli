export async function deleteRepository(
  _repositoryId: string
): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Not available in Storybook' };
}
