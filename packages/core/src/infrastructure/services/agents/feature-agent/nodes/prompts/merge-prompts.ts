/**
 * Merge Node Prompt Builders
 *
 * Builds prompts for the two agent calls in the merge node:
 * 1. buildCommitPushPrPrompt — commit (always), push (conditional), PR create (conditional)
 * 2. buildMergeSquashPrompt — merge/squash PR or branch
 */

import yaml from 'js-yaml';
import { readSpecFile } from '../node-helpers.js';
import type { FeatureAgentState } from '../../state.js';

/**
 * Extract merge-phase rejection feedback from spec.yaml.
 */
function getMergeRejectionFeedback(specContent: string): string {
  try {
    const specData = yaml.load(specContent) as Record<string, unknown> | null;
    const rejectionFeedback = specData?.rejectionFeedback as
      | { iteration: number; message: string; phase?: string; timestamp: string }[]
      | undefined;
    if (rejectionFeedback && rejectionFeedback.length > 0) {
      const mergeRejections = rejectionFeedback.filter((e) => e.phase === 'merge');
      if (mergeRejections.length > 0) {
        const latest = mergeRejections[mergeRejections.length - 1];
        const older = mergeRejections.slice(0, -1);
        const olderSection =
          older.length > 0
            ? `\n### Earlier feedback (for context only)\n${older.map((e) => `- Iteration ${e.iteration}: ${e.message}`).join('\n')}\n`
            : '';
        return `
## ⚠️ CRITICAL — User Rejection Feedback (MUST ADDRESS)

**YOUR PRIMARY TASK: The user rejected the previous result and gave this feedback. You MUST act on it:**

> ${latest.message}

(Iteration ${latest.iteration}, ${latest.timestamp})

Do NOT just record this feedback — you must actually make the changes the user requested.
${olderSection}
`;
      }
    }
  } catch {
    // Continue without rejection feedback
  }
  return '';
}

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
  const rejectionSection = getMergeRejectionFeedback(specContent);

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
${rejectionSection}
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
${rejectionSection ? '- You MUST modify source code files to address the rejection feedback above BEFORE committing' : '- Do NOT modify any source code files — only perform git operations'}
- Do NOT amend existing commits
- If there are no changes to commit, skip the commit step and report that no changes were found`;
}

/**
 * Build a prompt for the CI watch/fix agent call.
 *
 * Instructs the executor to diagnose CI failure logs, apply a targeted fix,
 * commit with the prescribed conventional message format, and push to the branch.
 *
 * @param failureLogs - Truncated CI failure log output
 * @param attemptNumber - 1-based current attempt number
 * @param maxAttempts - Maximum allowed attempts
 * @param branch - Feature branch name to push to after fixing
 */
export function buildCiWatchFixPrompt(
  failureLogs: string,
  attemptNumber: number,
  maxAttempts: number,
  branch: string
): string {
  return `You are fixing a CI failure on branch \`${branch}\` (attempt ${attemptNumber}/${maxAttempts}).

## CI Failure Logs

The following logs were retrieved from the failed GitHub Actions run:

\`\`\`
${failureLogs}
\`\`\`

## Instructions

1. Analyze the CI failure logs above to diagnose the root cause
2. Apply a targeted fix to resolve the failure — change only what is necessary
3. Stage all changes: \`git add -A\`
4. Commit with this exact conventional commit message format:
   \`fix(ci): attempt ${attemptNumber}/${maxAttempts} — <short description of what you fixed>\`
5. Push the fix to the branch: \`git push origin ${branch}\`

## Constraints

- Fix ONLY the issue(s) causing the CI failure — do not refactor unrelated code
- The commit message MUST start with \`fix(ci): attempt ${attemptNumber}/${maxAttempts} — \`
- Do NOT create a new branch — push directly to \`${branch}\`
- If the failure is unclear, make your best diagnosis and explain your reasoning in the commit message`;
}

/**
 * Build a prompt for the merge/squash agent call.
 *
 * When a PR exists, uses `gh pr merge` (remote operation — no local merge needed).
 * When no PR exists, performs a local merge in the ORIGINAL repo directory
 * (not the worktree, which IS the feature branch).
 */
export function buildMergeSquashPrompt(
  state: FeatureAgentState,
  branch: string,
  baseBranch: string,
  hasRemote = false
): string {
  if (state.prUrl && state.prNumber) {
    // PR path: remote merge via GitHub CLI — no local merge needed
    return `You are merging a pull request via the GitHub CLI.

## PR to Merge

- PR URL: ${state.prUrl}
- PR Number: #${state.prNumber}

## Instructions

1. Merge the PR using squash merge: \`gh pr merge ${state.prNumber} --squash --delete-branch\`
2. If merge conflicts are encountered, resolve them and retry
3. If the merge fails, report the error clearly

## Constraints

- Use squash merge strategy to keep history clean
- Report the merge result clearly`;
  }

  // Non-PR path: local merge in the ORIGINAL repo (not the worktree)
  const originalRepo = state.repositoryPath;

  const fetchSteps = hasRemote
    ? `2. Fetch latest: \`git fetch origin\`
3. Checkout the base branch: \`git checkout ${baseBranch}\`
4. Pull latest base: \`git pull origin ${baseBranch}\`
5. Merge the feature branch: \`git merge --squash ${branch}\`
6. If merge conflicts are encountered, resolve them manually and complete the merge
7. Commit the squash merge with a descriptive conventional commit message
8. Delete the feature branch after successful merge: \`git branch -d ${branch}\``
    : `2. Checkout the base branch: \`git checkout ${baseBranch}\`
3. Merge the feature branch: \`git merge --squash ${branch}\`
4. If merge conflicts are encountered, resolve them manually and complete the merge
5. Commit the squash merge with a descriptive conventional commit message
6. Delete the feature branch after successful merge: \`git branch -d ${branch}\``;

  return `You are performing a local merge in the original repository directory.

IMPORTANT: You MUST run all git commands in the original repository directory, NOT in any worktree.

## Branch to Merge

- Feature branch: \`${branch}\`
- Base branch: \`${baseBranch}\`

## Working Directory

${originalRepo}

## Instructions

1. Change to the original repository: \`cd ${originalRepo}\`
${fetchSteps}

## Constraints

- Use squash merge strategy to keep history clean
- All commands MUST run in \`${originalRepo}\` (the original repo), NOT in the worktree
- NEVER remove, modify, or prune git worktrees — they are managed by the system
- Do NOT try to \`git checkout\` the feature branch — \`git merge --squash\` reads from it without checking it out
- If conflicts arise during merge, attempt to resolve them intelligently
- Do NOT modify any source code beyond what is needed for conflict resolution
- Report the merge result clearly`;
}
