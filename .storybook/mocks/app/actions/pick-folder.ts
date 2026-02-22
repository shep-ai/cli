export async function pickFolder(): Promise<{ path: string | null; error?: string }> {
  return { path: null, error: 'Not available in Storybook' };
}
