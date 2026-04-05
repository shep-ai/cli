/**
 * Conflict Resolution Prompt Builder
 *
 * Builds prompts for the AI agent to resolve git rebase conflicts.
 * Follows the merge-prompts.ts pattern of pure functions returning
 * markdown strings.
 */

export interface ConflictedFile {
  /** Relative file path from repo root */
  path: string;
  /** Full file contents including conflict markers */
  content: string;
}

export interface ConflictResolutionPromptParams {
  /** Files with conflict markers */
  conflictedFiles: ConflictedFile[];
  /** The feature branch being rebased */
  featureBranch: string;
  /** The base branch being rebased onto */
  baseBranch: string;
  /** 1-based attempt number */
  attemptNumber: number;
  /** Maximum allowed attempts */
  maxAttempts: number;
  /** Feedback from previous failed attempt (remaining markers info) */
  previousFeedback?: string;
}

/**
 * Build a prompt for the conflict resolution agent.
 *
 * The agent receives conflicted file contents and instructions to resolve
 * all conflict markers by editing files in the working directory.
 */
export function buildConflictResolutionPrompt(params: ConflictResolutionPromptParams): string {
  const {
    conflictedFiles,
    featureBranch,
    baseBranch,
    attemptNumber,
    maxAttempts,
    previousFeedback,
  } = params;

  const fileSection = conflictedFiles
    .map(
      (f) => `### \`${f.path}\`

\`\`\`
${f.content}
\`\`\``
    )
    .join('\n\n');

  const feedbackSection = previousFeedback
    ? `
## Previous Attempt Feedback

Your previous resolution attempt (${attemptNumber - 1}/${maxAttempts}) was incomplete:

${previousFeedback}

You MUST resolve all remaining conflict markers in this attempt.
`
    : '';

  return `You are resolving git rebase conflicts (attempt ${attemptNumber}/${maxAttempts}).

## Branch Context

- Feature branch: \`${featureBranch}\`
- Base branch: \`${baseBranch}\`
- The feature branch is being rebased onto the latest \`${baseBranch}\`.
${feedbackSection}
## Conflicted Files

The following files contain conflict markers that must be resolved:

${fileSection}

## Instructions

1. Read each conflicted file listed above
2. Resolve ALL conflict markers (\`<<<<<<<\`, \`=======\`, \`>>>>>>>\`) by editing the files
3. For each conflict, determine the correct resolution by understanding the intent of both sides:
   - The \`<<<<<<< HEAD\` section contains changes from \`${baseBranch}\` (theirs during rebase)
   - The \`>>>>>>> ...\` section contains changes from \`${featureBranch}\` (ours during rebase)
4. Produce a merged result that preserves the intent of both sides where possible
5. If the changes conflict logically (not just textually), prefer the feature branch changes but ensure compatibility with the base branch

## Constraints

- Edit ONLY the conflicted files listed above — do NOT modify any other files
- Remove ALL conflict markers (\`<<<<<<<\`, \`=======\`, \`>>>>>>>\`) from every conflicted file
- Do NOT add new files or delete files
- Do NOT run git commands — only edit files to resolve conflicts
- Do NOT run tests, builds, or linters — only resolve the conflict markers
- Every conflicted file must have zero remaining conflict markers when you are done`;
}

export interface StashPopResolutionPromptParams {
  /** Files with conflict markers from stash pop */
  conflictedFiles: ConflictedFile[];
  /** The feature branch */
  featureBranch: string;
  /** The base branch the feature was rebased onto */
  baseBranch: string;
  /** 1-based attempt number */
  attemptNumber: number;
  /** Maximum allowed attempts */
  maxAttempts: number;
  /** Feedback from previous failed attempt */
  previousFeedback?: string;
}

/**
 * Build a prompt for resolving stash pop conflicts.
 *
 * Stash pop conflicts occur when rebased code conflicts with uncommitted
 * changes that were stashed before the rebase.
 */
export function buildStashPopResolutionPrompt(params: StashPopResolutionPromptParams): string {
  const {
    conflictedFiles,
    featureBranch,
    baseBranch,
    attemptNumber,
    maxAttempts,
    previousFeedback,
  } = params;

  const fileSection = conflictedFiles
    .map(
      (f) => `### \`${f.path}\`

\`\`\`
${f.content}
\`\`\``
    )
    .join('\n\n');

  const feedbackSection = previousFeedback
    ? `
## Previous Attempt Feedback

Your previous resolution attempt (${attemptNumber - 1}/${maxAttempts}) was incomplete:

${previousFeedback}

You MUST resolve all remaining conflict markers in this attempt.
`
    : '';

  return `You are resolving git stash pop conflicts (attempt ${attemptNumber}/${maxAttempts}).

## Context

- Feature branch: \`${featureBranch}\`
- Base branch: \`${baseBranch}\`
- The feature branch was just rebased onto \`${baseBranch}\`.
- Uncommitted changes were stashed before the rebase and are now being restored via stash pop.
- The stash pop caused conflicts because the rebased code modified the same files as the stashed uncommitted changes.
${feedbackSection}
## Conflicted Files

The following files contain conflict markers from the stash pop:

${fileSection}

## Instructions

1. Read each conflicted file listed above
2. Resolve ALL conflict markers (\`<<<<<<<\`, \`=======\`, \`>>>>>>>\`) by editing the files
3. For each conflict:
   - The \`<<<<<<< Updated upstream\` section contains the rebased code (current branch state after rebase)
   - The \`>>>>>>> Stashed changes\` section contains the user's uncommitted work-in-progress
4. Preserve the user's uncommitted changes where possible — these are work-in-progress edits the user was actively developing
5. Integrate the rebased code changes that don't conflict with the user's intent

## Constraints

- Edit ONLY the conflicted files listed above — do NOT modify any other files
- Remove ALL conflict markers (\`<<<<<<<\`, \`=======\`, \`>>>>>>>\`) from every conflicted file
- Do NOT add new files or delete files
- Do NOT run git commands — only edit files to resolve conflicts
- Do NOT run tests, builds, or linters — only resolve the conflict markers
- Every conflicted file must have zero remaining conflict markers when you are done`;
}
