/**
 * Retry from Error State Transition Tests
 *
 * Tests that when the graph crashes/fails at any node, re-invoking with the
 * same thread_id (retry) resumes execution from the FAILED node — not from
 * the beginning.
 *
 * This validates the core `shep feat retry` behavior: the LangGraph
 * checkpointer saves state after each successful node, so on retry the
 * graph picks up where it left off.
 *
 * Covers:
 * - Crash at each producer node → retry resumes from that node
 * - Crash after approval gate → retry resumes correctly
 * - Rejection + crash → retry handles correctly
 * - Complex multi-gate walkthrough with crash mid-way
 * - Messages from completed nodes are preserved after retry
 */

import { describe, it, expect, beforeAll, afterAll, vi, type Mock } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  createFeatureAgentGraph,
  type FeatureAgentGraphDeps,
} from '@/infrastructure/services/agents/feature-agent/feature-agent-graph.js';
import { createCheckpointer } from '@/infrastructure/services/agents/common/checkpointer.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import { createStubMergeNodeDeps } from './setup.js';
import {
  expectInterruptAt,
  expectNoInterrupts,
  approveCommand,
  rejectCommand,
  ALL_GATES_ENABLED,
  ALL_GATES_DISABLED,
} from './helpers.js';
import {
  VALID_SPEC_YAML,
  VALID_RESEARCH_YAML,
  VALID_PLAN_YAML,
  VALID_TASKS_YAML,
} from './fixtures.js';

/* ------------------------------------------------------------------ */
/*  Configurable executor for retry tests                              */
/* ------------------------------------------------------------------ */

interface RetryExecutorConfig {
  /** 1-indexed call numbers that should throw (non-retryable ENOENT error). */
  failOnCalls: Set<number>;
}

interface RetryExecutor extends IAgentExecutor {
  callCount: number;
  prompts: string[];
  execute: Mock;
}

/**
 * Create a test executor that throws ENOENT errors on specific calls.
 *
 * ENOENT is used because it is:
 * - Non-fixable in withAutoFix (bypasses auto-fix for wrapped nodes)
 * - Non-retryable in retryExecute (throws immediately for implement/merge)
 */
function createRetryExecutor(config: RetryExecutorConfig): RetryExecutor {
  let callCount = 0;
  const prompts: string[] = [];

  const execute = vi.fn(async (prompt: string) => {
    callCount++;
    prompts.push(prompt);

    if (config.failOnCalls.has(callCount)) {
      throw new Error(`ENOENT: simulated crash on call #${callCount}`);
    }

    return { result: `stub result #${callCount}`, exitCode: 0 };
  });

  return {
    agentType: 'claude-code' as never,
    execute,
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
    get callCount() {
      return callCount;
    },
    prompts,
  };
}

/* ------------------------------------------------------------------ */
/*  Test context: keeps same graph+checkpointer across crash+retry     */
/* ------------------------------------------------------------------ */

interface RetryTestContext {
  tempDir: string;
  specDir: string;
  /**
   * Build a fresh graph with a new executor but SHARED checkpointer.
   * The checkpointer persists in-memory across calls, so retry works.
   */
  buildGraph: (
    executor: RetryExecutor,
    options?: { withMerge?: boolean }
  ) => ReturnType<typeof createFeatureAgentGraph>;
  newConfig: () => { configurable: { thread_id: string } };
  initialState: (gates?: Record<string, boolean>) => Record<string, unknown>;
}

