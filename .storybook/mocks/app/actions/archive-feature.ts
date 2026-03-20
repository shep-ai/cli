export async function archiveFeature(
  _featureId: string
): Promise<{ feature?: unknown; error?: string }> {
  return { feature: { id: _featureId } };
}
