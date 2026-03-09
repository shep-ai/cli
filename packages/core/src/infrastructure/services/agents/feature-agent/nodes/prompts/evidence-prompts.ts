/**
 * Evidence Phase Prompt
 *
 * Instructs the agent to capture visual and textual evidence
 * (screenshots, test outputs, terminal recordings) proving that
 * completed tasks work as expected. Evidence files are saved to
 * .shep/evidence/ within the worktree and committed to the feature branch.
 * The agent outputs a structured JSON manifest of evidence records
 * that the evidence-output-parser extracts for the graph state.
 */

import { readSpecFile, buildCommitPushBlock } from '../node-helpers.js';
import type { FeatureAgentState } from '../../state.js';

export function buildEvidencePrompt(state: FeatureAgentState): string {
  const specContent = readSpecFile(state.specDir, 'spec.yaml');
  const tasksContent = readSpecFile(state.specDir, 'tasks.yaml');
  const cwd = state.worktreePath || state.repositoryPath;

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

  return `You are a senior software engineer performing the EVIDENCE COLLECTION phase of feature development.

Your goal is to capture visual and textual evidence proving that the implemented tasks work as expected. This evidence will be embedded in the pull request body for reviewer verification.

${specSection}
${tasksSection}
## Working Directory

${cwd}

## Evidence Capture Instructions

Review the completed tasks above and capture appropriate evidence for each:

- **UI/Web tasks**: Take screenshots using Playwright or a browser automation tool. Capture the relevant pages or components that demonstrate the feature working correctly.
- **Backend/API tasks**: Run the relevant test suite and capture test output showing passing tests.
- **CLI tasks**: Run the CLI commands and capture terminal output demonstrating correct behavior.
- **Refactoring/Infrastructure tasks**: Capture test output or build output confirming no regressions.

For each task, choose the most appropriate evidence type:
- **Screenshot** — Visual proof of UI or output state (PNG/JPEG)
- **Video** — Screen recording of a workflow or interaction (MP4/WebM)
- **TestOutput** — Test suite execution results (TXT)
- **TerminalRecording** — CLI command output capture (TXT)

## Evidence Storage

Save all evidence files to the \`.shep/evidence/\` directory within the worktree:

1. Create the directory if it does not exist: \`mkdir -p ${cwd}/.shep/evidence/\`
2. Save each evidence file with a descriptive name (e.g., \`homepage-screenshot.png\`, \`unit-test-results.txt\`)
3. Use relative paths from the repo root (e.g., \`.shep/evidence/homepage-screenshot.png\`)

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
    "relativePath": ".shep/evidence/homepage-banner.png",
    "taskRef": "task-1"
  },
  {
    "type": "TestOutput",
    "capturedAt": "2026-01-01T12:01:00Z",
    "description": "Unit test results — all 42 tests passing",
    "relativePath": ".shep/evidence/unit-test-results.txt",
    "taskRef": "task-2"
  }
]
\`\`\`

Each evidence record must have:
- **type**: One of Screenshot, Video, TestOutput, TerminalRecording
- **capturedAt**: ISO 8601 timestamp of when the evidence was captured
- **description**: Human-readable description of what this evidence proves
- **relativePath**: Path relative to the repo root (must start with \`.shep/evidence/\`)
- **taskRef**: (optional) Reference to the task ID this evidence proves

If no evidence can be captured (e.g., no UI to screenshot, no tests to run), output an empty JSON array:

\`\`\`json
[]
\`\`\`

## Constraints

- Capture evidence for completed tasks only — do NOT modify any implementation code
- Be selective — capture key evidence that proves the feature works, not exhaustive screenshots of every page
- If a capture fails (e.g., Playwright not available, test suite broken), skip it and continue with other evidence
- Do NOT capture evidence for documentation-only changes or spec files

${buildCommitPushBlock({
  push: state.push,
  files: ['.shep/evidence/'],
  commitHint: 'chore(agents): capture evidence for completed tasks',
})}`;
}
