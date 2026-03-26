/**
 * Evidence Flow Tests
 *
 * Tests that evidence collection runs as a sub-agent within the implement node
 * and that evidence records flow through state to the merge node.
 *
 * Covers:
 * - Evidence sub-agent executes within implement node
 * - Evidence state channel populated from implement node output
 * - Evidence available in merge node state (via merge prompt)
 * - Empty evidence when agent returns no parseable evidence data
 * - Graph without merge deps ends after implement (implement → END)
 * - Evidence does not add a separate graph node
 * - Validation retry loop: failure → retry with feedback → success
 * - Exhausted retries → graceful degradation with warnings
 * - Phase activity tracking (evidence:attempt-N) for each retry
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { createTestContext, type TestContext } from './setup.js';
import {
  expectInterruptAt,
  expectNoInterrupts,
  approveCommand,
  ALL_GATES_ENABLED,
  PRD_PLAN_ALLOWED,
} from './helpers.js';
import { EvidenceType } from '@/domain/generated/output.js';

/* ------------------------------------------------------------------ */
/*  Canned evidence JSON that the stub executor returns                */
/* ------------------------------------------------------------------ */

const CANNED_EVIDENCE_JSON = JSON.stringify([
  {
    type: EvidenceType.Screenshot,
    capturedAt: '2026-03-09T12:00:00Z',
    description: 'Homepage with new feature',
    relativePath: '.shep/evidence/homepage.png',
    taskRef: 'task-1',
  },
  {
    type: EvidenceType.TestOutput,
    capturedAt: '2026-03-09T12:01:00Z',
    description: 'Unit tests passing',
    relativePath: '.shep/evidence/test-output.txt',
  },
]);

/** Agent output that contains a parseable evidence JSON block. */
const EVIDENCE_AGENT_OUTPUT = `I captured the following evidence:

\`\`\`json
${CANNED_EVIDENCE_JSON}
\`\`\`

Evidence collection complete.`;

/** Agent output with no parseable evidence block. */
const NO_EVIDENCE_AGENT_OUTPUT = 'No evidence could be captured for this feature.';

/* ------------------------------------------------------------------ */
/*  Tests: Graph with merge node (evidence flows to merge)            */
/* ------------------------------------------------------------------ */

