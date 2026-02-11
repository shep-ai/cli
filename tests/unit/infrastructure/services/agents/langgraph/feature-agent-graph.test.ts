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
import { MemorySaver } from '@langchain/langgraph';
import type { IAgentExecutor } from '../../../../../../src/application/ports/output/agent-executor.interface.js';
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
      sessionId: 'mock-session-1',
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

      // 5 nodes = 5 executor calls
      expect(mockExecutor.execute).toHaveBeenCalledTimes(5);
      expect(result.currentNode).toBe('implement');
      expect(result.messages).toContainEqual(expect.stringContaining('[analyze]'));
      expect(result.error).toBeNull();
    });

    it('should propagate sessionId through nodes', async () => {
      mockReadFileSync.mockReturnValue('name: test');

      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);

      const result = await compiled.invoke(
        {
          featureId: 'feat-session',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/specs/001-test',
        },
        { configurable: { thread_id: 'session-thread' } }
      );

      expect(result.sessionId).toBe('mock-session-1');
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
