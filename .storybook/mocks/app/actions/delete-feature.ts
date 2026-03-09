export async function deleteFeature(
  _featureId: string,
  _cleanup?: boolean
): Promise<{ feature?: unknown; error?: string }> {
  return { error: 'Not available in Storybook' };
}
