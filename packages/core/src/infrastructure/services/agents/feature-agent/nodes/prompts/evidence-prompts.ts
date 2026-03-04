/**
 * Evidence Prompt Builder
 *
 * Builds a comprehensive prompt instructing the agent to collect and post
 * evidence artifacts to a pull request. Evidence includes:
 * - Text evidence (test results, build status, spec compliance)
 * - Screenshots of UI changes (via Playwright with dynamic port detection)
 * - Video artifacts from e2e test runs
 * - Generated artifacts discovered via spec inspection
 *
 * Binary artifacts are uploaded via GitHub API (NOT committed to the branch).
 * Text evidence is posted as a structured PR comment via `gh pr comment`.
 */

import { readSpecFile } from '../node-helpers.js';
import type { FeatureAgentState } from '../../state.js';
import type { CiFixRecord } from '@/domain/generated/output.js';

/** File patterns that must NEVER be included in evidence artifacts. */
const SECURITY_EXCLUSIONS = [
  '.env',
  '.env.*',
  'credentials.json',
  '*secret*',
  '*token*',
  '*.key',
  '*.pem',
  '*.p12',
  'id_rsa',
  'node_modules/',
  '.git/',
];

/**
 * Detect whether the feature involves web UI changes by inspecting
 * state messages for paths matching the web presentation layer.
 */
function hasUiChanges(messages: string[]): boolean {
  return messages.some((msg) => msg.includes('src/presentation/web/'));
}

/**
 * Build the screenshot capture section for UI features.
 * Instructs the agent to start the dev server, detect the port dynamically,
 * and capture screenshots via Playwright.
 */
function buildScreenshotSection(): string {
  return `
## Screenshot Capture (UI Changes Detected)

Since this feature includes web UI changes, capture screenshots as evidence:

1. Start the dev server: \`pnpm dev:web\` (runs in the background)
2. Parse the actual port from the dev server stdout output — look for patterns like
   "ready on localhost:XXXX", "started server on 0.0.0.0:XXXX", or "http://localhost:XXXX"
   Do NOT hardcode any port number — the dev server assigns a random available port
3. Wait for the server to be ready (check that the URL responds with HTTP 200)
4. Use Playwright to navigate to the pages affected by the UI changes
5. Capture full-page screenshots of each affected page
6. Save screenshots to a temporary directory for upload
7. Shut down the dev server when done

IMPORTANT: Do NOT use PORT=3001 or any hardcoded port. Always parse the port from stdout.
`;
}

/**
 * Build the CI fix history section when fix attempts were made.
 */
function buildCiFixHistorySection(ciFixHistory: CiFixRecord[]): string {
  const entries = ciFixHistory
    .map((record) => `- Attempt ${record.attempt}: ${record.outcome} — ${record.failureSummary}`)
    .join('\n');

  return `
## CI Fix History

The CI watch/fix loop made ${ciFixHistory.length} fix attempt(s):

${entries}

Include this CI fix history in the evidence comment under a "CI Fix History" section.
`;
}

/**
 * Build the artifact discovery section using spec-driven inspection.
 */
function buildArtifactDiscoverySection(): string {
  return `
## Generated Artifact Discovery

Discover generated artifacts using spec-driven inspection:

1. **Primary strategy — Spec inspection**: Read the spec.yaml, plan.yaml, and tasks.yaml
   provided above. Look for:
   - Success criteria that mention output files or generated artifacts
   - Acceptance criteria in tasks that reference specific file outputs
   - Any mentions of CSV, PDF, XLSX, JSON exports, HTML reports, or other generated files
   - Search for those specific artifacts in the workspace

2. **Secondary strategy — Common output patterns**: If the spec provides no artifact hints,
   scan these common output locations:
   - \`output/\`, \`dist/\`, \`exports/\`, \`generated/\`, \`tmp/\`
   - Files matching: .csv, .pdf, .xlsx, .json (exports), .html (reports)

3. **Upload via GitHub API**: For any discovered artifacts:
   - Upload binary artifacts via \`gh api\` (use GitHub's issue attachment workflow or
     upload as release assets, then link from the PR comment)
   - Do NOT commit evidence artifacts to the feature branch
   - Include download links in the PR comment

### Security Exclusions

NEVER include files matching these patterns in evidence:
${SECURITY_EXCLUSIONS.map((p) => `- \`${p}\``).join('\n')}

### Size Limits

- Individual files must NOT exceed 10 MB — skip oversized files with a note
- Total evidence size must NOT exceed 50 MB — stop collecting when limit is reached
- Note any skipped files in the PR comment
`;
}

/**
 * Build the e2e test and video collection section.
 */
function buildE2eTestSection(): string {
  return `
## E2E Test Execution and Video Collection

