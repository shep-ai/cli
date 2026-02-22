/**
 * Merge Node Prompt Builders
 *
 * Builds prompts for the two agent calls in the merge node:
 * 1. buildCommitPushPrPrompt — commit (always), push (conditional), PR create (conditional)
 * 2. buildMergeSquashPrompt — merge/squash PR or branch
 */

import { readSpecFile } from '../node-helpers.js';
import type { FeatureAgentState } from '../../state.js';

/**
 * Build a prompt for the commit + push + PR agent call.
 *
 * The agent always commits. Push and PR creation are conditional based
 * on state.push and state.openPr flags.
 */
export function buildCommitPushPrPrompt(
  state: FeatureAgentState,
  branch: string,
  baseBranch: string
): string {
  const specContent = readSpecFile(state.specDir, 'spec.yaml');
  const cwd = state.worktreePath || state.repositoryPath;
  const shouldPush = state.push || state.openPr;

  const steps: string[] = [];

  // Step 1: Commit (always)
  steps.push(`1. Review the current changes using \`git diff\` and \`git status\`
2. Stage all changes with \`git add -A\`
3. Write a conventional commit message based on the actual diff content
   - Use the format: \`feat(<scope>): <description>\` or \`fix(<scope>): <description>\`
   - The commit message should summarize what actually changed, not be generic
   - Run \`git commit -m "<your message>"\``);

  // Step 2: Push (conditional)
  if (shouldPush) {
    steps.push(`4. Push the branch to remote: \`git push -u origin ${branch}\``);
  }

  // Step 3: PR creation (conditional)
  if (state.openPr) {
    steps.push(`${shouldPush ? '5' : '4'}. Create a pull request:
   - Run \`gh pr create --base ${baseBranch} --head ${branch} --title "<title>" --body "<body>"\`
   - Write a descriptive PR title using conventional commit format
   - Write a rich PR body that summarizes the changes using the spec context below
   - After creating the PR, update \`${state.specDir}/feature.yaml\` to set the prUrl field with the PR URL`);
  }

  return `You are performing git operations in a feature worktree.

## Feature Specification Context

\`\`\`yaml
${specContent}
\`\`\`

## Branch Information

- Feature branch: \`${branch}\`
- Base branch: \`${baseBranch}\`

## Working Directory

${cwd}

## Instructions

${steps.join('\n')}

## Constraints

- Write a meaningful conventional commit message derived from the actual diff — do NOT use generic messages
- Do NOT modify any source code files — only perform git operations
- Do NOT amend existing commits
- If there are no changes to commit, skip the commit step and report that no changes were found`;
}

/**
 * Build a prompt for the merge/squash agent call.
 *
 * Handles both PR-based merge (gh pr merge) and direct branch merge (git merge).
 */
export function buildMergeSquashPrompt(
  state: FeatureAgentState,
  branch: string,
  baseBranch: string
): string {
  const cwd = state.worktreePath || state.repositoryPath;

  let mergeInstructions: string;
  if (state.prUrl && state.prNumber) {
    mergeInstructions = `## PR to Merge

- PR URL: ${state.prUrl}
- PR Number: #${state.prNumber}

## Instructions

1. Merge the PR using squash merge: \`gh pr merge ${state.prNumber} --squash --delete-branch\`
2. If merge conflicts are encountered, resolve them and retry
3. If the merge fails, report the error clearly`;
  } else {
    mergeInstructions = `## Branch to Merge

- Feature branch: \`${branch}\`
- Base branch: \`${baseBranch}\`

## Instructions

1. Checkout the base branch: \`git checkout ${baseBranch}\`
2. Merge the feature branch: \`git merge --squash ${branch}\`
3. If merge conflicts are encountered, resolve them manually and complete the merge
4. Commit the squash merge with a descriptive message
5. Delete the feature branch after successful merge: \`git branch -d ${branch}\``;
  }

  return `You are performing a merge operation in a repository.

${mergeInstructions}

## Working Directory

${cwd}

## Constraints

- Use squash merge strategy to keep history clean
- If conflicts arise during merge, attempt to resolve them intelligently
- Do NOT modify any source code beyond what is needed for conflict resolution
- Report the merge result clearly`;
}
