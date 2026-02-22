/**
 * Gate Configuration Tests
 *
 * Tests that different ApprovalGates configurations control
 * which nodes interrupt and which run autonomously.
 *
 * Covers:
 * - Test 7: No gates (undefined) → no interrupts, full autonomous run
 * - Test 8: All gates allowed → no interrupts, full autonomous run
 * - Selective gate combinations
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestContext, type TestContext } from './setup.js';
import {
  getInterrupts,
  expectInterruptAt,
  expectNoInterrupts,
  ALL_GATES_DISABLED,
  ALL_GATES_ENABLED,
  PRD_ALLOWED,
  PRD_PLAN_ALLOWED,
} from './helpers.js';

describe('Graph State Transitions › Gate Configuration', () => {
  let ctx: TestContext;
  let output: { restore: () => void };

  beforeAll(() => {
    ctx = createTestContext();
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

  it('should run fully without interrupts when approvalGates is undefined (Test 7)', async () => {
    const config = ctx.newConfig();
    // No gates — fully autonomous
    const state = ctx.initialState();

    const result = await ctx.graph.invoke(state, config);

    expectNoInterrupts(result);
    expect(result.messages.length).toBeGreaterThanOrEqual(1);
    // All nodes executed exactly once: analyze + requirements + research + plan + implement = 5
    expect(ctx.executor.execute).toHaveBeenCalledTimes(5);
  });

  it('should run fully without interrupts when all gates are true (Test 8)', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(ALL_GATES_ENABLED);

    const result = await ctx.graph.invoke(state, config);

    expectNoInterrupts(result);
    expect(result.messages.length).toBeGreaterThanOrEqual(1);
    expect(ctx.executor.execute).toHaveBeenCalledTimes(5);
  });

  it('should skip requirements interrupt when allowPrd=true, interrupt at plan', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(PRD_ALLOWED);

    const result = await ctx.graph.invoke(state, config);

    // Requirements passed through (allowPrd: true), plan interrupts
    expectInterruptAt(result, 'plan');
  });

  it('should skip requirements and plan when both allowed, run to completion', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(PRD_PLAN_ALLOWED);

    const result = await ctx.graph.invoke(state, config);

    // Requirements + plan pass through, implement runs, graph completes (no merge in test graph)
    expectNoInterrupts(result);
    expect(result.messages.length).toBeGreaterThanOrEqual(1);
  });

  it('should interrupt at requirements when only allowPrd is false', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(ALL_GATES_DISABLED);

    const result = await ctx.graph.invoke(state, config);

    expectInterruptAt(result, 'requirements');
  });
});
