export interface TechDecisionsReviewData {
  name: string;
  summary: string;
  decisions: unknown[];
  technologies: string[];
}

export async function getResearchArtifact(
  _featureId: string
): Promise<{ techDecisions?: TechDecisionsReviewData; error?: string }> {
  return { error: 'Not available in Storybook' };
}
