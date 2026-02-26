/**
 * Merge Node Unit Tests (Agent-Driven)
 *
 * Tests for the rewritten merge node which uses IAgentExecutor
 * instead of IGitPrService for commit/push/PR/merge operations.
 *
 * Covers:
 * - Two agent executor calls with correct prompts
 * - Conditional push/PR logic
 * - Approval gate behavior (interrupt when !allowMerge)
 * - Feature lifecycle update after merge
 * - Error handling (re-throw for LangGraph checkpoint/resume)
 *
 * TDD Phase: RED → GREEN
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Suppress logger output
vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

const {
  mockInterrupt,
  mockShouldInterrupt,
  mockGetCompletedPhases,
  mockClearCompletedPhase,
  mockMarkPhaseComplete,
  mockRecordPhaseStart,
  mockRecordPhaseEnd,
  mockRecordApprovalWaitStart,
  mockBuildCommitPushPrPrompt,
  mockBuildMergeSquashPrompt,
  mockParseCommitHash,
  mockParsePrUrl,
  mockCleanupExecute,
} = vi.hoisted(() => ({
  mockInterrupt: vi.fn(),
  mockShouldInterrupt: vi.fn().mockReturnValue(false),
  mockGetCompletedPhases: vi.fn().mockReturnValue([]),
  mockClearCompletedPhase: vi.fn(),
  mockMarkPhaseComplete: vi.fn(),
  mockRecordPhaseStart: vi.fn().mockResolvedValue('timing-123'),
  mockRecordPhaseEnd: vi.fn().mockResolvedValue(undefined),
  mockRecordApprovalWaitStart: vi.fn().mockResolvedValue(undefined),
  mockBuildCommitPushPrPrompt: vi.fn().mockReturnValue('commit-push-pr prompt'),
  mockBuildMergeSquashPrompt: vi.fn().mockReturnValue('merge-squash prompt'),
  mockParseCommitHash: vi.fn().mockReturnValue('abc1234'),
  mockParsePrUrl: vi
    .fn()
    .mockReturnValue({ url: 'https://github.com/test/repo/pull/42', number: 42 }),
  mockCleanupExecute: vi.fn().mockResolvedValue(undefined),
}));

// Mock LangGraph interrupt
vi.mock('@langchain/langgraph', () => ({
  interrupt: mockInterrupt,
  isGraphBubbleUp: vi.fn().mockReturnValue(false),
}));

// Mock node-helpers
vi.mock('@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js', () => ({
  createNodeLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
  }),
  readSpecFile: vi.fn().mockReturnValue('name: Test Feature\ndescription: A test\n'),
  shouldInterrupt: mockShouldInterrupt,
  getCompletedPhases: mockGetCompletedPhases,
  clearCompletedPhase: mockClearCompletedPhase,
  markPhaseComplete: mockMarkPhaseComplete,
  retryExecute: vi
    .fn()
    .mockImplementation(
      async (executor: { execute: (p: string) => Promise<unknown> }, prompt: string) => {
        return executor.execute(prompt);
      }
    ),
  buildExecutorOptions: vi.fn().mockReturnValue({ cwd: '/tmp/worktree', maxTurns: 50 }),
}));

// Mock heartbeat
vi.mock('@/infrastructure/services/agents/feature-agent/heartbeat.js', () => ({
  reportNodeStart: vi.fn(),
}));

// Mock phase timing
vi.mock('@/infrastructure/services/agents/feature-agent/phase-timing-context.js', () => ({
  recordPhaseStart: mockRecordPhaseStart,
  recordPhaseEnd: mockRecordPhaseEnd,
  recordApprovalWaitStart: mockRecordApprovalWaitStart,
}));

// Mock lifecycle context
vi.mock('@/infrastructure/services/agents/feature-agent/lifecycle-context.js', () => ({
  updateNodeLifecycle: vi.fn().mockResolvedValue(undefined),
}));

// Mock prompt builders
vi.mock('@/infrastructure/services/agents/feature-agent/nodes/prompts/merge-prompts.js', () => ({
  buildCommitPushPrPrompt: mockBuildCommitPushPrPrompt,
  buildMergeSquashPrompt: mockBuildMergeSquashPrompt,
}));

// Mock output parser
vi.mock(
  '@/infrastructure/services/agents/feature-agent/nodes/merge/merge-output-parser.js',
  () => ({
    parseCommitHash: mockParseCommitHash,
    parsePrUrl: mockParsePrUrl,
  })
);

// Mock settings service — required by CI watch/fix loop when push || openPr is true
vi.mock('@/infrastructure/services/settings.service.js', () => ({
  getSettings: vi.fn().mockReturnValue({
    workflow: { ciMaxFixAttempts: 3, ciWatchTimeoutMs: 600_000, ciLogMaxChars: 50_000 },
  }),
}));

import {
  createMergeNode,
  type MergeNodeDeps,
} from '@/infrastructure/services/agents/feature-agent/nodes/merge/merge.node.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { DiffSummary } from '@/application/ports/output/services/git-pr-service.interface.js';

function createMockExecutor(): IAgentExecutor {
  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockResolvedValue({ result: 'Agent completed all operations successfully' }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };
}

function createMockFeatureRepo(): MergeNodeDeps['featureRepository'] {
  return {
    findById: vi.fn().mockResolvedValue({
      id: 'feat-001',
      lifecycle: 'Implementation',
      branch: 'feat/test',
    }),
    update: vi.fn().mockResolvedValue(undefined),
  } as any;
}

function createMockGetDiffSummary(): MergeNodeDeps['getDiffSummary'] {
  return vi.fn().mockResolvedValue({
    filesChanged: 5,
    additions: 100,
    deletions: 20,
    commitCount: 3,
  } satisfies DiffSummary);
}

function baseDeps(overrides?: Partial<MergeNodeDeps>): MergeNodeDeps {
  return {
    executor: createMockExecutor(),
    getDiffSummary: createMockGetDiffSummary(),
    hasRemote: vi.fn().mockResolvedValue(true),
    getDefaultBranch: vi.fn().mockResolvedValue('main'),
    featureRepository: createMockFeatureRepo(),
    verifyMerge: vi.fn().mockResolvedValue(true),
    gitPrService: {
      getCiStatus: vi.fn().mockResolvedValue({ status: 'success', runUrl: null }),
      watchCi: vi.fn().mockResolvedValue({ status: 'success' }),
      getFailureLogs: vi.fn().mockResolvedValue(''),
    } as any,
    cleanupFeatureWorktreeUseCase: { execute: mockCleanupExecute } as any,
    ...overrides,
  };
}

function baseState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
  return {
    featureId: 'feat-001',
    repositoryPath: '/tmp/repo',
    worktreePath: '/tmp/worktree',
    specDir: '/tmp/specs',
    currentNode: 'implement',
    error: null,
    messages: [],
    approvalGates: undefined,
    validationRetries: 0,
    lastValidationTarget: '',
    lastValidationErrors: [],
    prUrl: null,
    prNumber: null,
    commitHash: null,
    ciStatus: null,
    push: false,
    openPr: false,
    ...overrides,
  } as FeatureAgentState;
}

describe('createMergeNode (agent-driven)', () => {
  let deps: MergeNodeDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = baseDeps();
  });

  // --- Agent executor calls ---
  describe('agent executor calls', () => {
    it('should make first agent call with commit-push-pr prompt', async () => {
      const node = createMergeNode(deps);
      const state = baseState();
      await node(state);

      expect(mockBuildCommitPushPrPrompt).toHaveBeenCalledWith(
        expect.objectContaining({ featureId: 'feat-001' }),
        expect.any(String),
        'main'
      );
      // retryExecute wraps executor.execute — verify it was called via the mock
      expect(deps.executor.execute).toHaveBeenCalledWith('commit-push-pr prompt');
    });

    it('should parse commit hash and PR URL from first agent call result', async () => {
      const node = createMergeNode(deps);
      const state = baseState();
      const result = await node(state);

      expect(mockParseCommitHash).toHaveBeenCalledWith(
        'Agent completed all operations successfully'
      );
      expect(result.commitHash).toBe('abc1234');
    });

    it('should parse PR URL from first call when openPr=true', async () => {
      const node = createMergeNode(deps);
      const state = baseState({ openPr: true });
      const result = await node(state);

      expect(mockParsePrUrl).toHaveBeenCalled();
      expect(result.prUrl).toBe('https://github.com/test/repo/pull/42');
      expect(result.prNumber).toBe(42);
    });

    it('should make second agent call with merge-squash prompt when allowMerge=true', async () => {
      const node = createMergeNode(deps);
      const state = baseState({
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
      });
      await node(state);

      expect(mockBuildMergeSquashPrompt).toHaveBeenCalled();
      // Two calls: first for commit/push/PR, second for merge
      expect(deps.executor.execute).toHaveBeenCalledTimes(2);
    });

    it('should NOT make second agent call when allowMerge is not true', async () => {
      const node = createMergeNode(deps);
      const state = baseState();
      await node(state);

      // Only one call for commit/push/PR
      expect(deps.executor.execute).toHaveBeenCalledTimes(1);
      expect(mockBuildMergeSquashPrompt).not.toHaveBeenCalled();
    });

    it('should pass hasRemote=false to merge prompt when no remote configured', async () => {
      const noRemoteDeps = baseDeps({ hasRemote: vi.fn().mockResolvedValue(false) });
      const node = createMergeNode(noRemoteDeps);
      const state = baseState({
        push: true,
        openPr: true,
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
      });
      await node(state);

      expect(mockBuildMergeSquashPrompt).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        'main',
        false
      );
    });

    it('should pass hasRemote=true to merge prompt when remote is configured', async () => {
      const node = createMergeNode(deps);
      const state = baseState({
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
      });
      await node(state);

      expect(mockBuildMergeSquashPrompt).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        'main',
        true
      );
    });
  });

  // --- Conditional push/PR logic ---
  describe('conditional push/PR logic', () => {
    it('should pass push=false state to prompt builder when push=false and openPr=false', async () => {
      const node = createMergeNode(deps);
      const state = baseState({ push: false, openPr: false });
      await node(state);

      expect(mockBuildCommitPushPrPrompt).toHaveBeenCalledWith(
        expect.objectContaining({ push: false, openPr: false }),
        expect.any(String),
        'main'
      );
    });

    it('should pass push=true state to prompt builder when push=true', async () => {
      const node = createMergeNode(deps);
      const state = baseState({ push: true });
      await node(state);

      expect(mockBuildCommitPushPrPrompt).toHaveBeenCalledWith(
        expect.objectContaining({ push: true }),
        expect.any(String),
        'main'
      );
    });

    it('should pass openPr=true state to prompt builder when openPr=true', async () => {
      const node = createMergeNode(deps);
      const state = baseState({ openPr: true });
      await node(state);

      expect(mockBuildCommitPushPrPrompt).toHaveBeenCalledWith(
        expect.objectContaining({ openPr: true }),
        expect.any(String),
        'main'
      );
    });

    it('should override push and openPr to false when no remote is configured', async () => {
      const noRemoteDeps = baseDeps({ hasRemote: vi.fn().mockResolvedValue(false) });
      const node = createMergeNode(noRemoteDeps);
      const state = baseState({ push: true, openPr: true });
      await node(state);

      expect(mockBuildCommitPushPrPrompt).toHaveBeenCalledWith(
        expect.objectContaining({ push: false, openPr: false }),
        expect.any(String),
        'main'
      );
      expect(mockParsePrUrl).not.toHaveBeenCalled();
    });

    it('should NOT parse prUrl when openPr=false', async () => {
      const node = createMergeNode(deps);
      const state = baseState({ openPr: false });
      const result = await node(state);

      expect(mockParsePrUrl).not.toHaveBeenCalled();
      expect(result.prUrl).toBeNull();
      expect(result.prNumber).toBeNull();
    });
  });

  // --- Approval gate behavior ---
  describe('approval gate (interrupt)', () => {
    it('should interrupt with diff summary when shouldInterrupt returns true', async () => {
      mockShouldInterrupt.mockReturnValueOnce(true);
      const node = createMergeNode(deps);
      const state = baseState({
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
      });
      await node(state);

      expect(deps.getDiffSummary).toHaveBeenCalledWith('/tmp/worktree', 'main');
      expect(mockInterrupt).toHaveBeenCalledWith(
        expect.objectContaining({
          node: 'merge',
          diffSummary: expect.objectContaining({ filesChanged: 5 }),
        })
      );
    });

    it('should NOT call getDiffSummary when shouldInterrupt returns false', async () => {
      mockShouldInterrupt.mockReturnValueOnce(false);
      const node = createMergeNode(deps);
      const state = baseState();
      await node(state);

      expect(deps.getDiffSummary).not.toHaveBeenCalled();
    });

    it('should record phase timing before interrupt', async () => {
      mockShouldInterrupt.mockReturnValueOnce(true);
      const node = createMergeNode(deps);
      const state = baseState({
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
      });
      await node(state);

      expect(mockRecordPhaseEnd).toHaveBeenCalledWith('timing-123', expect.any(Number));
      expect(mockRecordApprovalWaitStart).toHaveBeenCalledWith('timing-123');
    });
  });

  // --- Feature lifecycle update ---
  describe('lifecycle transition', () => {
    it('should update feature to Review lifecycle when not merged', async () => {
      const node = createMergeNode(deps);
      const state = baseState();
      await node(state);

      expect(deps.featureRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: 'Review' })
      );
    });

    it('should update feature to Maintain lifecycle when allowMerge=true', async () => {
      const node = createMergeNode(deps);
      const state = baseState({
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
      });
      await node(state);

      expect(deps.featureRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: 'Maintain' })
      );
    });

    it('should return messages about merge node completion', async () => {
      const node = createMergeNode(deps);
      const state = baseState();
      const result = await node(state);

      expect(result.messages).toBeDefined();
      expect(result.messages!.length).toBeGreaterThan(0);
      expect(result.currentNode).toBe('merge');
    });

    it('should return commitHash in state', async () => {
      const node = createMergeNode(deps);
      const state = baseState();
      const result = await node(state);

      expect(result.commitHash).toBe('abc1234');
    });

    it('should include PR data in feature update when PR was created', async () => {
      const node = createMergeNode(deps);
      const state = baseState({ openPr: true });
      await node(state);

      expect(deps.featureRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          pr: expect.objectContaining({
            url: 'https://github.com/test/repo/pull/42',
            number: 42,
          }),
        })
      );
    });
  });

  // --- Merge verification ---
  describe('merge verification', () => {
    it('should verify merge after local merge (no PR)', async () => {
      const node = createMergeNode(deps);
      const state = baseState({
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
      });
      // Ensure no PR URL is set so local merge path is taken
      mockParsePrUrl.mockReturnValueOnce(null);
      await node(state);

      expect(deps.verifyMerge).toHaveBeenCalledWith('/tmp/repo', 'feat/test', 'main');
    });

    it('should throw when merge verification fails', async () => {
      const failDeps = baseDeps({ verifyMerge: vi.fn().mockResolvedValue(false) });
      const node = createMergeNode(failDeps);
      const state = baseState({
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
      });
      mockParsePrUrl.mockReturnValueOnce(null);

      await expect(node(state)).rejects.toThrow('Merge verification failed');
    });

    it('should skip verification when PR exists (remote merge)', async () => {
      const node = createMergeNode(deps);
      const state = baseState({
        openPr: true,
        prUrl: 'https://github.com/test/repo/pull/99',
        prNumber: 99,
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
      });
      await node(state);

      // PR URL exists from state, so remote merge path is used — no local verification needed
      expect(deps.verifyMerge).not.toHaveBeenCalled();
    });
  });

  // --- Post-merge cleanup ---
  describe('post-merge cleanup', () => {
    it('should call cleanupFeatureWorktreeUseCase.execute with feature id when merged=true', async () => {
      const node = createMergeNode(deps);
      const state = baseState({
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
      });
      await node(state);

      expect(mockCleanupExecute).toHaveBeenCalledOnce();
      expect(mockCleanupExecute).toHaveBeenCalledWith('feat-001');
    });

    it('should NOT call cleanupFeatureWorktreeUseCase.execute when merged=false (no allowMerge)', async () => {
      const node = createMergeNode(deps);
      const state = baseState();
      await node(state);

      expect(mockCleanupExecute).not.toHaveBeenCalled();
    });

    it('should call cleanup after featureRepository.update() when merged=true', async () => {
      const callOrder: string[] = [];
      const orderedFeatureRepo = {
        findById: vi
          .fn()
          .mockResolvedValue({ id: 'feat-001', lifecycle: 'Implementation', branch: 'feat/test' }),
        update: vi.fn().mockImplementation(async () => {
          callOrder.push('update');
        }),
      } as any;
      const orderedCleanup = {
        execute: vi.fn().mockImplementation(async () => {
          callOrder.push('cleanup');
        }),
      } as any;
      const node = createMergeNode(
        baseDeps({
          featureRepository: orderedFeatureRepo,
          cleanupFeatureWorktreeUseCase: orderedCleanup,
        })
      );
      const state = baseState({
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
      });
      mockParsePrUrl.mockReturnValueOnce(null);
      await node(state);

      const updateIdx = callOrder.indexOf('update');
      const cleanupIdx = callOrder.indexOf('cleanup');
      expect(updateIdx).toBeGreaterThanOrEqual(0);
      expect(cleanupIdx).toBeGreaterThan(updateIdx);
    });
  });

  // --- Error handling ---
  describe('error handling', () => {
    it('should throw when first executor call fails (allows LangGraph resume)', async () => {
      (deps.executor.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Agent execution failed')
      );
      const node = createMergeNode(deps);
      const state = baseState();

      await expect(node(state)).rejects.toThrow('Agent execution failed');
    });

    it('should throw when second executor call fails (merge step)', async () => {
      (deps.executor.execute as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ result: 'Commit done' })
        .mockRejectedValueOnce(new Error('Merge conflict'));
      const node = createMergeNode(deps);
      const state = baseState({
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
      });

      await expect(node(state)).rejects.toThrow('Merge conflict');
    });

    it('should record phase timing even when merge fails', async () => {
      (deps.executor.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'));
      const node = createMergeNode(deps);
      const state = baseState();

      await expect(node(state)).rejects.toThrow('Failed');

      expect(mockRecordPhaseStart).toHaveBeenCalledWith('merge');
      expect(mockRecordPhaseEnd).toHaveBeenCalledWith('timing-123', expect.any(Number));
    });
  });
});