describe('Graph State Transitions › Evidence Flow (with merge)', () => {
  let ctx: TestContext;
  let output: { restore: () => void };

  beforeAll(() => {
    ctx = createTestContext({ withMerge: true });
    ctx.init();
    output = ctx.suppressOutput();
  });

  beforeEach(() => {
    ctx.reset();
  });

  afterAll(() => {
    output.restore();
    ctx.cleanup();
  });

  it('should execute evidence sub-agent within implement node', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(PRD_PLAN_ALLOWED); // allowMerge=false

    const result = await ctx.graph.invoke(state, config);
    expectInterruptAt(result, 'merge');

    // Nodes: analyze + requirements + research + plan + implement(1 phase + 3 evidence sub-agent attempts) + merge-commit = 9
    expect(ctx.executor.callCount).toBe(9);
  });

  it('should populate evidence state when agent returns evidence JSON', async () => {
    // Configure stub to return evidence JSON when the evidence prompt is detected
    ctx.executor.execute = vi.fn(async (prompt: string) => {
      if (prompt.includes('EVIDENCE COLLECTION')) {
        return { result: EVIDENCE_AGENT_OUTPUT, exitCode: 0 };
      }
      return { result: `stub result`, exitCode: 0 };
    });

    const config = ctx.newConfig();
    const state = ctx.initialState(PRD_PLAN_ALLOWED);

    const result = await ctx.graph.invoke(state, config);
    expectInterruptAt(result, 'merge');

    // Verify evidence was populated in state
    // Evidence is deduplicated by type:relativePath — same 2 records across 3 attempts = 2 unique
    expect(result.evidence).toBeDefined();
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence.length).toBe(2);

    // Verify individual evidence records (deduplicated, latest attempt wins)
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: EvidenceType.Screenshot,
          description: 'Homepage with new feature',
          relativePath: '.shep/evidence/homepage.png',
          taskRef: 'task-1',
        }),
        expect.objectContaining({
          type: EvidenceType.TestOutput,
          description: 'Unit tests passing',
          relativePath: '.shep/evidence/test-output.txt',
        }),
      ])
    );
  });

  it('should return empty evidence when agent returns no evidence data', async () => {
    // Configure stub to return output without evidence JSON
    ctx.executor.execute = vi.fn(async (prompt: string) => {
      if (prompt.includes('EVIDENCE COLLECTION')) {
        return { result: NO_EVIDENCE_AGENT_OUTPUT, exitCode: 0 };
      }
      return { result: `stub result`, exitCode: 0 };
    });

    const config = ctx.newConfig();
    const state = ctx.initialState(PRD_PLAN_ALLOWED);

    const result = await ctx.graph.invoke(state, config);
    expectInterruptAt(result, 'merge');

    // Evidence should be an empty array (graceful degradation)
    expect(result.evidence).toBeDefined();
    expect(result.evidence).toEqual([]);
  });

  it('should include evidence in merge prompt context', async () => {
    // Configure stub to return evidence on evidence call and track merge prompt
    const mergePrompts: string[] = [];

    ctx.executor.execute = vi.fn(async (prompt: string) => {
      if (prompt.includes('EVIDENCE COLLECTION')) {
        return { result: EVIDENCE_AGENT_OUTPUT, exitCode: 0 };
      }
      // Capture prompts that look like merge commit-push-PR calls
      if (prompt.includes('git operations in a feature worktree')) {
        mergePrompts.push(prompt);
      }
      return { result: `stub result`, exitCode: 0 };
    });

    const config = ctx.newConfig();
    const state = ctx.initialState(PRD_PLAN_ALLOWED);

    const result = await ctx.graph.invoke(state, config);
    expectInterruptAt(result, 'merge');

    // Verify the merge prompt includes the evidence section
    expect(mergePrompts.length).toBeGreaterThanOrEqual(1);
    const lastMergePrompt = mergePrompts[mergePrompts.length - 1];
    expect(lastMergePrompt).toContain('Evidence');
    expect(lastMergePrompt).toContain('Homepage with new feature');
    expect(lastMergePrompt).toContain('.shep/evidence/homepage.png');
  });

  it('should run to completion when all gates enabled (with evidence)', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(ALL_GATES_ENABLED);

    const result = await ctx.graph.invoke(state, config);

    expectNoInterrupts(result);
    // All nodes + merge: analyze + requirements + research + plan + implement(1 phase + 3 evidence attempts) + merge-commit = 9 (merge squash is now programmatic via localMergeSquash, no agent call)
    expect(ctx.executor.callCount).toBe(9);
  });

  it('should not interrupt at evidence (no approval gate)', async () => {
    const config = ctx.newConfig();
    // All gates disabled — requirements and plan interrupt, but evidence should NOT
    const ALL_DISABLED = { allowPrd: false, allowPlan: false, allowMerge: false };
    const state = ctx.initialState(ALL_DISABLED);

    // Step 1: interrupt at requirements
    const r1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(r1, 'requirements');

    // Step 2: approve → interrupt at plan
    const r2 = await ctx.graph.invoke(approveCommand(), config);
    expectInterruptAt(r2, 'plan');

    // Step 3: approve → implement runs (with evidence sub-agent, no interrupt), interrupt at merge
    const r3 = await ctx.graph.invoke(approveCommand(), config);
    expectInterruptAt(r3, 'merge');
    // Evidence ran as sub-agent within implement without interrupting
  });
});

/* ------------------------------------------------------------------ */
/*  Tests: Graph without merge node (implement → END)                 */
/* ------------------------------------------------------------------ */

