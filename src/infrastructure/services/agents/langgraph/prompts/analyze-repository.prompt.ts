export const ANALYZE_REPOSITORY_PROMPT = `You are analyzing a software repository.
Examine the codebase structure, dependencies, architecture patterns, and conventions.
Generate a comprehensive analysis document in Markdown format.

Repository path: {{repositoryPath}}

Your analysis should include:
1. Project overview and purpose
2. Technology stack and dependencies
3. Architecture patterns and code organization
4. Key conventions and patterns
5. Build system and development workflow
6. Testing strategy

Output a complete shep-analysis.md document.`;

export function buildAnalyzePrompt(repositoryPath: string): string {
  return ANALYZE_REPOSITORY_PROMPT.replace('{{repositoryPath}}', repositoryPath);
}
