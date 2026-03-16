export async function stopFeature(
  _featureId: string
): Promise<{ stopped: boolean; error?: string }> {
  return { stopped: true };
}
