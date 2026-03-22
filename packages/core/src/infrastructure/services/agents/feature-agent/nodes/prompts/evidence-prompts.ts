/**
 * Evidence Phase Prompt
 *
 * Instructs the agent to capture visual and textual evidence
 * (screenshots, test outputs, terminal recordings) proving that
 * completed tasks work as expected. Evidence files are saved to the
 * shep home folder (~/.shep/repos/<hash>/evidence/). When commitEvidence
 * is enabled, files are also committed to .shep/specs/<NNN>-<feature>/evidence/
 * in the worktree. When the spec directory is outside the worktree
 * (shep-managed mode), commitEvidence is forced to false since git
 * cannot track files outside the worktree. The agent outputs a structured JSON manifest of
 * evidence records that the evidence-output-parser extracts for the
 * graph state.
 */

import { join, dirname, relative } from 'node:path';
import { readSpecFile, buildCommitPushBlock } from '../node-helpers.js';
import type { FeatureAgentState } from '../../state.js';
import type { ValidationError } from '../evidence-output-parser.js';

export interface EvidencePromptOptions {
  /** Whether to commit evidence to the worktree / feature branch */
  commitEvidence: boolean;
}

export function buildEvidencePrompt(
  state: FeatureAgentState,
  options: EvidencePromptOptions = { commitEvidence: false }
): string {
  const specContent = readSpecFile(state.specDir, 'spec.yaml');
  const tasksContent = readSpecFile(state.specDir, 'tasks.yaml');
  const cwd = state.worktreePath || state.repositoryPath;

  // Derive the shep home evidence directory from the worktree path.
  // Worktree path is: ~/.shep/repos/<hash>/wt/<slug>
  // Evidence path is: ~/.shep/repos/<hash>/evidence/<featureId>/
  const repoHashDir = dirname(dirname(cwd)); // go up from wt/<slug>
  const shepEvidenceDir = join(repoHashDir, 'evidence', state.featureId).replaceAll('\\', '/');

  const specSection = specContent
    ? `## Feature Specification (spec.yaml)

\`\`\`yaml
${specContent}
\`\`\`
`
    : `## Feature Context

Feature ID: ${state.featureId}
`;

  const tasksSection = tasksContent
    ? `## Task List (tasks.yaml)

\`\`\`yaml
${tasksContent}
\`\`\`
`
    : '';

  // Relative spec dir path from worktree root (e.g., "specs/057-sidenav-feature-toggle")
  // Normalize to forward slashes so prompts always use POSIX paths (even on Windows)
  const relativeSpecDir = relative(cwd, state.specDir).replaceAll('\\', '/');
  const specEvidenceRelPath = `${relativeSpecDir}/evidence`;
  const specEvidenceAbsPath = join(state.specDir, 'evidence').replaceAll('\\', '/');

  // When specDir is outside the worktree (shep-managed mode), force commitEvidence=false.
  // In shep-managed mode, relative() produces paths starting with '..' which escape
  // the worktree boundary, making git operations invalid.
  const isSpecDirOutsideWorktree = relativeSpecDir.startsWith('..');
  const effectiveCommitEvidence = isSpecDirOutsideWorktree ? false : options.commitEvidence;

  const storageSection = effectiveCommitEvidence
    ? `## Evidence Storage

Save all evidence files to BOTH locations:

1. **Shep home folder** (persistent local storage):
   \`mkdir -p ${shepEvidenceDir}/\`
   Save each file here first.

2. **Spec folder** (for PR commit):
   \`mkdir -p ${specEvidenceAbsPath}/\`
   Copy each file here too.

3. Use descriptive file names (e.g., \`homepage-screenshot.png\`, \`unit-test-results.txt\`)
4. In the output JSON, use relative paths from the repo root (e.g., \`${specEvidenceRelPath}/homepage-screenshot.png\`)`
    : `## Evidence Storage

Save all evidence files to the shep home folder:

1. Create the directory if it does not exist: \`mkdir -p ${shepEvidenceDir}/\`
2. Save each evidence file with a descriptive name (e.g., \`homepage-screenshot.png\`, \`unit-test-results.txt\`)
3. In the output JSON, set relativePath to the absolute path in the shep home folder (e.g., \`${shepEvidenceDir}/homepage-screenshot.png\`)`;

  const commitSection = effectiveCommitEvidence
    ? `\n${buildCommitPushBlock({
        push: state.push,
        files: [`${specEvidenceRelPath}/`],
        commitHint: 'chore(agents): capture evidence for completed tasks',
      })}`
    : `\n## Git Operations

Do NOT commit or push any evidence files. Evidence is stored locally only.
However, if you make code fixes during evidence collection, those fixes MUST be committed (see "Handling Code Fixes" above).`;

  return `You are a senior software engineer performing the EVIDENCE COLLECTION phase of feature development.

Your goal is to capture visual and textual evidence proving that the implemented tasks work as expected.${effectiveCommitEvidence ? ' This evidence will be embedded in the pull request body for reviewer verification.' : ' This evidence will be available for review locally.'}

${specSection}
${tasksSection}
## Working Directory

${cwd}

## Evidence Capture Instructions

Review the completed tasks above and capture evidence for each.

### MANDATORY Screenshot Rule — App-Level Proof Required

**If ANY task touches UI code (components, pages, views, styles, layouts, templates, JSX/TSX, HTML, CSS), you MUST capture at least one Screenshot from the ACTUAL RUNNING APPLICATION (dev server).** This is non-negotiable. Changing a heading, button label, color, layout, or any visible element requires a screenshot proving the change renders correctly in the real app context.

**CRITICAL: Storybook-only evidence is NOT sufficient for UI features.** Storybook screenshots may be included as supplementary evidence, but they do NOT replace app-level screenshots. You MUST capture screenshots from the actual running application (via the dev server) to prove the feature works in its real context with actual data, routing, and integration.

For each UI change you MUST capture:
1. **App screenshot (REQUIRED)**: A screenshot from the running dev server showing the feature in its actual app context. Include "app" or the actual page/route name in the screenshot file name (e.g., \`app-dashboard-new-toggle.png\`, \`app-settings-page.png\`).
2. **Storybook screenshot (OPTIONAL, supplementary)**: If the component has a Storybook story, you may also capture a Storybook screenshot as supplementary evidence. Include "storybook" in the file name (e.g., \`storybook-toggle-component.png\`).

To capture app-level screenshots:
1. Install Playwright if not already available: \`npx playwright install chromium --with-deps 2>/dev/null || npx playwright install chromium\`
2. Start the dev server in the background (e.g., \`npm run dev &\` or \`pnpm dev &\`)
3. Wait for the server to be ready
4. Use a Playwright script to navigate and screenshot:
   \`\`\`bash
   node -e "
   const { chromium } = require('playwright');
   (async () => {
     const browser = await chromium.launch();
     const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
     await page.goto('http://localhost:PORT');
     await page.waitForLoadState('networkidle');
     await page.screenshot({ path: 'SCREENSHOT_PATH' });
     await browser.close();
   })();
   "
   \`\`\`
5. Stop the dev server after capturing

To capture Storybook screenshots (supplementary only):
1. Start Storybook: \`npx storybook dev -p 6006 &\` or \`pnpm dev:storybook &\`
2. Navigate to the relevant story and capture a screenshot
3. Stop Storybook after capturing

If Playwright installation fails, try alternative approaches (e.g., \`npx puppeteer\`, \`curl\` for API responses). Only skip screenshots if ALL browser automation approaches fail — and in that case, explicitly note the failure reason in the evidence description.

### Evidence by Task Type

- **UI/Web tasks**: You MUST take screenshots FROM THE RUNNING APP (see mandatory rule above). Storybook-only screenshots are NOT acceptable as primary evidence. Also run and capture test output.
- **Backend/API tasks**: Run the relevant test suite and capture test output showing passing tests.
- **CLI tasks**: Run the CLI commands and capture terminal output demonstrating correct behavior.
- **Refactoring/Infrastructure tasks**: Capture test output or build output confirming no regressions.

### Evidence Types

- **Screenshot** — Visual proof of UI or output state (PNG/JPEG). **Required for any UI change.**
- **Video** — Screen recording of a workflow or interaction (MP4/WebM)
- **TestOutput** — Test suite execution results (TXT)
- **TerminalRecording** — CLI command output capture (TXT)

### Minimum Evidence Requirements

Your output MUST include:
1. At least one **Screenshot from the running app** (NOT Storybook) if any task modifies UI/visual code (components, styles, templates, markup). The screenshot description MUST clearly indicate it was captured from the actual application (e.g., "App: dashboard page showing new toggle", "App: settings page with updated layout"). Do NOT use descriptions that suggest Storybook-only proof.
2. At least one **TestOutput** if the project has a test suite
3. Do NOT output only TestOutput/TerminalRecording when the feature involves visible UI changes — app-level screenshots are mandatory in that case
4. Do NOT submit only Storybook screenshots for UI features — each UI screenshot MUST have a corresponding app-level screenshot proving the feature works in its real context

${storageSection}

## File Size Constraints

- Capture screenshots at standard resolution (1280x720 or similar) — do NOT use 4K or retina resolution
- Compress images where possible (use PNG for screenshots, JPEG for photos)
- Truncate test output and terminal recordings to the first 500 lines to avoid large files
- Keep individual evidence files under 500KB where possible

## Sensitive Data Redaction

- Redact any API keys, tokens, passwords, or secrets visible in screenshots or terminal output
- Do NOT capture screenshots of authentication screens or settings pages showing sensitive credentials
- Strip environment variables containing sensitive values from test output before saving

## Output Format

After capturing all evidence, output a JSON array of evidence records in a fenced code block. This is CRITICAL — the system parses this block to extract evidence metadata.

\`\`\`json
[
  {
    "type": "Screenshot",
    "capturedAt": "2026-01-01T12:00:00Z",
    "description": "Homepage showing new feature banner",
    "relativePath": "${effectiveCommitEvidence ? `${specEvidenceRelPath}/homepage-banner.png` : `${shepEvidenceDir}/homepage-banner.png`}",
    "taskRef": "task-1"
  },
  {
    "type": "TestOutput",
    "capturedAt": "2026-01-01T12:01:00Z",
    "description": "Unit test results — all 42 tests passing",
    "relativePath": "${effectiveCommitEvidence ? `${specEvidenceRelPath}/unit-test-results.txt` : `${shepEvidenceDir}/unit-test-results.txt`}",
    "taskRef": "task-2"
  }
]
\`\`\`

Each evidence record must have:
- **type**: One of Screenshot, Video, TestOutput, TerminalRecording
- **capturedAt**: ISO 8601 timestamp of when the evidence was captured
- **description**: Human-readable description of what this evidence proves
- **relativePath**: ${effectiveCommitEvidence ? `Path relative to the repo root (must start with \`${specEvidenceRelPath}/\`)` : `Absolute path in the shep home evidence folder (must start with \`${shepEvidenceDir}/\`)`}
- **taskRef**: (optional) Reference to the task ID this evidence proves

If no evidence can be captured (e.g., no UI to screenshot, no tests to run), output an empty JSON array:

\`\`\`json
[]
\`\`\`

## Handling Code Fixes During Evidence Collection

If you discover that tests fail, the build breaks, or something needs a fix while collecting evidence:
1. **Fix the issue first** — make the necessary code changes
2. **Commit the fix immediately** with a descriptive conventional commit message (e.g. \`fix(scope): resolve test failure discovered during evidence collection\`)${state.push ? `\n3. **Push the fix**: \`git push -u origin HEAD\`` : ''}
3. **Then continue** capturing evidence — the evidence should reflect the working state after the fix

