export async function approveFeature(
  _featureId: string
): Promise<{ approved: boolean; error?: string }> {
  return { approved: true };
}
