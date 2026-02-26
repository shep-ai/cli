export async function stopDeployment(
  _targetId: string
): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Not available in Storybook' };
}
