/**
 * Evidence Flow Tests
 *
 * Tests that the evidence node is correctly wired in the graph and
 * evidence records flow through state from evidence → merge.
 *
 * Covers:
 * - Evidence node executes between implement and merge
 * - Evidence state channel populated from evidence node output
 * - Evidence available in merge node state (via merge prompt)
 * - Empty evidence when agent returns no parseable evidence data
 * - Graph without merge deps ends after evidence (evidence → END)
 * - Evidence does not interrupt (auto-runs, no approval gate)
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { createTestContext, type TestContext } from './setup.js';
import {
  expectInterruptAt,
  expectNoInterrupts,
  approveCommand,
  readCompletedPhases,
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

  it('should execute evidence node between implement and merge', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(PRD_PLAN_ALLOWED); // allowMerge=false

    const result = await ctx.graph.invoke(state, config);
    expectInterruptAt(result, 'merge');

    // Nodes: analyze + requirements + research + plan + implement + evidence + merge-commit = 7
    expect(ctx.executor.callCount).toBe(7);
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
    expect(result.evidence).toBeDefined();
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence.length).toBe(2);

    // Verify individual evidence records
    expect(result.evidence[0]).toMatchObject({
      type: EvidenceType.Screenshot,
      description: 'Homepage with new feature',
      relativePath: '.shep/evidence/homepage.png',
      taskRef: 'task-1',
    });
    expect(result.evidence[1]).toMatchObject({
      type: EvidenceType.TestOutput,
      description: 'Unit tests passing',
      relativePath: '.shep/evidence/test-output.txt',
    });
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
    // All nodes + merge: analyze + requirements + research + plan + implement + evidence + merge-commit + merge-squash = 8
    expect(ctx.executor.callCount).toBe(8);
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

    // Step 3: approve → implement runs, evidence runs (no interrupt), interrupt at merge
    const r3 = await ctx.graph.invoke(approveCommand(), config);
    expectInterruptAt(r3, 'merge');
    // Evidence ran without interrupting — gate walkthrough skipped evidence
  });

  it('should record evidence phase in completedPhases', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(PRD_PLAN_ALLOWED);

    await ctx.graph.invoke(state, config);

    const completed = readCompletedPhases(ctx.specDir);
    expect(completed).toContain('evidence');
  });
});

/* ------------------------------------------------------------------ */
/*  Tests: Graph without merge node (evidence → END)                  */
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

  it('should run evidence node and end graph when no merge deps', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState();

    const result = await ctx.graph.invoke(state, config);

    expectNoInterrupts(result);
    // Nodes: analyze + requirements + research + plan + implement + evidence = 6
    expect(ctx.executor.callCount).toBe(6);
  });

  it('should populate evidence state when graph ends after evidence', async () => {
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
    expect(result.evidence).toBeDefined();
    expect(result.evidence.length).toBe(2);
    expect(result.evidence[0].type).toBe(EvidenceType.Screenshot);
    expect(result.evidence[1].type).toBe(EvidenceType.TestOutput);
  });

  it('should handle empty evidence gracefully when graph ends after evidence', async () => {
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
