/**
 * Reject Flow Tests
 *
 * Tests that rejection clears the completed phase, re-executes the node,
 * and interrupts again for a new approval cycle.
 *
 * Covers:
 * - Test 2: Requirements rejected → re-executes and interrupts again
 * - Test 3: Requirements rejected once → approved on second attempt
 * - Test 4: Multiple consecutive rejections (fixed — state-based detection)
 * - Test 6: Plan rejected → re-executes and interrupts again
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestContext, type TestContext } from './setup.js';
import {
  expectInterruptAt,
  expectNoInterrupts,
  approveCommand,
  rejectCommand,
  readCompletedPhases,
  ALL_GATES_DISABLED,
  PRD_ALLOWED,
} from './helpers.js';

describe('Graph State Transitions › Reject Flow', () => {
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

  it('should reject requirements, re-execute, and interrupt again (Test 2)', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(ALL_GATES_DISABLED);

    // Invoke #1 — interrupt at requirements
    const r1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(r1, 'requirements');
    expect(ctx.executor.execute).toHaveBeenCalledTimes(2); // analyze + requirements

    // Invoke #2 — reject → re-execute requirements, interrupt again
    const r2 = await ctx.graph.invoke(rejectCommand('add error handling'), config);
    expectInterruptAt(r2, 'requirements');

    // Requirements was called twice: once in invoke #1, once on re-execution
    // analyze(1) + requirements(1) + requirements(re-exec) = 3
    expect(ctx.executor.execute).toHaveBeenCalledTimes(3);

    // completedPhases should include requirements (re-marked after re-execution)
    expect(readCompletedPhases(ctx.specDir)).toContain('requirements');
  });

  it('should reject then approve: full iteration cycle (Test 3)', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(ALL_GATES_DISABLED);

    // Invoke #1 — interrupt at requirements
    const r1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(r1, 'requirements');

    // Invoke #2 — reject → re-execute, interrupt again
    const r2 = await ctx.graph.invoke(rejectCommand('add feature X'), config);
    expectInterruptAt(r2, 'requirements');

    // Invoke #3 — approve → continues to plan
    const r3 = await ctx.graph.invoke(approveCommand(), config);
    expectInterruptAt(r3, 'plan');

    // With state-based detection (no stale replay), the approve skips
    // requirements and continues: research(4) + plan(5)
    // analyze(1) + req(2) + req-reexec(3) + research(4) + plan(5) = 5
    expect(ctx.executor.execute).toHaveBeenCalledTimes(5);
  });

  it('should handle consecutive rejections correctly (Test 4)', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(ALL_GATES_DISABLED);

    // Invoke #1 — interrupt at requirements
    const r1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(r1, 'requirements');

    // Invoke #2 — first rejection works correctly
    const r2 = await ctx.graph.invoke(rejectCommand('fix A'), config);
    expectInterruptAt(r2, 'requirements');

    // Invoke #3 — second rejection: with state-based detection, this
    // correctly re-interrupts at requirements (bug fixed)
    const r3 = await ctx.graph.invoke(rejectCommand('fix B'), config);
    expectInterruptAt(r3, 'requirements');

    // analyze(1) + req(2) + req-reexec(3) + req-reexec(4) = 4
    expect(ctx.executor.execute).toHaveBeenCalledTimes(4);
  });

  it('should handle 7+ consecutive PRD rejections then approve', async () => {
    const config = ctx.newConfig();
    const state = ctx.initialState(ALL_GATES_DISABLED);

    // Invoke #1 — interrupt at requirements
    const r1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(r1, 'requirements');
    expect(ctx.executor.callCount).toBe(2); // analyze + requirements

    // 8 consecutive rejections — each should re-interrupt at requirements
    const rejectionMessages = [
      'add error handling section',
      'include performance requirements',
      'clarify authentication flow',
      'add data migration strategy',
      'specify API rate limits',
      'add rollback procedures',
      'include monitoring requirements',
      'define SLA targets',
    ];

    for (let i = 0; i < rejectionMessages.length; i++) {
      const result = await ctx.graph.invoke(rejectCommand(rejectionMessages[i]), config);
      expectInterruptAt(result, 'requirements');

      // Each rejection re-executes requirements once
      // analyze(1) + req(1) + rejections(i+1)
      expect(ctx.executor.callCount).toBe(3 + i);

      // completedPhases should still include requirements after each re-execution
      expect(readCompletedPhases(ctx.specDir)).toContain('requirements');
    }

    // Final call count after 8 rejections: analyze(1) + req(1) + 8 re-execs = 10
    expect(ctx.executor.callCount).toBe(10);

    // Approve → should continue past requirements to research, then plan
    const rApprove = await ctx.graph.invoke(approveCommand(), config);
    expectInterruptAt(rApprove, 'plan');

    // After approve: research(11) + plan(12)
    expect(ctx.executor.callCount).toBe(12);
  });

  it('should handle 7+ consecutive plan rejections then approve', async () => {
    const config = ctx.newConfig();
    // PRD auto-approved so we get directly to plan
    const state = ctx.initialState(PRD_ALLOWED);

    // Invoke #1 — runs to plan, interrupts
    const r1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(r1, 'plan');
    // analyze(1) + requirements(2) + research(3) + plan(4) = 4
    expect(ctx.executor.callCount).toBe(4);

    // 8 consecutive plan rejections
    const rejectionMessages = [
      'add more implementation detail',
      'break tasks into smaller chunks',
      'clarify testing strategy',
      'add rollback plan',
      'specify dependency order',
      'include code review checkpoints',
      'add integration test phase',
      'define acceptance criteria',
    ];

    for (let i = 0; i < rejectionMessages.length; i++) {
      const result = await ctx.graph.invoke(rejectCommand(rejectionMessages[i]), config);
      expectInterruptAt(result, 'plan');

      // Each rejection re-executes plan only
      // initial(4) + rejections(i+1)
      expect(ctx.executor.callCount).toBe(5 + i);

      // completedPhases should still include plan after each re-execution
      expect(readCompletedPhases(ctx.specDir)).toContain('plan');
    }

    // Final call count: initial(4) + 8 re-execs = 12
    expect(ctx.executor.callCount).toBe(12);

    // Approve → implement runs, graph completes (no merge in test graph)
    const rApprove = await ctx.graph.invoke(approveCommand(), config);
    expectNoInterrupts(rApprove);

    // After approve: implement(13)
    expect(ctx.executor.callCount).toBe(13);
  });

  it('should reject plan, re-execute plan only (Test 6)', async () => {
    const config = ctx.newConfig();
    // PRD auto-approved so we get directly to plan
    const state = ctx.initialState(PRD_ALLOWED);

    // Invoke #1 — runs to plan, interrupts
    const r1 = await ctx.graph.invoke(state, config);
    expectInterruptAt(r1, 'plan');
    const callsBeforeReject = ctx.executor.callCount;

    // Invoke #2 — reject plan → re-execute plan only, interrupt again
    const r2 = await ctx.graph.invoke(rejectCommand('refine the plan'), config);
    expectInterruptAt(r2, 'plan');

    // Only plan was re-executed (research was NOT re-executed)
    expect(ctx.executor.callCount - callsBeforeReject).toBe(1);

    // Invoke #3 — approve plan → implement runs, graph completes (no merge in test graph)
    const r3 = await ctx.graph.invoke(approveCommand(), config);
    expectNoInterrupts(r3);
  });
});
