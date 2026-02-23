/**
 * Merge Flow Tests
 *
 * Tests the merge node interrupt behavior with the full graph.
 * Uses a graph with merge node wired in (withMerge=true).
 *
 * Covers:
 * - Merge interrupts when allowMerge=false
 * - Merge auto-proceeds when allowMerge=true
 * - Full gate walk-through: requirements → plan → implement → merge → end
 * - Plan reject + merge approve end-to-end
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestContext, type TestContext } from './setup.js';
import {
  expectInterruptAt,
  expectNoInterrupts,
  approveCommand,
  rejectCommand,
  ALL_GATES_DISABLED,
  ALL_GATES_ENABLED,
  PRD_PLAN_ALLOWED,
} from './helpers.js';

describe('Graph State Transitions › Merge Flow', () => {
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

  it('should interrupt at merge when allowMerge=false (after PRD+Plan auto-approved)', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(PRD_PLAN_ALLOWED); // allowMerge=false

    // Invoke #1 — all gates pass except merge, interrupts at merge
    const result = await ctx.graph.invoke(state, config);
    expectInterruptAt(result, 'merge');

    // All producer nodes + merge commit call: analyze + requirements + research + plan + implement + merge-commit = 6
    expect(ctx.executor.callCount).toBe(6);
  });

  it('should run to completion when all gates enabled (including merge)', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(ALL_GATES_ENABLED);

    const result = await ctx.graph.invoke(state, config);

    expectNoInterrupts(result);
    expect(result.messages.length).toBeGreaterThanOrEqual(1);
    // All producer nodes + merge commit + merge squash: 5 + 2 = 7
    expect(ctx.executor.callCount).toBe(7);
  });

  it('should walk through all gates: requirements → plan → merge → end', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(ALL_GATES_DISABLED);

    // Step 1: interrupt at requirements
    const r1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(r1, 'requirements');

    // Step 2: approve → interrupt at plan
    const r2 = await ctx.graph.invoke(approveCommand(), config);
    expectInterruptAt(r2, 'plan');

    // Step 3: approve → implement runs, interrupt at merge
    const r3 = await ctx.graph.invoke(approveCommand(), config);
    expectInterruptAt(r3, 'merge');

    // Step 4: approve → merge completes, graph ends
    const r4 = await ctx.graph.invoke(approveCommand(), config);
    expectNoInterrupts(r4);
    expect(r4.messages.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject plan, re-execute plan, then approve through merge', async () => {
    const config = ctx.newConfig();
    // PRD+Plan allowed so we skip straight to merge for the gate
    // But we want to test plan rejection, so use just PRD allowed
    const PRD_ONLY = { allowPrd: true, allowPlan: false, allowMerge: false };
    const state = ctx.initialState(PRD_ONLY);

    // Invoke #1 — runs to plan, interrupts
    const r1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(r1, 'plan');

    // Invoke #2 — reject plan → re-execute plan, interrupt again
    const r2 = await ctx.graph.invoke(rejectCommand('needs more detail'), config);
    expectInterruptAt(r2, 'plan');

    // Invoke #3 — approve plan → implement runs, interrupt at merge
    const r3 = await ctx.graph.invoke(approveCommand(), config);
    expectInterruptAt(r3, 'merge');

    // Invoke #4 — approve merge → graph completes
    const r4 = await ctx.graph.invoke(approveCommand(), config);
    expectNoInterrupts(r4);
  });

  it('should run fully without interrupts when gates are undefined (with merge node)', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(); // no gates

    const result = await ctx.graph.invoke(state, config);

    expectNoInterrupts(result);
    // All producer nodes + merge commit call (no merge squash since no allowMerge gate)
    expect(ctx.executor.callCount).toBe(6);
  });
});
