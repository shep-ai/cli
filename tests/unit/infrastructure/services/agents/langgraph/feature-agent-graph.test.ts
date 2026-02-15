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
const { mockReadFileSync, mockWriteFileSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    default: { ...actual, readFileSync: mockReadFileSync, writeFileSync: mockWriteFileSync },
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
  };
});

const MOCK_PLAN_YAML = `name: test
phases:
  - id: phase-1
    name: 'Test Phase'
    parallel: false
    taskIds:
      - task-1
`;

const MOCK_TASKS_YAML = `name: test
tasks:
  - id: task-1
    title: Test Task
    description: A test task
    state: Todo
    dependencies: []
    acceptanceCriteria:
      - It works
    tdd: null
    estimatedEffort: 15min
`;

const MOCK_FEATURE_YAML = `feature:
  id: test
status:
  phase: planning
  progress:
    completed: 0
    total: 1
    percentage: 0
`;

/**
 * Set up mockReadFileSync to return valid YAML for all spec files.
 * Returns 'name: test' for spec/research, and proper structured YAML
 * for plan/tasks/feature so the implement node can parse them.
 */
function setupSpecFileMocks(): void {
  mockReadFileSync.mockImplementation((path: string) => {
    if (typeof path === 'string') {
      if (path.endsWith('plan.yaml')) return MOCK_PLAN_YAML;
      if (path.endsWith('tasks.yaml')) return MOCK_TASKS_YAML;
      if (path.endsWith('feature.yaml')) return MOCK_FEATURE_YAML;
    }
    return 'name: test\ndescription: A test feature';
  });
}

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

describe('FeatureAgentAnnotation - approvalGates', () => {
  it('should support approvalGates in state', async () => {
    const mockExec = createMockExecutor();
    setupSpecFileMocks();
    const checkpointer = new MemorySaver();
    const compiled = createFeatureAgentGraph(mockExec, checkpointer);

    const result = await compiled.invoke(
      {
        featureId: 'feat-approval',
        repositoryPath: '/test/repo',
        worktreePath: '/test/repo',
        specDir: '/test/specs/001-test',
        approvalGates: { allowPrd: false, allowPlan: false },
      },
      { configurable: { thread_id: 'approval-thread' } }
    );

    expect(result.approvalGates).toEqual({ allowPrd: false, allowPlan: false });
  });

  it('should default approvalGates to undefined when not provided', async () => {
    const mockExec = createMockExecutor();
    setupSpecFileMocks();
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

    expect(result.approvalGates).toBeUndefined();
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
      setupSpecFileMocks();

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

      // 4 earlier nodes + 1 implement phase = 5 executor calls
      expect(mockExecutor.execute).toHaveBeenCalledTimes(5);
      expect(result.currentNode).toBe('implement');
      expect(result.messages).toContainEqual(expect.stringContaining('[analyze]'));
      expect(result.error).toBeNull();
    });

    it('should throw on executor errors for resumability', async () => {
      setupSpecFileMocks();
      (mockExecutor.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Executor failed')
      );

      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);

      // Nodes now throw errors so LangGraph does NOT checkpoint them,
      // enabling resume to re-execute from the last successful node.
      await expect(
        compiled.invoke(
          {
            featureId: 'feat-err',
            repositoryPath: '/test/repo',
            worktreePath: '/test/repo',
            specDir: '/test/specs/001-test',
          },
          { configurable: { thread_id: 'err-thread' } }
        )
      ).rejects.toThrow('Executor failed');
    });
  });

  describe('full graph execution', () => {
    it('should execute all nodes and accumulate messages', async () => {
      setupSpecFileMocks();

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

  describe('interrupt behavior with approvalGates', () => {
    it('should interrupt after requirements in interactive gates', async () => {
      setupSpecFileMocks();
      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);
      const config = { configurable: { thread_id: 'interrupt-thread-1' } };

      const result = await compiled.invoke(
        {
          featureId: 'feat-interrupt',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/specs/001-test',
          approvalGates: { allowPrd: false, allowPlan: false },
        },
        config
      );

      // analyze runs (no gate), requirements runs then interrupt fires
      expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
      const interruptPayload = (result as Record<string, unknown>).__interrupt__ as {
        value: { node: string };
      }[];
      expect(interruptPayload).toBeDefined();
      expect(interruptPayload[0].value.node).toBe('requirements');
    });

    it('should resume after approval in interactive gates', async () => {
      setupSpecFileMocks();
      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);
      const config = { configurable: { thread_id: 'resume-thread-1' } };

      // First invocation - interrupts after requirements
      await compiled.invoke(
        {
          featureId: 'feat-resume',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/specs/001-test',
          approvalGates: { allowPrd: false, allowPlan: false },
        },
        config
      );

      expect(mockExecutor.execute).toHaveBeenCalledTimes(2);

      // Resume: requirements re-executes (interrupt() returns resume value),
      // then research runs, then plan interrupts
      const resumed = await compiled.invoke(new Command({ resume: { approved: true } }), config);

      // 2 (original) + 1 (requirements re-run) + 1 (research) + 1 (plan) = 5
      expect(mockExecutor.execute).toHaveBeenCalledTimes(5);
      const interruptPayload = (resumed as Record<string, unknown>).__interrupt__ as {
        value: { node: string };
      }[];
      expect(interruptPayload).toBeDefined();
      expect(interruptPayload[0].value.node).toBe('plan');
    });

    it('should not interrupt when no gates (undefined)', async () => {
      setupSpecFileMocks();
      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);
      const config = { configurable: { thread_id: 'no-interrupt-thread' } };

      const result = await compiled.invoke(
        {
          featureId: 'feat-all',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/specs/001-test',
        },
        config
      );

      // 4 earlier nodes + 1 implement phase = 5 executor calls
      expect(mockExecutor.execute).toHaveBeenCalledTimes(5);
      expect(result.currentNode).toBe('implement');
    });

    it('should not interrupt with allow-all gates', async () => {
      setupSpecFileMocks();
      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);
      const config = { configurable: { thread_id: 'allow-all-thread' } };

      const result = await compiled.invoke(
        {
          featureId: 'feat-all-gates',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/specs/001-test',
          approvalGates: { allowPrd: true, allowPlan: true },
        },
        config
      );

      expect(mockExecutor.execute).toHaveBeenCalledTimes(5);
      expect(result.currentNode).toBe('implement');
    });

    it('should interrupt at plan in allow-prd gates', async () => {
      setupSpecFileMocks();
      const compiled = createFeatureAgentGraph(mockExecutor, checkpointer);
      const config = { configurable: { thread_id: 'allow-prd-thread' } };

      const result = await compiled.invoke(
        {
          featureId: 'feat-prd',
          repositoryPath: '/test/repo',
          worktreePath: '/test/repo',
          specDir: '/test/specs/001-test',
          approvalGates: { allowPrd: true, allowPlan: false },
        },
        config
      );

      // analyze + requirements + research auto-approved, plan executes then interrupts
      expect(mockExecutor.execute).toHaveBeenCalledTimes(4);
      const interruptPayload = (result as Record<string, unknown>).__interrupt__ as {
        value: { node: string };
      }[];
      expect(interruptPayload).toBeDefined();
      expect(interruptPayload[0].value.node).toBe('plan');
    });
  });

  describe('state persistence with checkpointer', () => {
    it('should persist state across invocations via checkpointer', async () => {
      setupSpecFileMocks();

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
