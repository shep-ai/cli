export async function deployFeature(
  _featureId: string
): Promise<{ success: boolean; error?: string; state?: string }> {
  return { success: false, error: 'Not available in Storybook' };
}
