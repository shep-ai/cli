/**
 * Approve Flow Tests
 *
 * Tests that approval resumes the graph past the interrupted node
 * without re-executing the node's agent call.
 *
 * Covers:
 * - Test 1: Requirements approve → continues to research
 * - Test 5: Plan approve → continues to implement
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestContext, type TestContext } from './setup.js';
import {
  getInterrupts,
  expectInterruptAt,
  approveCommand,
  readCompletedPhases,
  ALL_GATES_DISABLED,
  PRD_ALLOWED,
} from './helpers.js';

describe('Graph State Transitions › Approve Flow', () => {
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

  it('should approve requirements and continue to research (Test 1)', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(ALL_GATES_DISABLED);

    // Invoke #1 — runs analyze + requirements, interrupts at requirements
    const result1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(result1, 'requirements');
    expect(ctx.executor.execute).toHaveBeenCalledTimes(2); // analyze + requirements

    // feature.yaml should have "requirements" in completedPhases
    expect(readCompletedPhases(ctx.specDir)).toContain('requirements');

    // Invoke #2 — approve → requirements skips, research executes, plan interrupts
    const result2 = await ctx.graph.invoke(approveCommand(), config);
    expectInterruptAt(result2, 'plan');

    // research + plan = 2 more calls (requirements NOT re-executed)
    expect(ctx.executor.execute).toHaveBeenCalledTimes(4);
  });

  it('should approve plan and continue to implement (Test 5)', async () => {
    const config = ctx.newConfig();
    // PRD auto-approved, plan gated
    const state = ctx.initialState(PRD_ALLOWED);

    // Invoke #1 — analyze, requirements (no interrupt), research, plan interrupts
    const result1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(result1, 'plan');

    // Invoke #2 — approve plan → implement interrupts
    const result2 = await ctx.graph.invoke(approveCommand(), config);
    expectInterruptAt(result2, 'implement');

    // Requirements did NOT interrupt (allowPrd: true)
    // Only plan should have interrupted
  });

  it('should walk through all gates: requirements → plan → implement → end', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(ALL_GATES_DISABLED);

    // Step 1: interrupt at requirements
    const r1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(r1, 'requirements');

    // Step 2: approve → interrupt at plan
    const r2 = await ctx.graph.invoke(approveCommand(), config);
    expectInterruptAt(r2, 'plan');

    // Step 3: approve → interrupt at implement
    const r3 = await ctx.graph.invoke(approveCommand(), config);
    expectInterruptAt(r3, 'implement');

    // Step 4: approve → graph completes
    const r4 = await ctx.graph.invoke(approveCommand(), config);
    expect(getInterrupts(r4)).toHaveLength(0);
    expect(r4.messages.length).toBeGreaterThanOrEqual(1);
  });
});