describe('Graph State Transitions › Evidence Flow (without merge)', () => {
  let ctx: TestContext;
  let output: { restore: () => void };

  beforeAll(() => {
    ctx = createTestContext({ withMerge: false });
    ctx.init();
    output = ctx.suppressOutput();
  });

  beforeEach(() => {
    ctx.reset();
  });

  afterAll(() => {
    output.restore();
    ctx.cleanup();
  });

  it('should run evidence sub-agent within implement and end graph when no merge deps', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState();

    const result = await ctx.graph.invoke(state, config);

    expectNoInterrupts(result);
    // Nodes: analyze + requirements + research + plan + implement(1 phase + 3 evidence sub-agent attempts) = 8
    expect(ctx.executor.callCount).toBe(8);
  });

  it('should populate evidence state when graph ends after implement', async () => {
    ctx.executor.execute = vi.fn(async (prompt: string) => {
      if (prompt.includes('EVIDENCE COLLECTION')) {
        return { result: EVIDENCE_AGENT_OUTPUT, exitCode: 0 };
      }
      return { result: `stub result`, exitCode: 0 };
    });

    const config = ctx.newConfig();
    const state = ctx.initialState();

    const result = await ctx.graph.invoke(state, config);

    expectNoInterrupts(result);
    // Evidence is deduplicated by type:relativePath — same 2 records across 3 attempts = 2 unique
    expect(result.evidence).toBeDefined();
    expect(result.evidence.length).toBe(2);
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: EvidenceType.Screenshot }),
        expect.objectContaining({ type: EvidenceType.TestOutput }),
      ])
    );
  });

  it('should handle empty evidence gracefully when graph ends after implement', async () => {
    ctx.executor.execute = vi.fn(async (prompt: string) => {
      if (prompt.includes('EVIDENCE COLLECTION')) {
        return { result: NO_EVIDENCE_AGENT_OUTPUT, exitCode: 0 };
      }
      return { result: `stub result`, exitCode: 0 };
    });

    const config = ctx.newConfig();
    const state = ctx.initialState();

    const result = await ctx.graph.invoke(state, config);

    expectNoInterrupts(result);
    expect(result.evidence).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  Tasks YAML with UI keywords to trigger validation                  */
/* ------------------------------------------------------------------ */

/**
 * Tasks YAML with UI-related keywords in task descriptions.
 * This triggers task type inference → UI type → requires app-level screenshots.
 * Used by validation retry tests to ensure evidence validation has completeness
 * requirements that the evidence must satisfy.
 */
const TASKS_WITH_UI_YAML = `tasks:
  - id: task-1
    phaseId: phase-1
    title: Add settings page UI component
    description: Add a toggle component to the settings page
    state: todo
    dependencies: []
    acceptanceCriteria:
      - Component renders correctly in the app
    tdd: null
    estimatedEffort: small
`;

/* ------------------------------------------------------------------ */
/*  Evidence fixtures for validation retry tests                       */
/* ------------------------------------------------------------------ */

/**
 * Build evidence JSON output referencing files in a temp directory.
 * When `dir` is provided, the relativePath uses absolute paths into that dir.
 */
function buildEvidenceOutput(
  evidence: { type: string; description: string; relativePath: string; taskRef?: string }[]
): string {
  const records = evidence.map((e) => ({
    type: e.type,
    capturedAt: '2026-03-09T12:00:00Z',
    description: e.description,
    relativePath: e.relativePath,
    ...(e.taskRef ? { taskRef: e.taskRef } : {}),
  }));
  return `I captured the following evidence:

\`\`\`json
${JSON.stringify(records)}
\`\`\`

Evidence collection complete.`;
}

/* ------------------------------------------------------------------ */
/*  Tests: Validation retry loop (task-11, task-12, task-13)           */
/* ------------------------------------------------------------------ */

describe('Graph State Transitions › Evidence Validation Retry Loop', () => {
  let ctx: TestContext;
  let output: { restore: () => void };

  beforeAll(() => {
    ctx = createTestContext({ withMerge: false });
    ctx.init();
    output = ctx.suppressOutput();
  });

  beforeEach(() => {
    ctx.reset();
    // Write tasks YAML with UI keywords so validation has completeness requirements
    writeFileSync(join(ctx.specDir, 'tasks.yaml'), TASKS_WITH_UI_YAML);
  });

  afterAll(() => {
    output.restore();
    ctx.cleanup();
  });

  /*
   * Task-11: Validation failure → retry → success
   *
   * First evidence call: returns evidence with non-existent file paths → validation fails
   * Second evidence call: returns evidence with real files on disk → validation passes
   * Graph completes. Final state contains evidence from both attempts (accumulate).
   */
  it('should retry evidence collection when validation fails and succeed on second attempt', async () => {
    // Create a real evidence file in the temp directory for the second attempt
    const evidenceDir = join(ctx.tempDir, '.shep', 'evidence');
    mkdirSync(evidenceDir, { recursive: true });
    const realFilePath = join(evidenceDir, 'app-settings-screenshot.png');
    writeFileSync(realFilePath, 'fake-png-data-for-test');

    let evidenceCallCount = 0;

    ctx.executor.execute = vi.fn(async (prompt: string) => {
      if (prompt.includes('EVIDENCE COLLECTION')) {
        evidenceCallCount++;

        if (evidenceCallCount === 1) {
          // First attempt: evidence with NON-EXISTENT file path → validation fails
          return {
            result: buildEvidenceOutput([
              {
                type: EvidenceType.TestOutput,
                description: 'Unit test results',
                relativePath: join(ctx.tempDir, 'nonexistent', 'test-output.txt'),
              },
            ]),
            exitCode: 0,
          };
        }

        // Second attempt: evidence with REAL file path → validation passes
        // Also include the VALIDATION FEEDBACK marker to verify retry prompt was used
        return {
          result: buildEvidenceOutput([
            {
              type: EvidenceType.Screenshot,
              description: 'App: settings page with toggle component',
              relativePath: realFilePath,
              taskRef: 'task-1',
            },
          ]),
          exitCode: 0,
        };
      }
      return { result: 'stub result', exitCode: 0 };
    });

    const config = ctx.newConfig();
    const state = ctx.initialState();

    const result = await ctx.graph.invoke(state, config);

    expectNoInterrupts(result);

    // Evidence from BOTH attempts should be accumulated (FR-11)
    expect(result.evidence).toBeDefined();
    expect(result.evidence.length).toBeGreaterThanOrEqual(2);

    // First attempt's evidence (test output with bad path)
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: EvidenceType.TestOutput,
          description: 'Unit test results',
        }),
      ])
    );

    // Second attempt's evidence (screenshot with real path)
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: EvidenceType.Screenshot,
          description: 'App: settings page with toggle component',
        }),
      ])
    );

    // evidenceRetries should reflect multiple attempts (> 1)
    expect(result.evidenceRetries).toBeGreaterThan(1);

    // The retry prompt should have included VALIDATION FEEDBACK
    const evidencePrompts = (ctx.executor.execute as ReturnType<typeof vi.fn>).mock.calls
      .map((c: unknown[]) => c[0] as string)
      .filter((p: string) => p.includes('EVIDENCE COLLECTION'));

    // At least the second evidence prompt should contain validation feedback
    expect(evidencePrompts.length).toBeGreaterThanOrEqual(2);
    expect(evidencePrompts[1]).toContain('VALIDATION FEEDBACK');
  });

  /*
   * Task-12: Exhausted retries → graceful degradation
   *
   * Every evidence call returns evidence with non-existent file paths.
   * Validation always fails. Graph still completes (FR-8/FR-13).
   * Final state contains partial evidence and warning messages.
   */
  it('should gracefully degrade after exhausting all retry attempts', async () => {
    // Every evidence call returns evidence with NONEXISTENT paths
    ctx.executor.execute = vi.fn(async (prompt: string) => {
      if (prompt.includes('EVIDENCE COLLECTION')) {
        return {
          result: buildEvidenceOutput([
            {
              type: EvidenceType.TestOutput,
              description: 'Unit test results',
              relativePath: join(ctx.tempDir, 'does-not-exist', 'test-output.txt'),
            },
          ]),
          exitCode: 0,
        };
      }
      return { result: 'stub result', exitCode: 0 };
    });

    const config = ctx.newConfig();
    const state = ctx.initialState();

    // Graph MUST complete without throwing (FR-8, FR-13 — graceful degradation)
    const result = await ctx.graph.invoke(state, config);

    expectNoInterrupts(result);

    // Partial evidence should still be present (accumulated from all attempts)
    expect(result.evidence).toBeDefined();
    expect(result.evidence.length).toBeGreaterThan(0);

    // Warning messages about validation failure should be in state.messages
    expect(result.messages).toBeDefined();
    const validationWarnings = result.messages.filter(
      (m: string) => m.includes('Validation failed') || m.includes('Warning')
    );
    expect(validationWarnings.length).toBeGreaterThan(0);

    // Evidence retries should equal max attempts (default 3)
    expect(result.evidenceRetries).toBe(3);

    // Total evidence calls = max retries (3) — all attempted
    const evidenceCalls = (ctx.executor.execute as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => (c[0] as string).includes('EVIDENCE COLLECTION')
    );
    expect(evidenceCalls.length).toBe(3);
  });

  /*
   * Task-13: Phase activities recorded for each attempt
   *
   * Verify that each evidence retry attempt records separate phase activities.
   * Since integration tests run the real graph, we verify through:
   * - evidenceRetries count matching expected attempts
   * - Completion message reflecting attempt count
   * - The retry prompt being used (indicating attempt tracking works)
   */
  it('should record separate phase activities for each evidence attempt', async () => {
    // Create real evidence files for BOTH attempts.
    // Because allEvidence accumulates across retries, validateFileExistence
    // checks ALL accumulated records. If attempt 1's file doesn't exist,
    // validation will fail even after attempt 2 adds valid files.
    const evidenceDir = join(ctx.tempDir, '.shep', 'evidence');
    mkdirSync(evidenceDir, { recursive: true });
    const realFilePath1 = join(evidenceDir, 'test-output.txt');
    writeFileSync(realFilePath1, 'fake-test-output');
    const realFilePath2 = join(evidenceDir, 'app-screenshot.png');
    writeFileSync(realFilePath2, 'fake-png-data');

    let evidenceCallCount = 0;

    ctx.executor.execute = vi.fn(async (prompt: string) => {
      if (prompt.includes('EVIDENCE COLLECTION')) {
        evidenceCallCount++;

        if (evidenceCallCount === 1) {
          // First attempt: real file exists but no app-level screenshot → completeness validation fails
          return {
            result: buildEvidenceOutput([
              {
                type: EvidenceType.TestOutput,
                description: 'Test results',
                relativePath: realFilePath1,
              },
            ]),
            exitCode: 0,
          };
        }

        // Second attempt: app-level screenshot with taskRef → validation passes
        return {
          result: buildEvidenceOutput([
            {
              type: EvidenceType.Screenshot,
              description: 'App: settings page',
              relativePath: realFilePath2,
              taskRef: 'task-1',
            },
          ]),
          exitCode: 0,
        };
      }
      return { result: 'stub result', exitCode: 0 };
    });

    const config = ctx.newConfig();
    const state = ctx.initialState();

    const result = await ctx.graph.invoke(state, config);

    expectNoInterrupts(result);

    // evidenceRetries should reflect 2 attempts (attempt-1 failed completeness, attempt-2 succeeded)
    expect(result.evidenceRetries).toBe(2);

    // Completion message should mention the attempt count
    const completionMsg = result.messages.find((m: string) => m.includes('[evidence] Complete'));
    expect(completionMsg).toBeDefined();
    expect(completionMsg).toContain('2 attempt(s)');
  });

  it('should track 3 attempts in evidenceRetries when all retries exhaust', async () => {
    // All attempts fail validation (non-existent files)
    ctx.executor.execute = vi.fn(async (prompt: string) => {
      if (prompt.includes('EVIDENCE COLLECTION')) {
        return {
          result: buildEvidenceOutput([
            {
              type: EvidenceType.Screenshot,
              description: 'Storybook: toggle component',
              relativePath: join(ctx.tempDir, 'missing', 'storybook.png'),
            },
          ]),
          exitCode: 0,
        };
      }
      return { result: 'stub result', exitCode: 0 };
    });

    const config = ctx.newConfig();
    const state = ctx.initialState();

    const result = await ctx.graph.invoke(state, config);

    expectNoInterrupts(result);

    // All 3 attempts executed and recorded
    expect(result.evidenceRetries).toBe(3);

    // Completion message reflects all 3 attempts
    const completionMsg = result.messages.find((m: string) => m.includes('[evidence] Complete'));
    expect(completionMsg).toBeDefined();
    expect(completionMsg).toContain('3 attempt(s)');

    // Evidence deduplicated by type:relativePath — same record across 3 attempts = 1 unique
    expect(result.evidence.length).toBe(1);
  });
});
