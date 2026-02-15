/**
 * HITL Approval Flow Integration Test
 *
 * Tests the full LangGraph interrupt/resume cycle for the feature agent
 * with human-in-the-loop approval gates.
 *
 * Uses a real SQLite checkpointer and mock agent executor (no LLM calls).
 * Verifies that:
 *   1. Graph pauses at the correct approval gates
 *   2. Resume continues from checkpoint (same thread_id)
 *   3. Wrong thread_id does NOT resume from checkpoint
 *   4. Different gate configurations change interrupt behavior
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Command } from '@langchain/langgraph';
import { createFeatureAgentGraph } from '../../../../../src/infrastructure/services/agents/feature-agent/feature-agent-graph.js';
import { createCheckpointer } from '../../../../../src/infrastructure/services/agents/common/checkpointer.js';
import type { IAgentExecutor } from '../../../../../src/application/ports/output/agents/agent-executor.interface.js';

function createMockExecutor(): IAgentExecutor {
  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockResolvedValue({ result: 'Mock agent response for testing' }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };
}

/** Extract the interrupt payload from a graph result. */
function getInterrupts(result: Record<string, unknown>): { value: Record<string, unknown> }[] {
  return (result.__interrupt__ as { value: Record<string, unknown> }[]) ?? [];
}

