export async function startFeature(
  _featureId: string
): Promise<{ started: boolean; error?: string }> {
  return { started: true };
}
