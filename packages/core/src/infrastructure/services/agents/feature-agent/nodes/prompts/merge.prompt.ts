/**
 * Merge Node Prompts
 *
 * Prompt builders for the merge node: CI fix instructions.
 */

const MAX_LOG_EXCERPT_LENGTH = 6000;

export interface CiFixPromptParams {
  logExcerpt: string;
  specSummary: string;
  attempt: number;
  maxAttempts: number;
}

/**
 * Build a constrained prompt for the AI agent when CI fails.
 * Instructs the agent to fix the specific CI failure within bounded scope.
 */
export function buildCiFixPrompt(params: CiFixPromptParams): string {
  const { specSummary, attempt, maxAttempts } = params;

  const truncatedLog =
    params.logExcerpt.length > MAX_LOG_EXCERPT_LENGTH
      ? `${params.logExcerpt.slice(0, MAX_LOG_EXCERPT_LENGTH)}\n... (truncated)`
      : params.logExcerpt;

  return `You are a senior software engineer fixing a CI failure.
This is attempt ${attempt} of ${maxAttempts}.

## Feature Context

${specSummary}

## CI Failure Log

\`\`\`
${truncatedLog}
\`\`\`

## Instructions

1. Analyze the CI failure log above carefully
2. Identify the root cause of the failure
3. Apply the minimal fix to resolve the CI issue
4. Run the failing checks locally to verify your fix

## Constraints

- Fix ONLY the issue shown in the CI log — do not refactor or improve unrelated code
- Do not add new features or change behavior beyond what is needed to pass CI
- Keep changes as small and focused as possible
- Commit with a conventional commit message (e.g. \`fix(scope): resolve CI failure\`)`;
}
