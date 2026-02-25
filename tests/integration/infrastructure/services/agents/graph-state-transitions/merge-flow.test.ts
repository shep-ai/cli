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

  it('should reject merge once, re-execute, and interrupt again', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(PRD_PLAN_ALLOWED); // only merge gated

    // Invoke #1 — runs to merge, interrupts
    const r1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(r1, 'merge');
    // analyze + requirements + research + plan + implement + merge-commit = 6
    expect(ctx.executor.callCount).toBe(6);

    // Invoke #2 — reject merge → re-execute merge, interrupt again
    const r2 = await ctx.graph.invoke(rejectCommand('fix the PR description'), config);
    expectInterruptAt(r2, 'merge');

    // merge-commit re-executed = 7
    expect(ctx.executor.callCount).toBe(7);
  });

  it('should reject merge then approve: full iteration cycle', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(PRD_PLAN_ALLOWED);

    // Invoke #1 — runs to merge, interrupts
    const r1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(r1, 'merge');

    // Invoke #2 — reject → re-execute, interrupt again
    const r2 = await ctx.graph.invoke(rejectCommand('update commit message'), config);
    expectInterruptAt(r2, 'merge');

    // Invoke #3 — approve → merge completes, graph ends
    const r3 = await ctx.graph.invoke(approveCommand(), config);
    expectNoInterrupts(r3);
  });

  it('should handle 7+ consecutive merge rejections then approve', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(PRD_PLAN_ALLOWED);

    // Invoke #1 — runs to merge, interrupts
    const r1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(r1, 'merge');
    // analyze + requirements + research + plan + implement + merge-commit = 6
    expect(ctx.executor.callCount).toBe(6);

    // 8 consecutive merge rejections
    const rejectionMessages = [
      'fix PR description formatting',
      'add more context to commit message',
      'squash WIP commits',
      'update changelog entry',
      'fix failing CI check',
      'address linting warnings',
      'add missing test coverage',
      'update documentation links',
    ];

    for (let i = 0; i < rejectionMessages.length; i++) {
      const result = await ctx.graph.invoke(rejectCommand(rejectionMessages[i]), config);
      expectInterruptAt(result, 'merge');

      // Each rejection re-executes merge-commit once
      // initial(6) + rejections(i+1)
      expect(ctx.executor.callCount).toBe(7 + i);
    }

    // Final call count: initial(6) + 8 re-execs = 14
    expect(ctx.executor.callCount).toBe(14);

    // Approve → merge completes, graph ends
    const rApprove = await ctx.graph.invoke(approveCommand(), config);
    expectNoInterrupts(rApprove);
  });

  it('should handle merge rejection mid-walkthrough: req → plan → merge reject → approve', async () => {
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

    // Step 4: reject merge 3 times
    for (let i = 0; i < 3; i++) {
      const result = await ctx.graph.invoke(rejectCommand(`merge fix ${i + 1}`), config);
      expectInterruptAt(result, 'merge');
    }

    // Step 5: approve → merge completes, graph ends
    const rFinal = await ctx.graph.invoke(approveCommand(), config);
    expectNoInterrupts(rFinal);
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
