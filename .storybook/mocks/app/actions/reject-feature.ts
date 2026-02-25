export async function rejectFeature(
  _featureId: string,
  _feedback: string
): Promise<{ rejected: boolean; iteration?: number; iterationWarning?: boolean; error?: string }> {
  return { rejected: true, iteration: 1 };
}
