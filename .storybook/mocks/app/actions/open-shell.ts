export async function openShell(
  _input: unknown
): Promise<{ success: boolean; error?: string; path?: string; shell?: string }> {
  return { success: false, error: 'Not available in Storybook' };
}
