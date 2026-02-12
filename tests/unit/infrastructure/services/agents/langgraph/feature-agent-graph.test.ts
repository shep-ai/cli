/**
 * Feature Agent Graph Unit Tests
 *
 * Tests for the LangGraph StateGraph that orchestrates the complete
 * SDLC workflow: analyze → requirements → research → plan → implement.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command, MemorySaver } from '@langchain/langgraph';
import type { IAgentExecutor } from '../../../../../../src/application/ports/output/agents/agent-executor.interface.js';
import type { AgentType } from '../../../../../../src/domain/generated/output.js';

// Use vi.hoisted so the mock fn is available when vi.mock factory runs (hoisted to top)
const { mockReadFileSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    default: { ...actual, readFileSync: mockReadFileSync },
    readFileSync: mockReadFileSync,
  };
});

import {
  createFeatureAgentGraph,
  FeatureAgentAnnotation,
} from '../../../../../../src/infrastructure/services/agents/feature-agent/feature-agent-graph.js';

function createMockExecutor(): IAgentExecutor {
  return {
    agentType: 'claude-code' as AgentType,
    execute: vi.fn().mockResolvedValue({
      result: 'Mock executor result',
    }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };
}

describe('FeatureAgentAnnotation', () => {
  it('should be a valid Annotation root', () => {
    expect(FeatureAgentAnnotation).toBeDefined();
    expect(FeatureAgentAnnotation.spec).toBeDefined();
  });
});

describe('FeatureAgentAnnotation - approvalMode', () => {
  it('should support approvalMode in state', async () => {
    const mockExec = createMockExecutor();
    mockReadFileSync.mockReturnValue('name: test');
    const checkpointer = new MemorySaver();
    const compiled = createFeatureAgentGraph(mockExec, checkpointer);

    const result = await compiled.invoke(
      {
        featureId: 'feat-approval',
        repositoryPath: '/test/repo',
        worktreePath: '/test/repo',
        specDir: '/test/specs/001-test',
        approvalMode: 'interactive',
      },
      { configurable: { thread_id: 'approval-thread' } }
    );

    // approvalMode should be preserved through execution
    expect(result.approvalMode).toBe('interactive');
  });

  it('should default approvalMode to undefined when not provided', async () => {
    const mockExec = createMockExecutor();
    mockReadFileSync.mockReturnValue('name: test');
    const checkpointer = new MemorySaver();
    const compiled = createFeatureAgentGraph(mockExec, checkpointer);

    const result = await compiled.invoke(
      {
        featureId: 'feat-no-approval',
        repositoryPath: '/test/repo',
        worktreePath: '/test/repo',
        specDir: '/test/specs/001-test',
      },
      { configurable: { thread_id: 'no-approval-thread' } }
    );

    expect(result.approvalMode).toBeUndefined();
  });
});

describe('createFeatureAgentGraph', () => {
  let checkpointer: MemorySaver;
  let mockExecutor: IAgentExecutor;

  beforeEach(() => {
    checkpointer = new MemorySaver();
    mockExecutor = createMockExecutor();
    mockReadFileSync.mockReset();
  });

  it('should create a compiled graph', () => {
    const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);
    expect(compiled).toBeDefined();
  });

  it('should work without a checkpointer', () => {
    const compiled = createFeatureAgentGraph(mockExecutor);
    expect(compiled).toBeDefined();
  });

  describe('graph structure', () => {
    it('should have all 5 nodes', () => {
      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);
      const graphRepr = compiled.getGraph();
      const nodeIds = Object.keys(graphRepr.nodes);

      expect(nodeIds).toContain('analyze');
      expect(nodeIds).toContain('requirements');
      expect(nodeIds).toContain('research');
      expect(nodeIds).toContain('plan');
      expect(nodeIds).toContain('implement');
    });

    it('should have linear flow from START to END', () => {
      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);
      const graphRepr = compiled.getGraph();

      const edgePairs = graphRepr.edges.map((e) => [e.source, e.target]);

      expect(edgePairs).toContainEqual(['__start__', 'analyze']);
      expect(edgePairs).toContainEqual(['analyze', 'requirements']);
      expect(edgePairs).toContainEqual(['requirements', 'research']);
      expect(edgePairs).toContainEqual(['research', 'plan']);
      expect(edgePairs).toContainEqual(['plan', 'implement']);
      expect(edgePairs).toContainEqual(['implement', '__end__']);
    });
  });

  describe('node execution with executor', () => {
    it('should call executor.execute for each node', async () => {
      mockReadFileSync.mockReturnValue('name: test-feature\ndescription: A test feature');

      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);

      const result = await compiled.invoke(
        {
          featureId: 'feat-123',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/repo/specs/001-test-feature',
        },
        { configurable: { thread_id: 'test-thread-1' } }
      );

      // 4 nodes call executor (implement is a placeholder that skips it)
      expect(mockExecutor.execute).toHaveBeenCalledTimes(4);
      expect(result.currentNode).toBe('implement');
      expect(result.messages).toContainEqual(expect.stringContaining('[analyze]'));
      expect(result.error).toBeNull();
    });

    it('should handle executor errors gracefully', async () => {
      mockReadFileSync.mockReturnValue('name: test');
      (mockExecutor.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Executor failed')
      );

      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);

      const result = await compiled.invoke(
        {
          featureId: 'feat-err',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/specs/001-test',
        },
        { configurable: { thread_id: 'err-thread' } }
      );

      expect(result.error).toContain('Executor failed');
      expect(result.messages).toContainEqual(expect.stringContaining('[analyze] Error'));
    });
  });

  describe('full graph execution', () => {
    it('should execute all nodes and accumulate messages', async () => {
      mockReadFileSync.mockReturnValue('name: full-test\ndescription: Full workflow test');

      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);
      const result = await compiled.invoke(
        {
          featureId: 'feat-full',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/specs/001-full',
        },
        { configurable: { thread_id: 'full-thread' } }
      );

      const nodeNames = ['analyze', 'requirements', 'research', 'plan', 'implement'];
      for (const name of nodeNames) {
        expect(result.messages.some((m: string) => m.includes(`[${name}]`))).toBe(true);
      }
      expect(result.messages.length).toBeGreaterThanOrEqual(5);
      expect(result.currentNode).toBe('implement');
      expect(result.error).toBeNull();
    });
  });

  describe('interrupt behavior with approvalMode', () => {
    it('should interrupt after first node in interactive mode', async () => {
      mockReadFileSync.mockReturnValue('name: test');
      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);
      const config = { configurable: { thread_id: 'interrupt-thread-1' } };

      const result = await compiled.invoke(
        {
          featureId: 'feat-interrupt',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/specs/001-test',
          approvalMode: 'interactive',
        },
        config
      );

      // Analyze runs then interrupt fires (executor called once, state update not committed)
      expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
      // interrupt() throws GraphInterrupt AFTER execution, so node return is not committed
      // The __interrupt__ payload contains the node info
      const interruptPayload = (result as Record<string, unknown>).__interrupt__ as {
        value: { node: string };
      }[];
      expect(interruptPayload).toBeDefined();
      expect(interruptPayload[0].value.node).toBe('analyze');
    });

    it('should resume after approval in interactive mode', async () => {
      mockReadFileSync.mockReturnValue('name: test');
      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);
      const config = { configurable: { thread_id: 'resume-thread-1' } };

      // First invocation - interrupts after analyze
      await compiled.invoke(
        {
          featureId: 'feat-resume',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/specs/001-test',
          approvalMode: 'interactive',
        },
        config
      );

      expect(mockExecutor.execute).toHaveBeenCalledTimes(1);

      // Resume: analyze re-executes (interrupt() returns resume value),
      // then requirements executes and interrupts
      const resumed = await compiled.invoke(new Command({ resume: { approved: true } }), config);

      // 1 (original analyze) + 1 (analyze re-run on resume) + 1 (requirements) = 3
      expect(mockExecutor.execute).toHaveBeenCalledTimes(3);
      const interruptPayload = (resumed as Record<string, unknown>).__interrupt__ as {
        value: { node: string };
      }[];
      expect(interruptPayload).toBeDefined();
      expect(interruptPayload[0].value.node).toBe('requirements');
    });

    it('should not interrupt in allow-all mode', async () => {
      mockReadFileSync.mockReturnValue('name: test');
      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);
      const config = { configurable: { thread_id: 'no-interrupt-thread' } };

      const result = await compiled.invoke(
        {
          featureId: 'feat-all',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/specs/001-test',
          approvalMode: 'allow-all',
        },
        config
      );

      // 4 nodes call executor (implement is a placeholder that skips it)
      expect(mockExecutor.execute).toHaveBeenCalledTimes(4);
      expect(result.currentNode).toBe('implement');
    });

    it('should interrupt at research in allow-prd mode', async () => {
      mockReadFileSync.mockReturnValue('name: test');
      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);
      const config = { configurable: { thread_id: 'allow-prd-thread' } };

      const result = await compiled.invoke(
        {
          featureId: 'feat-prd',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/specs/001-test',
          approvalMode: 'allow-prd',
        },
        config
      );

      // analyze + requirements auto-approved, research executes then interrupts
      expect(mockExecutor.execute).toHaveBeenCalledTimes(3);
      const interruptPayload = (result as Record<string, unknown>).__interrupt__ as {
        value: { node: string };
      }[];
      expect(interruptPayload).toBeDefined();
      expect(interruptPayload[0].value.node).toBe('research');
    });

    it('should complete without interrupt in allow-plan mode (implement is placeholder)', async () => {
      mockReadFileSync.mockReturnValue('name: test');
      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);
      const config = { configurable: { thread_id: 'allow-plan-thread' } };

      const result = await compiled.invoke(
        {
          featureId: 'feat-plan',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/specs/001-test',
          approvalMode: 'allow-plan',
        },
        config
      );

      // 4 nodes call executor (implement is a placeholder, skips executor and interrupt)
      expect(mockExecutor.execute).toHaveBeenCalledTimes(4);
      expect(result.currentNode).toBe('implement');
      // No interrupt since implement placeholder doesn't call shouldInterrupt
      const interruptPayload = (result as Record<string, unknown>).__interrupt__;
      expect(interruptPayload).toBeUndefined();
    });
  });

  describe('state persistence with checkpointer', () => {
    it('should persist state across invocations via checkpointer', async () => {
      mockReadFileSync.mockReturnValue('name: persist-test');

      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);

      await compiled.invoke(
        {
          featureId: 'feat-persist',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/repo/specs/001-persist',
        },
        { configurable: { thread_id: 'persist-thread' } }
      );

      const state = await compiled.getState({
        configurable: { thread_id: 'persist-thread' },
      });

      expect(state.values.featureId).toBe('feat-persist');
      expect(state.values.messages.length).toBeGreaterThan(0);
    });
  });
});
