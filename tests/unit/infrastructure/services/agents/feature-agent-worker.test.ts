/**
 * Feature Agent Worker Unit Tests
 *
 * Tests for the background worker entry point that runs as a child process.
 * Validates CLI arg parsing, DI initialization, graph execution, and
 * signal handling.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRunStatus } from '../../../../../src/domain/generated/output.js';
import type { AgentRun } from '../../../../../src/domain/generated/output.js';

// Use vi.hoisted so mock fns are available when vi.mock factories run
const {
  mockInitializeContainer,
  mockResolve,
  mockGraphInvoke,
  mockCreateFeatureAgentGraph,
  mockCreateCheckpointer,
} = vi.hoisted(() => ({
  mockInitializeContainer: vi.fn(),
  mockResolve: vi.fn(),
  mockGraphInvoke: vi.fn(),
  mockCreateFeatureAgentGraph: vi.fn(),
  mockCreateCheckpointer: vi.fn().mockReturnValue({}),
}));

vi.mock('../../../../../src/infrastructure/di/container.js', () => ({
  initializeContainer: () => mockInitializeContainer(),
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock(
  '../../../../../src/infrastructure/services/agents/feature-agent/feature-agent-graph.js',
  () => ({
    createFeatureAgentGraph: (...args: unknown[]) => mockCreateFeatureAgentGraph(...args),
  })
);

vi.mock('../../../../../src/infrastructure/services/agents/common/checkpointer.js', () => ({
  createCheckpointer: (...args: unknown[]) => mockCreateCheckpointer(...args),
}));

import {
  parseWorkerArgs,
  runWorker,
} from '../../../../../src/infrastructure/services/agents/feature-agent/feature-agent-worker.js';

function makeMockRunRepository() {
  const stored = new Map<string, AgentRun>();
  return {
    create: vi.fn().mockImplementation(async (run: AgentRun) => {
      stored.set(run.id, { ...run });
    }),
    findById: vi.fn().mockImplementation(async (id: string) => {
      return stored.get(id) ?? null;
    }),
    findByThreadId: vi.fn().mockResolvedValue(null),
    updateStatus: vi
      .fn()
      .mockImplementation(
        async (id: string, status: AgentRunStatus, updates?: Partial<AgentRun>) => {
          const existing = stored.get(id);
          if (existing) {
            stored.set(id, { ...existing, status, ...updates });
          }
        }
      ),
    findRunningByPid: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

describe('parseWorkerArgs', () => {
  it('should parse all required CLI arguments', () => {
    const args = [
      '--feature-id',
      'feat-123',
      '--run-id',
      'run-456',
      '--repo',
      '/path/to/repo',
      '--spec-dir',
      '/path/to/specs/001-feature',
    ];

    const parsed = parseWorkerArgs(args);

    expect(parsed).toEqual({
      featureId: 'feat-123',
      runId: 'run-456',
      repo: '/path/to/repo',
      specDir: '/path/to/specs/001-feature',
    });
  });

  it('should throw if feature-id is missing', () => {
    const args = ['--run-id', 'run-456', '--repo', '/repo', '--spec-dir', '/specs'];

    expect(() => parseWorkerArgs(args)).toThrow('--feature-id');
  });

  it('should throw if run-id is missing', () => {
    const args = ['--feature-id', 'feat-123', '--repo', '/repo', '--spec-dir', '/specs'];

    expect(() => parseWorkerArgs(args)).toThrow('--run-id');
  });

  it('should throw if repo is missing', () => {
    const args = ['--feature-id', 'feat-123', '--run-id', 'run-456', '--spec-dir', '/specs'];

    expect(() => parseWorkerArgs(args)).toThrow('--repo');
  });

  it('should throw if spec-dir is missing', () => {
    const args = ['--feature-id', 'feat-123', '--run-id', 'run-456', '--repo', '/repo'];

    expect(() => parseWorkerArgs(args)).toThrow('--spec-dir');
  });
});

describe('runWorker', () => {
  let mockRunRepo: ReturnType<typeof makeMockRunRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRunRepo = makeMockRunRepository();
    mockInitializeContainer.mockResolvedValue({ resolve: mockResolve });
    mockResolve.mockReturnValue(mockRunRepo);
    mockGraphInvoke.mockResolvedValue({
      currentNode: 'implement',
      messages: ['[analyze] done', '[implement] done'],
      error: null,
    });
    mockCreateFeatureAgentGraph.mockReturnValue({
      invoke: mockGraphInvoke,
    });
  });

  it('should initialize the DI container', async () => {
    await runWorker({
      featureId: 'feat-1',
      runId: 'run-1',
      repo: '/repo',
      specDir: '/specs',
    });

    expect(mockInitializeContainer).toHaveBeenCalledTimes(1);
  });

  it('should resolve the agent run repository from DI', async () => {
    await runWorker({
      featureId: 'feat-1',
      runId: 'run-1',
      repo: '/repo',
      specDir: '/specs',
    });

    expect(mockResolve).toHaveBeenCalledWith('IAgentRunRepository');
  });

  it('should create a file-based checkpointer', async () => {
    await runWorker({
      featureId: 'feat-1',
      runId: 'run-1',
      repo: '/repo',
      specDir: '/specs',
    });

    expect(mockCreateCheckpointer).toHaveBeenCalledWith(expect.stringContaining('run-1'));
  });

  it('should create the feature agent graph with checkpointer', async () => {
    await runWorker({
      featureId: 'feat-1',
      runId: 'run-1',
      repo: '/repo',
      specDir: '/specs',
    });

    expect(mockCreateFeatureAgentGraph).toHaveBeenCalledWith(expect.anything());
  });

  it('should update agent run status to running', async () => {
    await runWorker({
      featureId: 'feat-1',
      runId: 'run-1',
      repo: '/repo',
      specDir: '/specs',
    });

    expect(mockRunRepo.updateStatus).toHaveBeenCalledWith(
      'run-1',
      AgentRunStatus.running,
      expect.objectContaining({
        pid: process.pid,
      })
    );
  });

  it('should invoke the graph with correct state', async () => {
    await runWorker({
      featureId: 'feat-1',
      runId: 'run-1',
      repo: '/repo',
      specDir: '/specs',
    });

    expect(mockGraphInvoke).toHaveBeenCalledWith(
      {
        featureId: 'feat-1',
        repositoryPath: '/repo',
        specDir: '/specs',
      },
      { configurable: { thread_id: 'run-1' } }
    );
  });

  it('should update agent run status to completed on success', async () => {
    await runWorker({
      featureId: 'feat-1',
      runId: 'run-1',
      repo: '/repo',
      specDir: '/specs',
    });

    expect(mockRunRepo.updateStatus).toHaveBeenCalledWith(
      'run-1',
      AgentRunStatus.completed,
      expect.objectContaining({
        completedAt: expect.any(String),
      })
    );
  });

  it('should update agent run status to failed on error', async () => {
    mockGraphInvoke.mockRejectedValue(new Error('Graph execution failed'));

    await runWorker({
      featureId: 'feat-1',
      runId: 'run-1',
      repo: '/repo',
      specDir: '/specs',
    });

    expect(mockRunRepo.updateStatus).toHaveBeenCalledWith(
      'run-1',
      AgentRunStatus.failed,
      expect.objectContaining({
        error: 'Graph execution failed',
        completedAt: expect.any(String),
      })
    );
  });

  it('should handle graph returning error state', async () => {
    mockGraphInvoke.mockResolvedValue({
      currentNode: 'analyze',
      messages: ['[analyze] Error: ENOENT'],
      error: 'ENOENT: no such file or directory',
    });

    await runWorker({
      featureId: 'feat-1',
      runId: 'run-1',
      repo: '/repo',
      specDir: '/specs',
    });

    expect(mockRunRepo.updateStatus).toHaveBeenCalledWith(
      'run-1',
      AgentRunStatus.failed,
      expect.objectContaining({
        error: 'ENOENT: no such file or directory',
      })
    );
  });
});