1. Run e2e tests: \`pnpm test:e2e\` to validate the feature end-to-end
2. After tests complete, check the \`test-results/\` directory for:
   - Video recordings of test runs (Playwright captures video artifacts)
   - Screenshot artifacts from test assertions
3. Collect any video files for upload as evidence
`;
}

/**
 * Build the evidence comment template that the agent should post.
 */
function buildCommentTemplateSection(): string {
  return `
## Evidence Comment Format

The PR comment MUST start with the idempotency marker on the very first line:
\`<!-- shep-evidence-v1 -->\`

Then include these sections using collapsible markdown:

\`\`\`markdown
<!-- shep-evidence-v1 -->
## Evidence Report

<details>
<summary>Implementation Summary</summary>

[Summarize what was implemented, referencing spec requirements]

</details>

<details>
<summary>Test Results</summary>

[Test pass/fail counts, coverage if available]

</details>

<details>
<summary>Build Verification</summary>

[Build, lint, typecheck status]

</details>

<details>
<summary>Files Changed</summary>

[List of modified files with brief descriptions]

</details>

<details>
<summary>Spec Compliance</summary>

[Checklist of spec success criteria with pass/fail indicators]

</details>

[Include additional sections as applicable: fix attempts, screenshots, videos, artifacts]
\`\`\`
`;
}

/**
 * Build the full evidence collection prompt.
 *
 * Constructs a comprehensive prompt instructing the agent to gather evidence
 * and post it to the PR. The prompt includes spec context, conditional sections
 * for UI screenshots and artifact discovery, and the PR comment template.
 *
 * @param state - Current feature agent state
 * @param prNumber - PR number to post evidence to
 * @param prUrl - PR URL for reference
 * @param ciStatus - Current CI status (null if not yet run)
 * @param ciFixHistory - Array of CI fix attempt records
 * @param branch - Feature branch name
 * @returns Complete prompt string for the evidence agent call
 */
export function buildEvidencePrompt(
  state: FeatureAgentState,
  prNumber: number,
  prUrl: string,
  ciStatus: string | null,
  ciFixHistory: CiFixRecord[],
  branch: string
): string {
  const specContent = readSpecFile(state.specDir, 'spec.yaml');
  const planContent = readSpecFile(state.specDir, 'plan.yaml');
  const tasksContent = readSpecFile(state.specDir, 'tasks.yaml');
  const cwd = state.worktreePath || state.repositoryPath;

  const uiChangesDetected = hasUiChanges(state.messages);
  const screenshotSection = uiChangesDetected ? buildScreenshotSection() : '';
  const ciFixSection = ciFixHistory.length > 0 ? buildCiFixHistorySection(ciFixHistory) : '';
  const ciStatusText = ciStatus ?? 'not yet available';

  return `You are collecting evidence for PR #${prNumber} and posting it as a structured comment.

## PR Information

- PR Number: #${prNumber}
- PR URL: ${prUrl}
- Branch: \`${branch}\`
- CI Status: ${ciStatusText}

## Working Directory

${cwd}

## Feature Specification Context

\`\`\`yaml
${specContent || '(spec.yaml not available)'}
\`\`\`

## Implementation Plan Context

\`\`\`yaml
${planContent || '(plan.yaml not available)'}
\`\`\`

## Tasks Context

\`\`\`yaml
${tasksContent || '(tasks.yaml not available)'}
\`\`\`

## Instructions

Collect evidence for this pull request and post a structured PR comment. Follow these steps:

### 1. Gather Text Evidence

- Review the git diff to create an Implementation Summary referencing spec requirements
- Run \`pnpm test:unit\` and summarize Test Results (pass/fail counts)
- Run \`pnpm validate\` (or check build/lint/typecheck output) for Build Verification
- List all Files Changed with brief descriptions of each change
- Check the spec's success criteria above and create a Spec Compliance checklist
${buildE2eTestSection()}
${screenshotSection}
${buildArtifactDiscoverySection()}
${ciFixSection}
${buildCommentTemplateSection()}

### Post the Evidence Comment

Post the evidence as a PR comment using:

\`\`\`
gh pr comment ${prNumber} --body "<your formatted evidence markdown>"
\`\`\`

**Idempotency**: Before posting, check if an existing evidence comment exists:
1. List comments: \`gh api repos/{owner}/{repo}/issues/${prNumber}/comments\`
2. Search for \`<!-- shep-evidence-v1 -->\` in comment bodies
3. If found, update the existing comment using \`gh api\` with PATCH
4. If not found, create a new comment with \`gh pr comment\`

## Constraints

- The evidence comment MUST start with \`<!-- shep-evidence-v1 -->\` as the first line
- Do NOT commit evidence artifacts to the feature branch — upload via GitHub API only
- Do NOT modify any source code files — only collect evidence and post comments
- If any evidence step fails (e.g., test execution, screenshot capture), skip that step and continue with remaining evidence
- Always post whatever evidence was successfully collected, even if some steps failed
- Report any failures in the evidence comment itself`;
}
