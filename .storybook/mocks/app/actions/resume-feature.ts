export async function resumeFeature(
  _featureId: string
): Promise<{ resumed: boolean; error?: string }> {
  return { resumed: true };
}
