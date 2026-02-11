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

describe('FeatureAgentAnnotation', () => {
  it('should be a valid Annotation root', () => {
    expect(FeatureAgentAnnotation).toBeDefined();
    expect(FeatureAgentAnnotation.spec).toBeDefined();
  });
});

describe('createFeatureAgentGraph', () => {
  let checkpointer: MemorySaver;

  beforeEach(() => {
    checkpointer = new MemorySaver();
    mockReadFileSync.mockReset();
  });

  it('should create a compiled graph', () => {
    const compiled = createFeatureAgentGraph(checkpointer);
    expect(compiled).toBeDefined();
  });

  it('should work without a checkpointer', () => {
    const compiled = createFeatureAgentGraph();
    expect(compiled).toBeDefined();
  });

  describe('graph structure', () => {
    it('should have all 5 nodes', () => {
      const compiled = createFeatureAgentGraph(checkpointer);
      const graphRepr = compiled.getGraph();
      // getGraph().nodes is a record/object keyed by node id
      const nodeIds = Object.keys(graphRepr.nodes);

      expect(nodeIds).toContain('analyze');
      expect(nodeIds).toContain('requirements');
      expect(nodeIds).toContain('research');
      expect(nodeIds).toContain('plan');
      expect(nodeIds).toContain('implement');
    });

    it('should have linear flow from START to END', () => {
      const compiled = createFeatureAgentGraph(checkpointer);
      const graphRepr = compiled.getGraph();

      // edges is an array of Edge objects with source/target
      const edgePairs = graphRepr.edges.map((e) => [e.source, e.target]);

      expect(edgePairs).toContainEqual(['__start__', 'analyze']);
      expect(edgePairs).toContainEqual(['analyze', 'requirements']);
      expect(edgePairs).toContainEqual(['requirements', 'research']);
      expect(edgePairs).toContainEqual(['research', 'plan']);
      expect(edgePairs).toContainEqual(['plan', 'implement']);
      expect(edgePairs).toContainEqual(['implement', '__end__']);
    });
  });

  describe('analyze node', () => {
    it('should read spec.yaml and return analysis message', async () => {
      mockReadFileSync.mockReturnValue('name: test-feature\ndescription: A test feature');

      const compiled = createFeatureAgentGraph(checkpointer);

      const result = await compiled.invoke(
        {
          featureId: 'feat-123',
          repositoryPath: '/test/repo',
          specDir: '/test/repo/specs/001-test-feature',
        },
        { configurable: { thread_id: 'test-thread-1' } }
      );

      expect(mockReadFileSync).toHaveBeenCalledWith(
        '/test/repo/specs/001-test-feature/spec.yaml',
        'utf-8'
      );
      expect(result.currentNode).toBe('implement'); // last node in the chain
      expect(result.messages).toContainEqual(expect.stringContaining('[analyze]'));
      expect(result.error).toBeNull();
    });

    it('should handle missing spec.yaml gracefully', async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const compiled = createFeatureAgentGraph(checkpointer);

      const result = await compiled.invoke(
        {
          featureId: 'feat-123',
          repositoryPath: '/test/repo',
          specDir: '/test/repo/specs/001-missing',
        },
        { configurable: { thread_id: 'test-thread-2' } }
      );

      expect(result.error).toContain('ENOENT');
      expect(result.messages).toContainEqual(expect.stringContaining('[analyze]'));
    });
  });

  describe('requirements node', () => {
    it('should read spec and generate requirements summary', async () => {
      mockReadFileSync.mockReturnValue('name: test\ndescription: Test feature');

      const compiled = createFeatureAgentGraph(checkpointer);
      const result = await compiled.invoke(
        {
          featureId: 'feat-req',
          repositoryPath: '/test/repo',
          specDir: '/test/specs/001-test',
        },
        { configurable: { thread_id: 'req-thread' } }
      );

      expect(result.messages.some((m: string) => m.includes('[requirements]'))).toBe(true);
    });

    it('should detect success criteria in spec', async () => {
      mockReadFileSync.mockReturnValue('name: test\nSuccess Criteria:\n  - criterion 1');

      const compiled = createFeatureAgentGraph(checkpointer);
      const result = await compiled.invoke(
        {
          featureId: 'feat-req-sc',
          repositoryPath: '/test/repo',
          specDir: '/test/specs/001-test-sc',
        },
        { configurable: { thread_id: 'req-sc-thread' } }
      );

      expect(result.messages.some((m: string) => m.includes('success criteria found'))).toBe(true);
    });
  });

  describe('research node', () => {
    it('should add research message to state', async () => {
      mockReadFileSync.mockReturnValue('name: test\nsummary: Test');

      const compiled = createFeatureAgentGraph(checkpointer);
      const result = await compiled.invoke(
        {
          featureId: 'feat-res',
          repositoryPath: '/test/repo',
          specDir: '/test/specs/001-test',
        },
        { configurable: { thread_id: 'res-thread' } }
      );

      expect(result.messages.some((m: string) => m.includes('[research]'))).toBe(true);
    });
  });

  describe('plan node', () => {
    it('should add plan message to state', async () => {
      mockReadFileSync.mockReturnValue('name: test');

      const compiled = createFeatureAgentGraph(checkpointer);
      const result = await compiled.invoke(
        {
          featureId: 'feat-plan',
          repositoryPath: '/test/repo',
          specDir: '/test/specs/001-test',
        },
        { configurable: { thread_id: 'plan-thread' } }
      );

      expect(result.messages.some((m: string) => m.includes('[plan]'))).toBe(true);
    });
  });

  describe('implement node', () => {
    it('should add implement message to state', async () => {
      mockReadFileSync.mockReturnValue('name: test');

      const compiled = createFeatureAgentGraph(checkpointer);
      const result = await compiled.invoke(
        {
          featureId: 'feat-impl',
          repositoryPath: '/test/repo',
          specDir: '/test/specs/001-test',
        },
        { configurable: { thread_id: 'impl-thread' } }
      );

      expect(result.messages.some((m: string) => m.includes('[implement]'))).toBe(true);
    });
  });

  describe('full graph execution', () => {
    it('should execute all nodes in order and accumulate messages', async () => {
      mockReadFileSync.mockReturnValue('name: full-test\ndescription: Full workflow test');

      const compiled = createFeatureAgentGraph(checkpointer);
      const result = await compiled.invoke(
        {
          featureId: 'feat-full',
          repositoryPath: '/test/repo',
          specDir: '/test/specs/001-full',
        },
        { configurable: { thread_id: 'full-thread' } }
      );

      // All 5 nodes should have executed
      const nodeNames = ['analyze', 'requirements', 'research', 'plan', 'implement'];
      for (const name of nodeNames) {
        expect(result.messages.some((m: string) => m.includes(`[${name}]`))).toBe(true);
      }
      expect(result.messages.length).toBeGreaterThanOrEqual(5);
      expect(result.currentNode).toBe('implement');
      expect(result.error).toBeNull();
    });

    it('should accumulate messages from all nodes via reducer', async () => {
      mockReadFileSync.mockReturnValue('name: test');

      const compiled = createFeatureAgentGraph(checkpointer);
      const result = await compiled.invoke(
        {
          featureId: 'feat-123',
          repositoryPath: '/test/repo',
          specDir: '/test/repo/specs/001-test',
        },
        { configurable: { thread_id: 'test-thread-4' } }
      );

      // 1 message from each node = at least 5
      expect(result.messages.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('state persistence with checkpointer', () => {
    it('should persist state across invocations via checkpointer', async () => {
      mockReadFileSync.mockReturnValue('name: persist-test');

      const compiled = createFeatureAgentGraph(checkpointer);

      await compiled.invoke(
        {
          featureId: 'feat-persist',
          repositoryPath: '/test/repo',
          specDir: '/test/repo/specs/001-persist',
        },
        { configurable: { thread_id: 'persist-thread' } }
      );

      // Get the state for the thread
      const state = await compiled.getState({
        configurable: { thread_id: 'persist-thread' },
      });

      expect(state.values.featureId).toBe('feat-persist');
      expect(state.values.messages.length).toBeGreaterThan(0);
    });
  });
});
