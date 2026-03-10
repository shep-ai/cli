/**
 * Evidence Phase Prompt
 *
 * Instructs the agent to capture visual and textual evidence
 * (screenshots, test outputs, terminal recordings) proving that
 * completed tasks work as expected. Evidence files are saved to the
 * shep home folder (~/.shep/repos/<hash>/evidence/). When commitEvidence
 * is enabled, files are also committed to specs/<NNN>-<feature>/evidence/
 * in the worktree. The agent outputs a structured JSON manifest of
 * evidence records that the evidence-output-parser extracts for the
 * graph state.
 */

import { join, dirname, relative } from 'node:path';
import { readSpecFile, buildCommitPushBlock } from '../node-helpers.js';
import type { FeatureAgentState } from '../../state.js';

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
  // Evidence path is: ~/.shep/repos/<hash>/evidence/
  const repoHashDir = dirname(dirname(cwd)); // go up from wt/<slug>
  const shepEvidenceDir = join(repoHashDir, 'evidence');

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
  const relativeSpecDir = relative(cwd, state.specDir);
  const specEvidenceRelPath = `${relativeSpecDir}/evidence`;
  const specEvidenceAbsPath = join(state.specDir, 'evidence');

  const storageSection = options.commitEvidence
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

  const commitSection = options.commitEvidence
    ? `\n${buildCommitPushBlock({
        push: state.push,
        files: [`${specEvidenceRelPath}/`],
        commitHint: 'chore(agents): capture evidence for completed tasks',
      })}`
    : `\n## Git Operations

Do NOT commit or push any files. Evidence is stored locally only.`;

  return `You are a senior software engineer performing the EVIDENCE COLLECTION phase of feature development.

Your goal is to capture visual and textual evidence proving that the implemented tasks work as expected.${options.commitEvidence ? ' This evidence will be embedded in the pull request body for reviewer verification.' : ' This evidence will be available for review locally.'}

${specSection}
${tasksSection}
## Working Directory

${cwd}

## Evidence Capture Instructions

Review the completed tasks above and capture evidence for each.

### MANDATORY Screenshot Rule

**If ANY task touches UI code (components, pages, views, styles, layouts, templates, JSX/TSX, HTML, CSS), you MUST capture at least one Screenshot.** This is non-negotiable. Changing a heading, button label, color, layout, or any visible element requires a screenshot proving the change renders correctly.

To capture screenshots:
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

If Playwright installation fails, try alternative approaches (e.g., \`npx puppeteer\`, \`curl\` for API responses). Only skip screenshots if ALL browser automation approaches fail — and in that case, explicitly note the failure reason in the evidence description.

### Evidence by Task Type

- **UI/Web tasks**: You MUST take screenshots (see mandatory rule above). Also run and capture test output.
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
1. At least one **Screenshot** if any task modifies UI/visual code (components, styles, templates, markup)
2. At least one **TestOutput** if the project has a test suite
3. Do NOT output only TestOutput/TerminalRecording when the feature involves visible UI changes — screenshots are mandatory in that case

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
    "relativePath": "${options.commitEvidence ? `${specEvidenceRelPath}/homepage-banner.png` : `${shepEvidenceDir}/homepage-banner.png`}",
    "taskRef": "task-1"
  },
  {
    "type": "TestOutput",
    "capturedAt": "2026-01-01T12:01:00Z",
    "description": "Unit test results — all 42 tests passing",
    "relativePath": "${options.commitEvidence ? `${specEvidenceRelPath}/unit-test-results.txt` : `${shepEvidenceDir}/unit-test-results.txt`}",
    "taskRef": "task-2"
  }
]
\`\`\`

Each evidence record must have:
- **type**: One of Screenshot, Video, TestOutput, TerminalRecording
- **capturedAt**: ISO 8601 timestamp of when the evidence was captured
- **description**: Human-readable description of what this evidence proves
- **relativePath**: ${options.commitEvidence ? `Path relative to the repo root (must start with \`${specEvidenceRelPath}/\`)` : `Absolute path in the shep home evidence folder (must start with \`${shepEvidenceDir}/\`)`}
- **taskRef**: (optional) Reference to the task ID this evidence proves

If no evidence can be captured (e.g., no UI to screenshot, no tests to run), output an empty JSON array:

\`\`\`json
[]
\`\`\`

## Constraints

- Capture evidence for completed tasks only — do NOT modify any implementation code
- Capture evidence that proves the feature works — prioritize screenshots for UI changes, test output for logic changes
- If a screenshot capture fails, document the failure reason in the evidence description and try alternative approaches before giving up
- Do NOT capture evidence for documentation-only changes or spec files
${commitSection}`;
}
