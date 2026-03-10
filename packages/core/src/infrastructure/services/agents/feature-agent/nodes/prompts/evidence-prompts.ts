/**
 * Evidence Phase Prompt
 *
 * Instructs the agent to capture visual and textual evidence
 * (screenshots, test outputs, terminal recordings) proving that
 * completed tasks work as expected. Evidence files are saved to the
 * shep home folder (~/.shep/repos/<hash>/evidence/). When commitEvidence
 * is enabled, files are also committed to .shep/evidence/ in the worktree.
 * The agent outputs a structured JSON manifest of evidence records
 * that the evidence-output-parser extracts for the graph state.
 */

import { join, dirname } from 'node:path';
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

  const storageSection = options.commitEvidence
    ? `## Evidence Storage

Save all evidence files to BOTH locations:

1. **Shep home folder** (persistent local storage):
   \`mkdir -p ${shepEvidenceDir}/\`
   Save each file here first.

2. **Worktree** (for PR commit):
   \`mkdir -p ${cwd}/.shep/evidence/\`
   Copy each file here too.

3. Use descriptive file names (e.g., \`homepage-screenshot.png\`, \`unit-test-results.txt\`)
4. In the output JSON, use relative paths from the repo root (e.g., \`.shep/evidence/homepage-screenshot.png\`)`
    : `## Evidence Storage

Save all evidence files to the shep home folder:

1. Create the directory if it does not exist: \`mkdir -p ${shepEvidenceDir}/\`
2. Save each evidence file with a descriptive name (e.g., \`homepage-screenshot.png\`, \`unit-test-results.txt\`)
3. In the output JSON, set relativePath to the absolute path in the shep home folder (e.g., \`${shepEvidenceDir}/homepage-screenshot.png\`)`;

  const commitSection = options.commitEvidence
    ? `\n${buildCommitPushBlock({
        push: state.push,
        files: ['.shep/evidence/'],
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
    "relativePath": "${options.commitEvidence ? '.shep/evidence/homepage-banner.png' : `${shepEvidenceDir}/homepage-banner.png`}",
    "taskRef": "task-1"
  },
  {
    "type": "TestOutput",
    "capturedAt": "2026-01-01T12:01:00Z",
    "description": "Unit test results — all 42 tests passing",
    "relativePath": "${options.commitEvidence ? '.shep/evidence/unit-test-results.txt' : `${shepEvidenceDir}/unit-test-results.txt`}",
    "taskRef": "task-2"
  }
]
\`\`\`

Each evidence record must have:
- **type**: One of Screenshot, Video, TestOutput, TerminalRecording
- **capturedAt**: ISO 8601 timestamp of when the evidence was captured
- **description**: Human-readable description of what this evidence proves
- **relativePath**: ${options.commitEvidence ? 'Path relative to the repo root (must start with `.shep/evidence/`)' : `Absolute path in the shep home evidence folder (must start with \`${shepEvidenceDir}/\`)`}
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
${commitSection}`;
}
