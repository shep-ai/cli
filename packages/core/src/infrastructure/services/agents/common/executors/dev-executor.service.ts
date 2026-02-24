/** Dev Agent Executor — local development mock for the full SDLC flow.
 * Activated when settings.agent.type = "dev". Phase detection via regex on
 * prompt text; no interface changes. Delay: DEV_EXECUTOR_DELAY_MS (default 2000ms). */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AgentType, AgentFeature } from '../../../../../domain/generated/output.js';
import type {
  IAgentExecutor,
  AgentExecutionOptions,
  AgentExecutionResult,
  AgentExecutionStreamEvent,
} from '../../../../../application/ports/output/agents/agent-executor.interface.js';
import { SPEC_ANALYZE_FIXTURE } from './fixtures/spec-analyze.fixture.js';
import { SPEC_REQUIREMENTS_FIXTURE } from './fixtures/spec-requirements.fixture.js';
import { RESEARCH_FIXTURE } from './fixtures/research.fixture.js';
import { PLAN_FIXTURE } from './fixtures/plan.fixture.js';
import { TASKS_FIXTURE } from './fixtures/tasks.fixture.js';

const DEFAULT_DELAY_MS = 2000;

const METADATA_RESULT = JSON.stringify({
  slug: 'dark-mode-toggle',
  name: 'Dark Mode Toggle',
  description: 'Add a dark-mode toggle to the Shep web UI settings panel',
});

// Satisfies merge-output-parser.ts COMMIT_SHA_RE and PR_URL_RE patterns
const MERGE_COMMIT_RESULT =
  '[feat/042-dark-mode-toggle abc1234f] feat(ui): add dark-mode toggle\n' +
  'https://github.com/shep-ai/shep/pull/42\nPull request #42 created successfully.';

const MERGE_SQUASH_RESULT =
  'Merged PR #42 with squash merge. Branch feat/042-dark-mode-toggle deleted.';

const IMPLEMENT_RESULT = 'Implementation complete. All tests pass.\npnpm test: 47 passed, 0 failed';

const CI_FIX_RESULT = 'Fixed CI failure: corrected import path. All checks now passing.';

/**
 * Extract specDir from a YAML-producing prompt.
 * Refs: analyze.prompt.ts:39, requirements.prompt.ts:92, research.prompt.ts:45,
 * plan.prompt.ts:199.
 */
function extractSpecDir(prompt: string): string | null {
  // Analyze ("Write your analysis to:"), requirements ("Update the file at:"),
  // research ("Write your research to:")
  const fileMatch = prompt.match(/(?:Write your \w+ to|Update the file at):\s+(\/[^\s\n]+)/);
  if (fileMatch) return path.dirname(fileMatch[1]);

  // Plan: "Write to BOTH /path/plan.yaml AND /path/tasks.yaml"
  const planMatch = prompt.match(/Write to BOTH\s+(\/[^\s\n]+)\/plan\.yaml/);
  if (planMatch) return planMatch[1];

  return null;
}

/** Validate extracted specDir: must be absolute, no ".." traversal. */
function validateSpecDir(specDir: string): void {
  if (!specDir.startsWith('/'))
    throw new Error(`DevAgentExecutorService: invalid specDir (not absolute): ${specDir}`);
  if (specDir.includes('..'))
    throw new Error(`DevAgentExecutorService: invalid specDir (contains ".."): ${specDir}`);
}

export class DevAgentExecutorService implements IAgentExecutor {
  readonly agentType: AgentType = 'dev' as AgentType;
  private readonly delayMs: number;

  constructor() {
    this.delayMs = parseInt(process.env.DEV_EXECUTOR_DELAY_MS ?? String(DEFAULT_DELAY_MS), 10);
  }

  async execute(prompt: string, _options?: AgentExecutionOptions): Promise<AgentExecutionResult> {
    if (this.delayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, this.delayMs));
    }
    return { result: this.dispatch(prompt) };
  }

  async *executeStream(
    prompt: string,
    options?: AgentExecutionOptions
  ): AsyncIterable<AgentExecutionStreamEvent> {
    const result = await this.execute(prompt, options);
    yield { type: 'result', content: result.result, timestamp: new Date() };
  }

  supportsFeature(_feature: AgentFeature): boolean {
    return false;
  }

  private dispatch(prompt: string): string {
    // Metadata: mock-executor.service.ts extractUserInput pattern
    if (prompt.includes('User request:\n"')) return METADATA_RESULT;

    // Analyze: analyze.prompt.ts:39
    if (prompt.includes('Write your analysis to:')) {
      const specDir = extractSpecDir(prompt);
      if (specDir) {
        validateSpecDir(specDir);
        fs.mkdirSync(specDir, { recursive: true });
        fs.writeFileSync(path.join(specDir, 'spec.yaml'), SPEC_ANALYZE_FIXTURE, 'utf8');
      }
      return 'Analysis complete. spec.yaml written.';
    }

    // Requirements: requirements.prompt.ts:92
    if (prompt.includes('Update the file at:')) {
      const specDir = extractSpecDir(prompt);
      if (specDir) {
        validateSpecDir(specDir);
        fs.mkdirSync(specDir, { recursive: true });
        fs.writeFileSync(path.join(specDir, 'spec.yaml'), SPEC_REQUIREMENTS_FIXTURE, 'utf8');
      }
      return 'Requirements complete. spec.yaml updated.';
    }

    // Research: research.prompt.ts:45
    if (prompt.includes('Write your research to:')) {
      const specDir = extractSpecDir(prompt);
      if (specDir) {
        validateSpecDir(specDir);
        fs.mkdirSync(specDir, { recursive: true });
        fs.writeFileSync(path.join(specDir, 'research.yaml'), RESEARCH_FIXTURE, 'utf8');
      }
      return 'Research complete. research.yaml written.';
    }

    // Plan: plan.prompt.ts:199
    if (prompt.includes('Write to BOTH')) {
      const specDir = extractSpecDir(prompt);
      if (specDir) {
        validateSpecDir(specDir);
        fs.mkdirSync(specDir, { recursive: true });
        fs.writeFileSync(path.join(specDir, 'plan.yaml'), PLAN_FIXTURE, 'utf8');
        fs.writeFileSync(path.join(specDir, 'tasks.yaml'), TASKS_FIXTURE, 'utf8');
      }
      return 'Planning complete. plan.yaml and tasks.yaml written.';
    }

    // Implement: implement.prompt.ts:91
    if (prompt.includes('performing autonomous implementation')) return IMPLEMENT_RESULT;

    // Merge commit/push/PR: merge-prompts.ts:88
    if (prompt.includes('performing git operations in a feature worktree'))
      return MERGE_COMMIT_RESULT;

    // Merge squash (PR): merge-prompts.ts:131
    if (prompt.includes('merging a pull request via the GitHub CLI')) return MERGE_SQUASH_RESULT;

    // Merge squash (local): merge-prompts.ts:168
    if (prompt.includes('performing a local merge')) return MERGE_SQUASH_RESULT;

    // CI fix: merge.prompt.ts:28
    if (prompt.includes('fixing a CI failure')) return CI_FIX_RESULT;

    return '{}';
  }
}