function createRetryTestContext(): RetryTestContext {
  let tempDir = '';
  let specDir = '';
  // Shared checkpointer — survives across crash+retry invocations
  const checkpointer = createCheckpointer(':memory:');

  return {
    get tempDir() {
      return tempDir;
    },
    get specDir() {
      return specDir;
    },

    buildGraph: (executor: RetryExecutor, options?: { withMerge?: boolean }) => {
      // Init temp dir if not already
      if (!tempDir) {
        tempDir = mkdtempSync(join(tmpdir(), 'shep-retry-'));
        specDir = join(tempDir, 'specs', '001-test');
        mkdirSync(specDir, { recursive: true });
      }

      // Write fresh YAML fixtures
      writeFileSync(join(specDir, 'spec.yaml'), VALID_SPEC_YAML);
      writeFileSync(join(specDir, 'research.yaml'), VALID_RESEARCH_YAML);
      writeFileSync(join(specDir, 'plan.yaml'), VALID_PLAN_YAML);
      writeFileSync(join(specDir, 'tasks.yaml'), VALID_TASKS_YAML);
      writeFileSync(join(specDir, 'feature.yaml'), 'status:\n  completedPhases: []\n');

      const deps: FeatureAgentGraphDeps = { executor };
      if (options?.withMerge) {
        deps.mergeNodeDeps = createStubMergeNodeDeps();
      }
      return createFeatureAgentGraph(deps, checkpointer);
    },

    newConfig: () => ({
      configurable: { thread_id: `retry-${randomUUID()}` },
    }),

    initialState: (gates?: Record<string, boolean>) => ({
      featureId: `feat-${randomUUID().slice(0, 8)}`,
      repositoryPath: tempDir,
      worktreePath: tempDir,
      specDir,
      approvalGates: gates ?? { allowPrd: true, allowPlan: true, allowMerge: true },
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('Graph State Transitions › Retry from Error', () => {
  let ctx: RetryTestContext;
  let output: { restore: () => void };

  beforeAll(() => {
    ctx = createRetryTestContext();
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    output = {
      restore: () => {
        stdoutSpy.mockRestore();
        stderrSpy.mockRestore();
      },
    };
  });

  afterAll(() => {
    output.restore();
    if (ctx.tempDir) rmSync(ctx.tempDir, { recursive: true, force: true });
  });

  // ================================================================
  // Normal flow call order (all gates enabled, no merge):
  //   Call 1: analyze
  //   Call 2: requirements
  //   Call 3: research
  //   Call 4: plan
  //   Call 5: implement
  //
  // With merge (allowMerge=true):
  //   Call 6: merge-commit
  //   Call 7: merge-squash
  // ================================================================

  /* ---------------------------------------------------------------- */
  /*  Group 1: Crash at each producer node (autonomous, all gates on)  */
  /* ---------------------------------------------------------------- */

  describe('crash at each producer node (autonomous mode)', () => {
    it('should retry from analyze after crash (first node)', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([1]) });
      const graph = ctx.buildGraph(executor);
      const config = ctx.newConfig();
      const state = ctx.initialState(ALL_GATES_ENABLED);

      // First invoke: crashes at analyze (call 1)
      await expect(graph.invoke(state, config)).rejects.toThrow('ENOENT');
      expect(executor.callCount).toBe(1);

      // Retry: resume from analyze
      // Call 2: analyze(retry), 3: req, 4: research, 5: plan, 6: implement
      const result = await graph.invoke(state, config);
      expectNoInterrupts(result);
      expect(executor.callCount).toBe(6); // 1 crash + 5 retry = 6
    });

    it('should retry from requirements after crash', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([2]) });
      const graph = ctx.buildGraph(executor);
      const config = ctx.newConfig();
      const state = ctx.initialState(ALL_GATES_ENABLED);

      // analyze(1) ok, requirements(2) crashes
      await expect(graph.invoke(state, config)).rejects.toThrow('ENOENT');
      expect(executor.callCount).toBe(2);

      // Retry: resume from requirements
      // Call 3: req(retry), 4: research, 5: plan, 6: implement
      const result = await graph.invoke(state, config);
      expectNoInterrupts(result);
      expect(executor.callCount).toBe(6);
    });

    it('should retry from research after crash', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([3]) });
      const graph = ctx.buildGraph(executor);
      const config = ctx.newConfig();
      const state = ctx.initialState(ALL_GATES_ENABLED);

      // analyze(1), req(2) ok, research(3) crashes
      await expect(graph.invoke(state, config)).rejects.toThrow('ENOENT');
      expect(executor.callCount).toBe(3);

      // Retry: resume from research
      // Call 4: research(retry), 5: plan, 6: implement
      const result = await graph.invoke(state, config);
      expectNoInterrupts(result);
      expect(executor.callCount).toBe(6);
    });

    it('should retry from plan after crash', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([4]) });
      const graph = ctx.buildGraph(executor);
      const config = ctx.newConfig();
      const state = ctx.initialState(ALL_GATES_ENABLED);

      // analyze(1), req(2), research(3) ok, plan(4) crashes
      await expect(graph.invoke(state, config)).rejects.toThrow('ENOENT');
      expect(executor.callCount).toBe(4);

      // Retry: resume from plan
      // Call 5: plan(retry), 6: implement
      const result = await graph.invoke(state, config);
      expectNoInterrupts(result);
      expect(executor.callCount).toBe(6);
    });

    it('should retry from implement after crash', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([5]) });
      const graph = ctx.buildGraph(executor);
      const config = ctx.newConfig();
      const state = ctx.initialState(ALL_GATES_ENABLED);

      // analyze(1)..plan(4) ok, implement(5) crashes
      await expect(graph.invoke(state, config)).rejects.toThrow('ENOENT');
      expect(executor.callCount).toBe(5);

      // Retry: resume from implement only
      // Call 6: implement(retry)
      const result = await graph.invoke(state, config);
      expectNoInterrupts(result);
      expect(executor.callCount).toBe(6);
    });

    it('should retry from merge after crash', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([6]) });
      const graph = ctx.buildGraph(executor, { withMerge: true });
      const config = ctx.newConfig();
      const state = ctx.initialState(ALL_GATES_ENABLED);

      // analyze(1)..implement(5) ok, merge-commit(6) crashes
      await expect(graph.invoke(state, config)).rejects.toThrow('ENOENT');
      expect(executor.callCount).toBe(6);

      // Retry: resume from merge
      // Call 7: merge-commit(retry), 8: merge-squash
      const result = await graph.invoke(state, config);
      expectNoInterrupts(result);
      expect(executor.callCount).toBe(8);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Group 2: Crash after approval gate                               */
  /* ---------------------------------------------------------------- */

  describe('crash after approval gate', () => {
    it('should retry after requirements approval → crash at research', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([3]) });
      const graph = ctx.buildGraph(executor);
      const config = ctx.newConfig();
      const state = ctx.initialState({ allowPrd: false, allowPlan: true, allowMerge: true });

      // analyze(1), req(2) → interrupt
      const r1 = await graph.invoke(state, config);
      expectInterruptAt(r1, 'requirements');
      expect(executor.callCount).toBe(2);

      // Approve → research crashes (call 3)
      await expect(graph.invoke(approveCommand(), config)).rejects.toThrow('ENOENT');
      expect(executor.callCount).toBe(3);

      // Retry: resume from research, not from start
      // Call 4: research(retry), 5: plan, 6: implement
      const result = await graph.invoke(state, config);
      expectNoInterrupts(result);
      expect(executor.callCount).toBe(6);
    });

    it('should retry after plan approval → crash at implement', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([5]) });
      const graph = ctx.buildGraph(executor);
      const config = ctx.newConfig();
      const state = ctx.initialState({ allowPrd: true, allowPlan: false, allowMerge: true });

      // analyze(1), req(2), research(3), plan(4) → interrupt
      const r1 = await graph.invoke(state, config);
      expectInterruptAt(r1, 'plan');
      expect(executor.callCount).toBe(4);

      // Approve → implement crashes (call 5)
      await expect(graph.invoke(approveCommand(), config)).rejects.toThrow('ENOENT');
      expect(executor.callCount).toBe(5);

      // Retry: resume from implement
      // Call 6: implement(retry)
      const result = await graph.invoke(state, config);
      expectNoInterrupts(result);
      expect(executor.callCount).toBe(6);
    });

    it('should retry after merge-squash crash (autonomous merge)', async () => {
      // With allowMerge=true, merge does both commit-push-PR and merge-squash.
      // Crash during merge-squash (call 7) and verify retry resumes from merge.
      const executor = createRetryExecutor({ failOnCalls: new Set([7]) });
      const graph = ctx.buildGraph(executor, { withMerge: true });
      const config = ctx.newConfig();
      const state = ctx.initialState(ALL_GATES_ENABLED);

      // analyze(1)..implement(5), merge-commit(6), merge-squash(7) crashes
      await expect(graph.invoke(state, config)).rejects.toThrow('ENOENT');
      expect(executor.callCount).toBe(7);

      // Retry: resume from merge
      // Call 8: merge-commit(retry), 9: merge-squash(retry)
      const result = await graph.invoke(state, config);
      expectNoInterrupts(result);
      expect(executor.callCount).toBe(9);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Group 3: Rejection + crash → retry                               */
  /* ---------------------------------------------------------------- */

  describe('rejection + crash → retry', () => {
    it('should retry after requirements rejection → crash during re-exec', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([3]) });
      const graph = ctx.buildGraph(executor);
      const config = ctx.newConfig();
      const state = ctx.initialState({ allowPrd: false, allowPlan: true, allowMerge: true });

      // analyze(1), req(2) → interrupt
      const r1 = await graph.invoke(state, config);
      expectInterruptAt(r1, 'requirements');
      expect(executor.callCount).toBe(2);

      // Reject → requirements re-executes, crashes (call 3)
      await expect(graph.invoke(rejectCommand('needs more detail'), config)).rejects.toThrow(
        'ENOENT'
      );
      expect(executor.callCount).toBe(3);

      // Retry: resumes at requirements re-execution.
      // Requirements succeeds (call 4) → interrupt again (gate still active)
      const r3 = await graph.invoke(state, config);
      expectInterruptAt(r3, 'requirements');
      expect(executor.callCount).toBe(4);

      // Approve → research(5), plan(6), implement(7)
      const result = await graph.invoke(approveCommand(), config);
      expectNoInterrupts(result);
      expect(executor.callCount).toBe(7);
    });

    it('should retry after plan rejection → crash during re-exec', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([5]) });
      const graph = ctx.buildGraph(executor);
      const config = ctx.newConfig();
      const state = ctx.initialState({ allowPrd: true, allowPlan: false, allowMerge: true });

      // analyze(1), req(2), research(3), plan(4) → interrupt
      const r1 = await graph.invoke(state, config);
      expectInterruptAt(r1, 'plan');
      expect(executor.callCount).toBe(4);

      // Reject → plan re-executes, crashes (call 5)
      await expect(
        graph.invoke(rejectCommand('split into smaller phases'), config)
      ).rejects.toThrow('ENOENT');
      expect(executor.callCount).toBe(5);

      // Retry: resumes at plan re-execution.
      // Plan succeeds (call 6) → interrupt again (gate still active)
      const r3 = await graph.invoke(state, config);
      expectInterruptAt(r3, 'plan');
      expect(executor.callCount).toBe(6);

      // Approve → implement(7)
      const result = await graph.invoke(approveCommand(), config);
      expectNoInterrupts(result);
      expect(executor.callCount).toBe(7);
    });

    it('should retry after merge rejection → crash during re-exec', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([7]) });
      const graph = ctx.buildGraph(executor, { withMerge: true });
      const config = ctx.newConfig();
      const state = ctx.initialState({ allowPrd: true, allowPlan: true, allowMerge: false });

      // analyze(1)..implement(5), merge-commit(6) → interrupt
      const r1 = await graph.invoke(state, config);
      expectInterruptAt(r1, 'merge');
      expect(executor.callCount).toBe(6);

      // Reject → merge re-executes commit-push-PR, crashes (call 7)
      await expect(graph.invoke(rejectCommand('rebase onto main first'), config)).rejects.toThrow(
        'ENOENT'
      );
      expect(executor.callCount).toBe(7);

      // Retry: resumes at merge re-execution.
      // merge-commit succeeds (call 8) → interrupt again (gate still active)
      const r3 = await graph.invoke(state, config);
      expectInterruptAt(r3, 'merge');
      expect(executor.callCount).toBe(8);

      // Approve → merge completes (no squash since allowMerge=false)
      const result = await graph.invoke(approveCommand(), config);
      expectNoInterrupts(result);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Group 4: Complex multi-gate + rejection iterations + crash       */
  /* ---------------------------------------------------------------- */

  describe('complex approval iteration + crash', () => {
    it('should retry after reject×2 → approve → crash at next node', async () => {
      // Requirements gate: reject twice, approve, then crash at research
      const executor = createRetryExecutor({ failOnCalls: new Set([5]) });
      const graph = ctx.buildGraph(executor);
      const config = ctx.newConfig();
      const state = ctx.initialState({ allowPrd: false, allowPlan: true, allowMerge: true });

      // analyze(1), req(2) → interrupt
      const r1 = await graph.invoke(state, config);
      expectInterruptAt(r1, 'requirements');
      expect(executor.callCount).toBe(2);

      // 1st rejection → req re-exec(3) → interrupt
      const r2 = await graph.invoke(rejectCommand('add acceptance criteria'), config);
      expectInterruptAt(r2, 'requirements');
      expect(executor.callCount).toBe(3);

      // 2nd rejection → req re-exec(4) → interrupt
      const r3 = await graph.invoke(rejectCommand('include error handling'), config);
      expectInterruptAt(r3, 'requirements');
      expect(executor.callCount).toBe(4);

      // Approve → research crashes (call 5)
      await expect(graph.invoke(approveCommand(), config)).rejects.toThrow('ENOENT');
      expect(executor.callCount).toBe(5);

      // Retry: resume from research
      // Call 6: research(retry), 7: plan, 8: implement
      const result = await graph.invoke(state, config);
      expectNoInterrupts(result);
      expect(executor.callCount).toBe(8);
    });

    it('should retry mid-walkthrough: req approved → plan rejected → crash', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([5]) });
      const graph = ctx.buildGraph(executor);
      const config = ctx.newConfig();
      const state = ctx.initialState(ALL_GATES_DISABLED);

      // analyze(1), req(2) → interrupt at requirements
      const r1 = await graph.invoke(state, config);
      expectInterruptAt(r1, 'requirements');
      expect(executor.callCount).toBe(2);

      // Approve requirements → research(3), plan(4) → interrupt at plan
      const r2 = await graph.invoke(approveCommand(), config);
      expectInterruptAt(r2, 'plan');
      expect(executor.callCount).toBe(4);

      // Reject plan → plan re-exec crashes (call 5)
      await expect(graph.invoke(rejectCommand('needs more phases'), config)).rejects.toThrow(
        'ENOENT'
      );
      expect(executor.callCount).toBe(5);

      // Retry: resumes at plan re-execution → plan(6) → interrupt (gate active)
      const r4 = await graph.invoke(state, config);
      expectInterruptAt(r4, 'plan');
      expect(executor.callCount).toBe(6);

      // Approve plan → implement(7)
      const result = await graph.invoke(approveCommand(), config);
      expectNoInterrupts(result);
      expect(executor.callCount).toBe(7);
    });

    it('should retry through full walkthrough: req → plan → implement crash → retry', async () => {
      // Full walkthrough with all gates, crash at implement
      const executor = createRetryExecutor({ failOnCalls: new Set([5]) });
      const graph = ctx.buildGraph(executor, { withMerge: true });
      const config = ctx.newConfig();
      const state = ctx.initialState(ALL_GATES_DISABLED);

      // analyze(1), req(2) → interrupt at requirements
      const r1 = await graph.invoke(state, config);
      expectInterruptAt(r1, 'requirements');
      expect(executor.callCount).toBe(2);

      // Approve requirements → research(3), plan(4) → interrupt at plan
      const r2 = await graph.invoke(approveCommand(), config);
      expectInterruptAt(r2, 'plan');
      expect(executor.callCount).toBe(4);

      // Approve plan → implement crashes (call 5)
      await expect(graph.invoke(approveCommand(), config)).rejects.toThrow('ENOENT');
      expect(executor.callCount).toBe(5);

      // Retry: resume from implement
      // implement(6), merge-commit(7) → interrupt at merge
      const r4 = await graph.invoke(state, config);
      expectInterruptAt(r4, 'merge');
      expect(executor.callCount).toBe(7);

      // Approve merge → completes (no squash since allowMerge=false)
      const result = await graph.invoke(approveCommand(), config);
      expectNoInterrupts(result);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Group 5: State preservation after retry                          */
  /* ---------------------------------------------------------------- */

  describe('state preservation after retry', () => {
    it('should preserve messages from completed nodes after retry', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([3]) });
      const graph = ctx.buildGraph(executor);
      const config = ctx.newConfig();
      const state = ctx.initialState(ALL_GATES_ENABLED);

      // Crashes at research (call 3)
      await expect(graph.invoke(state, config)).rejects.toThrow('ENOENT');

      // Retry: completes successfully
      const result = await graph.invoke(state, config);

      // Messages should include entries from analyze and requirements (completed before crash)
      expect(result.messages.length).toBeGreaterThanOrEqual(3);
      const hasAnalyze = result.messages.some((m: string) => m.includes('[analyze]'));
      const hasRequirements = result.messages.some((m: string) => m.includes('[requirements]'));
      expect(hasAnalyze).toBe(true);
      expect(hasRequirements).toBe(true);
    });

    it('should complete with correct final state after retry from mid-graph crash', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([4]) });
      const graph = ctx.buildGraph(executor);
      const config = ctx.newConfig();
      const state = ctx.initialState(ALL_GATES_ENABLED);

      // Crashes at plan (call 4)
      await expect(graph.invoke(state, config)).rejects.toThrow('ENOENT');

      // Retry
      const result = await graph.invoke(state, config);
      expectNoInterrupts(result);

      // Final state should look normal
      expect(result.featureId).toBeTruthy();
      expect(result.error).toBeNull();
    });

    it('should not re-execute already-completed nodes on retry', async () => {
      const executor = createRetryExecutor({ failOnCalls: new Set([5]) });
      const graph = ctx.buildGraph(executor);
      const config = ctx.newConfig();
      const state = ctx.initialState(ALL_GATES_ENABLED);

      // 4 nodes succeed, implement(5) crashes
      await expect(graph.invoke(state, config)).rejects.toThrow('ENOENT');
      expect(executor.callCount).toBe(5);

      // Retry: only implement should execute
      await graph.invoke(state, config);
      expect(executor.callCount).toBe(6); // 5 + 1 (implement retry only)
      expect(executor.prompts).toHaveLength(6);
    });
  });
});