This ensures implementation changes and evidence remain in separate commits with a clean history.

## Constraints

- Capture evidence that proves the feature works — prioritize screenshots for UI changes, test output for logic changes
- If you need to fix code to make evidence pass, commit the fix BEFORE capturing/committing evidence
- If a screenshot capture fails, document the failure reason in the evidence description and try alternative approaches before giving up
- Do NOT capture evidence for documentation-only changes or spec files
${commitSection}`;
}

function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';

  const uiErrors = errors.filter((e) => e.type === 'ui');
  const completenessErrors = errors.filter((e) => e.type === 'completeness');
  const fileErrors = errors.filter((e) => e.type === 'fileExistence');

  const sections: string[] = [];

  if (uiErrors.length > 0) {
    sections.push(
      `### Missing App-Level Screenshots\n\n${uiErrors.map((e) => `- ${e.message}`).join('\n')}`
    );
  }

  if (completenessErrors.length > 0) {
    sections.push(
      `### Missing Evidence by Task Type\n\n${completenessErrors
        .map((e) => `- ${e.message}`)
        .join('\n')}`
    );
  }

  if (fileErrors.length > 0) {
    sections.push(`### File Issues\n\n${fileErrors.map((e) => `- ${e.message}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * Build a retry prompt for evidence collection that augments the base evidence
 * prompt with structured validation feedback listing specific failures.
 *
 * Follows the repair.node.ts pattern of passing validation errors into the
 * retry prompt so the agent can focus on fixing specific gaps rather than
 * recollecting all evidence blindly.
 *
 * When errors is empty, returns the base prompt without a feedback section.
 */
export function buildEvidenceRetryPrompt(
  state: FeatureAgentState,
  errors: ValidationError[],
  options: EvidencePromptOptions = { commitEvidence: false }
): string {
  const basePrompt = buildEvidencePrompt(state, options);

  if (errors.length === 0) return basePrompt;

  const feedbackSection = `

## VALIDATION FEEDBACK

The previous evidence collection attempt was insufficient. Address the following missing evidence. Focus ONLY on fixing the listed gaps — do NOT recollect evidence that was already captured successfully.

${formatValidationErrors(errors)}

### Instructions

- Review the issues above and capture the missing evidence
- If you need to fix code to resolve a gap (e.g., a failing test), commit the fix FIRST before recapturing evidence
- Focus on the specific gaps listed — do not re-capture evidence that already exists
- Ensure new evidence files are saved to the correct paths
- Output ALL evidence records (both previously captured and newly captured) in the JSON output block`;

  return basePrompt + feedbackSection;
}
