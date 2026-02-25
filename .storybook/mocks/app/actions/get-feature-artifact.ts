export async function getFeatureArtifact(
  _featureId: string
): Promise<{ questionnaire?: unknown; artifact?: unknown; error?: string }> {
  return { error: 'Not available in Storybook' };
}
