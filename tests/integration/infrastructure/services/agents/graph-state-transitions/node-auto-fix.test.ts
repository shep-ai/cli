/**
 * Node Auto-Fix State Transition Tests
 *
 * Tests that the withAutoFix wrapper correctly updates graph state channels
 * (nodeFixAttempts, nodeFixHistory, nodeFixStatus) when producer nodes fail
 * and the auto-fix loop kicks in during full graph execution.
 *
 * Covers:
 * - Default idle state when no errors occur
 * - Successful auto-fix on first attempt → state channels reflect fix
 * - Non-fixable errors bypass the fix loop
 * - UNFIXABLE executor response short-circuits the fix loop
 * - All fix attempts exhausted → error propagates
 * - Fix prompt includes correct node name and error context
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
import {
  VALID_SPEC_YAML,
  VALID_RESEARCH_YAML,
  VALID_PLAN_YAML,
  VALID_TASKS_YAML,
} from './fixtures.js';

/* ------------------------------------------------------------------ */
/*  Custom executor that can be configured to fail on specific calls   */
/* ------------------------------------------------------------------ */

interface FailConfig {
  /** 1-indexed executor call numbers that should throw. */
  failOnCalls?: Set<number>;
  /** Error to throw on failure (default: SyntaxError). */
  failError?: Error;
  /** When true, auto-fix prompts return "UNFIXABLE: ..." instead of a fix. */
  unfixableOnFix?: boolean;
}

interface TestExecutor extends IAgentExecutor {
  callCount: number;
  prompts: string[];
  execute: Mock;
}