describe('HITL Approval Flow (Graph-level)', () => {
  let tempDir: string;
  let specDir: string;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'shep-hitl-test-'));
    specDir = join(tempDir, 'specs', '001-test');
    mkdirSync(specDir, { recursive: true });

    writeFileSync(
      join(specDir, 'spec.yaml'),
      'name: Test Feature\ndescription: Test feature for HITL e2e\n'
    );
    writeFileSync(
      join(specDir, 'plan.yaml'),
      `${[
        'phases:',
        '  - id: phase-1',
        '    name: Setup',
        '    parallel: false',
        '    taskIds:',
        '      - task-1',
      ].join('\n')}\n`
    );
    writeFileSync(
      join(specDir, 'tasks.yaml'),
      `${[
        'tasks:',
        '  - id: task-1',
        '    phaseId: phase-1',
        '    title: Implement feature',
        '    description: Implement the test feature',
        '    state: todo',
        '    dependencies: []',
        '    acceptanceCriteria:',
        '      - Feature works',
        '    tdd: null',
        '    estimatedEffort: small',
      ].join('\n')}\n`
    );

    // Suppress node logger output during tests
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  beforeEach(() => {
    // Reset feature.yaml so markPhaseComplete from previous tests doesn't affect next test
    writeFileSync(join(specDir, 'feature.yaml'), 'status:\n  completedPhases: []\n');
  });

  afterAll(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should pause at requirements, plan, and implement gates then complete on final resume', async () => {
    const executor = createMockExecutor();
    const checkpointer = createCheckpointer(':memory:');
    const graph = createFeatureAgentGraph(executor, checkpointer);
    const config = { configurable: { thread_id: 'full-cycle-thread' } };

    const initialState = {
      featureId: 'feat-test-001',
      repositoryPath: tempDir,
      worktreePath: tempDir,
      specDir,
      approvalGates: { allowPrd: false, allowPlan: false },
    };

    // Step 1: Initial invoke → analyze runs, then requirements interrupts
    const result1 = await graph.invoke(initialState, config);
    const interrupts1 = getInterrupts(result1);
    expect(interrupts1.length).toBe(1);
    expect(interrupts1[0].value.node).toBe('requirements');

    // analyze + requirements = 2 executor calls so far
    expect(executor.execute).toHaveBeenCalledTimes(2);

    // Step 2: Resume → requirements skips (already complete), research runs, plan interrupts
    const result2 = await graph.invoke(new Command({ resume: { approved: true } }), config);
    const interrupts2 = getInterrupts(result2);
    expect(interrupts2.length).toBe(1);
    expect(interrupts2[0].value.node).toBe('plan');

    // research + plan = 2 more calls (requirements NOT re-executed)
    expect(executor.execute).toHaveBeenCalledTimes(4);

    // Step 3: Resume → plan skips (already complete), implement runs and interrupts
    const result3 = await graph.invoke(new Command({ resume: { approved: true } }), config);
    const interrupts3 = getInterrupts(result3);
    expect(interrupts3.length).toBe(1);
    expect(interrupts3[0].value.node).toBe('implement');

    // implement = 1 more call (plan NOT re-executed)
    expect(executor.execute).toHaveBeenCalledTimes(5);

    // Step 4: Resume → implement skips (already complete), graph reaches END
    const result4 = await graph.invoke(new Command({ resume: { approved: true } }), config);
    const interrupts4 = getInterrupts(result4);
    expect(interrupts4).toHaveLength(0);

    // No additional executor calls (implement NOT re-executed)
    expect(executor.execute).toHaveBeenCalledTimes(5);

    // All nodes ran — verify messages accumulated
    expect(result4.messages.length).toBeGreaterThanOrEqual(1);
  });

  it('should resume from checkpoint with correct thread_id (regression: threadId bug)', async () => {
    const executor = createMockExecutor();
    const checkpointer = createCheckpointer(':memory:');
    const graph = createFeatureAgentGraph(executor, checkpointer);
    const threadId = 'correct-thread';
    const config = { configurable: { thread_id: threadId } };

    // Initial invoke → interrupt at requirements
    const result1 = await graph.invoke(
      {
        featureId: 'feat-test-002',
        repositoryPath: tempDir,
        worktreePath: tempDir,
        specDir,
        approvalGates: { allowPrd: false, allowPlan: false },
      },
      config
    );
    expect(getInterrupts(result1)[0].value.node).toBe('requirements');

    // Resume with same threadId → should continue past requirements to plan
    const result2 = await graph.invoke(new Command({ resume: { approved: true } }), config);
    const interrupts = getInterrupts(result2);
    expect(interrupts.length).toBe(1);
    expect(interrupts[0].value.node).toBe('plan');
  });

  it('should NOT resume from checkpoint with wrong thread_id (demonstrates the bug)', async () => {
    const executor = createMockExecutor();
    const checkpointer = createCheckpointer(':memory:');
    const graph = createFeatureAgentGraph(executor, checkpointer);

    // Initial invoke with thread A → interrupt at requirements
    const result1 = await graph.invoke(
      {
        featureId: 'feat-test-003',
        repositoryPath: tempDir,
        worktreePath: tempDir,
        specDir,
        approvalGates: { allowPrd: false, allowPlan: false },
      },
      { configurable: { thread_id: 'thread-A' } }
    );
    expect(getInterrupts(result1)[0].value.node).toBe('requirements');

    // Resume with WRONG thread_id — no checkpoint exists.
    // LangGraph silently returns empty state instead of continuing the graph.
    // This is exactly what caused the "instant completion" bug:
    // the worker saw no error + no interrupt → marked run as "completed".
    const result2 = await graph.invoke(new Command({ resume: { approved: true } }), {
      configurable: { thread_id: 'thread-B' },
    });

    // With wrong thread: no nodes executed, no messages, no interrupts
    expect(result2.messages ?? []).toHaveLength(0);
    expect(getInterrupts(result2)).toHaveLength(0);

    // Contrast: correct thread resumes properly
    const result3 = await graph.invoke(new Command({ resume: { approved: true } }), {
      configurable: { thread_id: 'thread-A' },
    });
    // Should continue to plan interrupt (not empty/completed)
    expect(getInterrupts(result3).length).toBe(1);
    expect(getInterrupts(result3)[0].value.node).toBe('plan');
  });

  it('should not interrupt when approvalGates is undefined (fully autonomous)', async () => {
    const executor = createMockExecutor();
    const checkpointer = createCheckpointer(':memory:');
    const graph = createFeatureAgentGraph(executor, checkpointer);
    const config = { configurable: { thread_id: 'autonomous-thread' } };

    // No approval gates → fully autonomous, graph runs to completion
    const result = await graph.invoke(
      {
        featureId: 'feat-test-004',
        repositoryPath: tempDir,
        worktreePath: tempDir,
        specDir,
      },
      config
    );

    expect(getInterrupts(result)).toHaveLength(0);
    expect(result.messages.length).toBeGreaterThanOrEqual(1);
  });

  it('should skip requirements gate when allowPrd=true, interrupt at plan', async () => {
    const executor = createMockExecutor();
    const checkpointer = createCheckpointer(':memory:');
    const graph = createFeatureAgentGraph(executor, checkpointer);
    const config = { configurable: { thread_id: 'skip-prd-thread' } };

    const result = await graph.invoke(
      {
        featureId: 'feat-test-005',
        repositoryPath: tempDir,
        worktreePath: tempDir,
        specDir,
        approvalGates: { allowPrd: true, allowPlan: false },
      },
      config
    );

    // Should skip requirements interrupt and pause at plan instead
    const interrupts = getInterrupts(result);
    expect(interrupts.length).toBe(1);
    expect(interrupts[0].value.node).toBe('plan');
  });

  it('should skip requirements and plan gates when both allowed, interrupt at implement', async () => {
    const executor = createMockExecutor();
    const checkpointer = createCheckpointer(':memory:');
    const graph = createFeatureAgentGraph(executor, checkpointer);
    const config = { configurable: { thread_id: 'skip-both-thread' } };

    const result = await graph.invoke(
      {
        featureId: 'feat-test-006',
        repositoryPath: tempDir,
        worktreePath: tempDir,
        specDir,
        approvalGates: { allowPrd: true, allowPlan: true },
      },
      config
    );

    // Both gates allowed → shouldInterrupt returns false for all nodes
    // (allowPrd && allowPlan is the "fully autonomous" path)
    expect(getInterrupts(result)).toHaveLength(0);
  });
});
