export async function openIde(
  _input: unknown
): Promise<{ success: boolean; error?: string; editor?: string; path?: string }> {
  return { success: false, error: 'Not available in Storybook' };
}
