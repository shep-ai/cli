export async function getFeatureMetadata(
  _featureId: string
): Promise<{ name: string; description: string } | null> {
  return { name: 'Mock Feature', description: 'Mock description' };
}