function createTestExecutor(config: FailConfig = {}): TestExecutor {
  let callCount = 0;
  const prompts: string[] = [];

  const execute = vi.fn(async (prompt: string) => {
    callCount++;
    prompts.push(prompt);

    if (config.failOnCalls?.has(callCount)) {
      throw config.failError ?? new SyntaxError(`Simulated failure on call #${callCount}`);
    }

    if (config.unfixableOnFix && prompt.includes('## Auto-Fix:')) {
      return { result: 'UNFIXABLE: Requires external infrastructure change', exitCode: 0 };
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
/*  Test setup helpers                                                 */
/* ------------------------------------------------------------------ */

interface FixTestContext {
  tempDir: string;
  specDir: string;
  buildGraph: (executor: TestExecutor) => ReturnType<typeof createFeatureAgentGraph>;
  newConfig: () => { configurable: { thread_id: string } };
  initialState: () => Record<string, unknown>;
}

function createFixTestContext(): FixTestContext {
  let tempDir = '';
  let specDir = '';

  return {
    get tempDir() {
      return tempDir;
    },
    get specDir() {
      return specDir;
    },

    buildGraph: (executor: TestExecutor) => {
      // Reinit temp dir with fresh YAML files for each test
      if (tempDir) rmSync(tempDir, { recursive: true, force: true });
      tempDir = mkdtempSync(join(tmpdir(), 'shep-autofix-'));
      specDir = join(tempDir, 'specs', '001-test');
      mkdirSync(specDir, { recursive: true });

      writeFileSync(join(specDir, 'spec.yaml'), VALID_SPEC_YAML);
      writeFileSync(join(specDir, 'research.yaml'), VALID_RESEARCH_YAML);
      writeFileSync(join(specDir, 'plan.yaml'), VALID_PLAN_YAML);
      writeFileSync(join(specDir, 'tasks.yaml'), VALID_TASKS_YAML);
      writeFileSync(join(specDir, 'feature.yaml'), 'status:\n  completedPhases: []\n');

      const deps: FeatureAgentGraphDeps = { executor };
      return createFeatureAgentGraph(deps, createCheckpointer(':memory:'));
    },

    newConfig: () => ({
      configurable: { thread_id: `autofix-${randomUUID()}` },
    }),

    initialState: () => ({
      featureId: `feat-${randomUUID().slice(0, 8)}`,
      repositoryPath: tempDir,
      worktreePath: tempDir,
      specDir,
      // All gates enabled — fully autonomous, no interrupts
      approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('Graph State Transitions › Node Auto-Fix', () => {
  const ctx = createFixTestContext();
  let output: { restore: () => void };

  beforeAll(() => {
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

  // Normal flow call order (no merge):
  // Call 1: analyze
  // Call 2: requirements
  // Call 3: research
  // Call 4: plan
  // Call 5: implement

  it('should complete with default idle fix state when no errors occur', async () => {
    const executor = createTestExecutor(); // no failures
    const graph = ctx.buildGraph(executor);
    const config = ctx.newConfig();

    const result = await graph.invoke(ctx.initialState(), config);

    expect(executor.callCount).toBe(5);
    expect(result.nodeFixAttempts).toBe(0);
    expect(result.nodeFixHistory).toEqual([]);
    expect(result.nodeFixStatus).toBe('idle');
  });

  it('should auto-fix research node and update state channels on success', async () => {
    // Call 3 (research) fails → auto-fix → retry succeeds
    const executor = createTestExecutor({ failOnCalls: new Set([3]) });
    const graph = ctx.buildGraph(executor);
    const config = ctx.newConfig();

    const result = await graph.invoke(ctx.initialState(), config);

    // 5 normal + 1 fix prompt + 1 retry = 7
    // (but research's initial fail doesn't count as a normal success)
    // Call sequence: analyze(1), requirements(2), research-FAIL(3),
    //               fix-prompt(4), research-retry(5), plan(6), implement(7)
    expect(executor.callCount).toBe(7);

    expect(result.nodeFixAttempts).toBe(1);
    expect(result.nodeFixStatus).toBe('success');
    expect(result.nodeFixHistory).toHaveLength(1);
    expect(result.nodeFixHistory[0]).toMatchObject({
      attempt: 1,
      nodeName: 'research',
      outcome: 'fixed',
    });
    expect(result.nodeFixHistory[0].errorSummary).toContain('Simulated failure');
    expect(result.nodeFixHistory[0].startedAt).toBeTruthy();
  });

  it('should include node name and error in the fix prompt', async () => {
    const executor = createTestExecutor({ failOnCalls: new Set([3]) });
    const graph = ctx.buildGraph(executor);
    const config = ctx.newConfig();

    await graph.invoke(ctx.initialState(), config);

    // Call 4 is the auto-fix prompt
    const fixPrompt = executor.prompts[3];
    expect(fixPrompt).toContain('## Auto-Fix: Node "research" Failed');
    expect(fixPrompt).toContain('Simulated failure on call #3');
    expect(fixPrompt).toContain('researching technical approaches');
    expect(fixPrompt).toContain('UNFIXABLE:');
  });

  it('should auto-fix the analyze node (first producer node)', async () => {
    // Call 1 (analyze) fails → auto-fix → retry succeeds
    const executor = createTestExecutor({ failOnCalls: new Set([1]) });
    const graph = ctx.buildGraph(executor);
    const config = ctx.newConfig();

    const result = await graph.invoke(ctx.initialState(), config);

    // analyze-FAIL(1), fix(2), analyze-retry(3), req(4), research(5), plan(6), implement(7)
    expect(executor.callCount).toBe(7);
    expect(result.nodeFixAttempts).toBe(1);
    expect(result.nodeFixStatus).toBe('success');
    expect(result.nodeFixHistory).toHaveLength(1);
    expect(result.nodeFixHistory[0].nodeName).toBe('analyze');
  });

  it('should auto-fix the plan node (last wrapped producer)', async () => {
    // Call 4 (plan) fails → auto-fix → retry succeeds
    const executor = createTestExecutor({ failOnCalls: new Set([4]) });
    const graph = ctx.buildGraph(executor);
    const config = ctx.newConfig();

    const result = await graph.invoke(ctx.initialState(), config);

    // analyze(1), req(2), research(3), plan-FAIL(4), fix(5), plan-retry(6), implement(7)
    expect(executor.callCount).toBe(7);
    expect(result.nodeFixAttempts).toBe(1);
    expect(result.nodeFixHistory).toHaveLength(1);
    expect(result.nodeFixHistory[0].nodeName).toBe('plan');
  });

  it('should propagate non-fixable errors without entering fix loop', async () => {
    // EACCES is classified as non-fixable by withAutoFix
    const executor = createTestExecutor({
      failOnCalls: new Set([3]),
      failError: new Error('EACCES: permission denied /etc/shadow'),
    });
    const graph = ctx.buildGraph(executor);
    const config = ctx.newConfig();

    await expect(graph.invoke(ctx.initialState(), config)).rejects.toThrow('EACCES');

    // Only 3 calls: analyze, requirements, research-FAIL — no fix prompt issued
    expect(executor.callCount).toBe(3);
    // No fix prompts should appear
    expect(executor.prompts.some((p) => p.includes('## Auto-Fix:'))).toBe(false);
  });

  it('should handle UNFIXABLE executor response and rethrow original error', async () => {
    const executor = createTestExecutor({
      failOnCalls: new Set([3]),
      unfixableOnFix: true,
    });
    const graph = ctx.buildGraph(executor);
    const config = ctx.newConfig();

    await expect(graph.invoke(ctx.initialState(), config)).rejects.toThrow('Simulated failure');

    // 3 normal + 1 fix prompt (returns UNFIXABLE) = 4
    expect(executor.callCount).toBe(4);
  });

  it('should exhaust all fix attempts and throw when retries keep failing', async () => {
    // Research fails on initial (3), retry after fix 1 (5), retry after fix 2 (7)
    // Default maxAttempts=2 from settings fallback
    const executor = createTestExecutor({ failOnCalls: new Set([3, 5, 7]) });
    const graph = ctx.buildGraph(executor);
    const config = ctx.newConfig();

    await expect(graph.invoke(ctx.initialState(), config)).rejects.toThrow('Simulated failure');

    // analyze(1), req(2), research-FAIL(3), fix1(4), retry1-FAIL(5), fix2(6), retry2-FAIL(7)
    expect(executor.callCount).toBe(7);
  });

  it('should succeed on second fix attempt when first retry fails', async () => {
    // Research fails on initial (3) and first retry (5), but second retry (7) succeeds
    const executor = createTestExecutor({ failOnCalls: new Set([3, 5]) });
    const graph = ctx.buildGraph(executor);
    const config = ctx.newConfig();

    const result = await graph.invoke(ctx.initialState(), config);

    // analyze(1), req(2), research-FAIL(3), fix1(4), retry1-FAIL(5),
    // fix2(6), retry2-OK(7), plan(8), implement(9)
    expect(executor.callCount).toBe(9);

    expect(result.nodeFixAttempts).toBe(2);
    expect(result.nodeFixStatus).toBe('success');
    expect(result.nodeFixHistory).toHaveLength(2);
    expect(result.nodeFixHistory[0]).toMatchObject({
      attempt: 1,
      nodeName: 'research',
      outcome: 'failed',
    });
    expect(result.nodeFixHistory[1]).toMatchObject({
      attempt: 2,
      nodeName: 'research',
      outcome: 'fixed',
    });
  });

  it('should accumulate fix history when multiple nodes fail', async () => {
    // analyze (call 1) fails, then research (call 5 after analyze fix) also fails
    // Call sequence:
    //   analyze-FAIL(1), fix(2), analyze-retry(3),
    //   requirements(4), research-FAIL(5), fix(6), research-retry(7),
    //   plan(8), implement(9)
    const executor = createTestExecutor({ failOnCalls: new Set([1, 5]) });
    const graph = ctx.buildGraph(executor);
    const config = ctx.newConfig();

    const result = await graph.invoke(ctx.initialState(), config);

    expect(executor.callCount).toBe(9);

    // nodeFixHistory accumulates (reducer: [...prev, ...next])
    expect(result.nodeFixHistory).toHaveLength(2);
    expect(result.nodeFixHistory[0].nodeName).toBe('analyze');
    expect(result.nodeFixHistory[0].outcome).toBe('fixed');
    expect(result.nodeFixHistory[1].nodeName).toBe('research');
    expect(result.nodeFixHistory[1].outcome).toBe('fixed');

    // nodeFixAttempts uses replace reducer — last node's value wins
    expect(result.nodeFixAttempts).toBe(1);
    expect(result.nodeFixStatus).toBe('success');
  });
});
