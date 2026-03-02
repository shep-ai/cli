/**
 * Merge Node — Evidence Collection Phase Unit Tests
 *
 * Tests the evidence collection phase inside createMergeNode:
 * - Evidence runs AFTER PR creation and BEFORE CI watch when openPr=true
 * - Evidence skipped when openPr=false
 * - Evidence skipped when prNumber is null (PR creation failed)
 * - Graceful degradation on agent executor failure
 * - CI watch still runs after evidence failure
 * - evidenceStatus appears in interrupt payload
 * - evidenceStatus and evidenceArtifacts appear in return state
 * - Evidence phase does not run on resume after interrupt
 *
 * TDD Phase: RED → write before implementing the evidence phase
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Suppress logger output in tests
vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

// ---- Hoist mocks before imports ----
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
  mockBuildCiWatchFixPrompt,
  mockParseCommitHash,
  mockParsePrUrl,
  mockGetSettings,
  mockBuildEvidencePrompt,
  mockRetryExecute,
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
  mockBuildCiWatchFixPrompt: vi.fn().mockReturnValue('ci-watch-fix prompt'),
  mockParseCommitHash: vi.fn().mockReturnValue('abc1234'),
  mockParsePrUrl: vi
    .fn()
    .mockReturnValue({ url: 'https://github.com/test/repo/pull/42', number: 42 }),
  mockGetSettings: vi.fn().mockReturnValue({
    workflow: {
      ciMaxFixAttempts: 3,
      ciWatchTimeoutMs: 600_000,
      ciLogMaxChars: 50_000,
    },
  }),
  mockBuildEvidencePrompt: vi.fn().mockReturnValue('evidence prompt'),
  mockRetryExecute: vi
    .fn()
    .mockImplementation(
      async (executor: { execute: (p: string) => Promise<unknown> }, prompt: string) =>
        executor.execute(prompt)
    ),
}));

vi.mock('@langchain/langgraph', () => ({
  interrupt: mockInterrupt,
  isGraphBubbleUp: vi.fn().mockReturnValue(false),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js', () => ({
  createNodeLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  readSpecFile: vi.fn().mockReturnValue('name: Test Feature\n'),
  shouldInterrupt: mockShouldInterrupt,
  getCompletedPhases: mockGetCompletedPhases,
  clearCompletedPhase: mockClearCompletedPhase,
  markPhaseComplete: mockMarkPhaseComplete,
  retryExecute: mockRetryExecute,
  buildExecutorOptions: vi.fn().mockReturnValue({ cwd: '/tmp/worktree', maxTurns: 50 }),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/heartbeat.js', () => ({
  reportNodeStart: vi.fn(),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/phase-timing-context.js', () => ({
  recordPhaseStart: mockRecordPhaseStart,
  recordPhaseEnd: mockRecordPhaseEnd,
  recordApprovalWaitStart: mockRecordApprovalWaitStart,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/lifecycle-context.js', () => ({
  updateNodeLifecycle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/prompts/merge-prompts.js', () => ({
  buildCommitPushPrPrompt: mockBuildCommitPushPrPrompt,
  buildMergeSquashPrompt: mockBuildMergeSquashPrompt,
  buildCiWatchFixPrompt: mockBuildCiWatchFixPrompt,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/prompts/evidence-prompts.js', () => ({
  buildEvidencePrompt: mockBuildEvidencePrompt,
}));

vi.mock(
  '@/infrastructure/services/agents/feature-agent/nodes/merge/merge-output-parser.js',
  () => ({
    parseCommitHash: mockParseCommitHash,
    parsePrUrl: mockParsePrUrl,
  })
);

vi.mock('@/infrastructure/services/settings.service.js', () => ({
  getSettings: mockGetSettings,
}));

// ---- Imports after mocks ----
import {
  createMergeNode,
  type MergeNodeDeps,
} from '@/infrastructure/services/agents/feature-agent/nodes/merge/merge.node.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import { EvidenceStatus } from '@/domain/generated/output.js';

// ---- Test helpers ----

const SAMPLE_RUN_URL = 'https://github.com/org/repo/actions/runs/12345';

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

function createMockGitPrService(overrides: Partial<IGitPrService> = {}): IGitPrService {
  return {
    getCiStatus: vi.fn().mockResolvedValue({ status: 'success', runUrl: SAMPLE_RUN_URL }),
    watchCi: vi.fn().mockResolvedValue({ status: 'success' }),
    getFailureLogs: vi
      .fn()
      .mockResolvedValue('Error: Tests failed at line 42\nExpected: true, got: false'),
    hasRemote: vi.fn().mockResolvedValue(true),
    getDefaultBranch: vi.fn().mockResolvedValue('main'),
    hasUncommittedChanges: vi.fn().mockResolvedValue(false),
    commitAll: vi.fn().mockResolvedValue('abc123'),
    push: vi.fn().mockResolvedValue(undefined),
    createPr: vi.fn().mockResolvedValue({ url: '', number: 0 }),
    mergePr: vi.fn().mockResolvedValue(undefined),
    mergeBranch: vi.fn().mockResolvedValue(undefined),
    deleteBranch: vi.fn().mockResolvedValue(undefined),
    getPrDiffSummary: vi
      .fn()
      .mockResolvedValue({ filesChanged: 1, additions: 5, deletions: 2, commitCount: 1 }),
    verifyMerge: vi.fn().mockResolvedValue(true),
    ...overrides,
  } as IGitPrService;
}

function baseDeps(overrides?: Partial<MergeNodeDeps>): MergeNodeDeps {
  return {
    executor: createMockExecutor(),
    getDiffSummary: vi
      .fn()
      .mockResolvedValue({ filesChanged: 5, additions: 100, deletions: 20, commitCount: 3 }),
    hasRemote: vi.fn().mockResolvedValue(true),
    getDefaultBranch: vi.fn().mockResolvedValue('main'),
    featureRepository: createMockFeatureRepo(),
    verifyMerge: vi.fn().mockResolvedValue(true),
    gitPrService: createMockGitPrService(),
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
    ciFixAttempts: 0,
    ciFixHistory: [],
    ciFixStatus: 'idle',
    evidenceStatus: EvidenceStatus.Skipped,
    evidenceArtifacts: [],
    ...overrides,
  } as FeatureAgentState;
}

// ---- Tests ----

describe('createMergeNode — evidence collection phase', () => {
  let deps: MergeNodeDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCompletedPhases.mockReturnValue([]);
    mockShouldInterrupt.mockReturnValue(false);
    mockGetSettings.mockReturnValue({
      workflow: { ciMaxFixAttempts: 3, ciWatchTimeoutMs: 600_000, ciLogMaxChars: 50_000 },
    });
    mockBuildEvidencePrompt.mockReturnValue('evidence prompt');
    mockRetryExecute.mockImplementation(
      async (executor: { execute: (p: string) => Promise<unknown> }, prompt: string) =>
        executor.execute(prompt)
    );
    deps = baseDeps();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Evidence runs after PR creation, before CI watch
  // ────────────────────────────────────────────────────────────────────────────

  describe('evidence runs after PR creation, before CI watch', () => {
    it('should call buildEvidencePrompt when openPr=true and prNumber is available', async () => {
      const node = createMergeNode(deps);
      await node(baseState({ openPr: true }));

      expect(mockBuildEvidencePrompt).toHaveBeenCalled();
    });

    it('should call retryExecute with evidence prompt and maxTurns=5', async () => {
      const node = createMergeNode(deps);
      await node(baseState({ openPr: true }));

      // Find the retryExecute call that used the evidence prompt
      const evidenceCalls = mockRetryExecute.mock.calls.filter(
        (call: unknown[]) => call[1] === 'evidence prompt'
      );
      expect(evidenceCalls).toHaveLength(1);
      // Verify maxTurns override to 5
      expect(evidenceCalls[0][2]).toEqual(expect.objectContaining({ maxTurns: 5 }));
    });

    it('should call buildEvidencePrompt with correct parameters', async () => {
      const node = createMergeNode(deps);
      await node(baseState({ openPr: true }));

      expect(mockBuildEvidencePrompt).toHaveBeenCalledWith(
        expect.objectContaining({ featureId: 'feat-001' }), // state
        42, // prNumber (from mockParsePrUrl)
        'https://github.com/test/repo/pull/42', // prUrl (from mockParsePrUrl)
        null, // ciStatus (not yet known — evidence runs before CI watch)
        [], // ciFixHistory (empty — evidence runs before CI watch)
        'feat/test' // branch (from feature record)
      );
    });

    it('should run evidence BEFORE CI watch/fix loop', async () => {
      const callOrder: string[] = [];

      mockRetryExecute.mockImplementation(
        async (executor: { execute: (p: string) => Promise<unknown> }, prompt: string) => {
          if (prompt === 'evidence prompt') {
            callOrder.push('evidence');
          } else if (prompt === 'commit-push-pr prompt') {
            callOrder.push('commit-push-pr');
          }
          return executor.execute(prompt);
        }
      );

      // Make CI watch observable
      deps.gitPrService.getCiStatus = vi.fn().mockImplementation(async () => {
        callOrder.push('ci-watch');
        return { status: 'success', runUrl: SAMPLE_RUN_URL };
      });

      const node = createMergeNode(deps);
      await node(baseState({ openPr: true }));

      const evidenceIdx = callOrder.indexOf('evidence');
      const ciWatchIdx = callOrder.indexOf('ci-watch');

      expect(evidenceIdx).toBeGreaterThan(-1);
      expect(ciWatchIdx).toBeGreaterThan(-1);
      expect(evidenceIdx).toBeLessThan(ciWatchIdx);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Evidence skipped conditions
  // ────────────────────────────────────────────────────────────────────────────

  describe('evidence skipped when not applicable', () => {
    it('should NOT call buildEvidencePrompt when openPr=false', async () => {
      const node = createMergeNode(deps);
      await node(baseState({ openPr: false }));

      expect(mockBuildEvidencePrompt).not.toHaveBeenCalled();
    });

    it('should set evidenceStatus to Skipped when openPr=false', async () => {
      const node = createMergeNode(deps);
      const result = await node(baseState({ openPr: false }));

      expect(result.evidenceStatus).toBe(EvidenceStatus.Skipped);
    });

    it('should NOT call buildEvidencePrompt when prNumber is null (PR creation failed)', async () => {
      mockParsePrUrl.mockReturnValueOnce(null);
      const node = createMergeNode(deps);
      await node(baseState({ openPr: true }));

      expect(mockBuildEvidencePrompt).not.toHaveBeenCalled();
    });

    it('should set evidenceStatus to Skipped when prNumber is null', async () => {
      mockParsePrUrl.mockReturnValueOnce(null);
      const node = createMergeNode(deps);
      const result = await node(baseState({ openPr: true }));

      expect(result.evidenceStatus).toBe(EvidenceStatus.Skipped);
    });

    it('should NOT run evidence on resume after interrupt', async () => {
      mockGetCompletedPhases.mockReturnValue(['merge']);
      mockShouldInterrupt.mockReturnValue(true);

      const node = createMergeNode(deps);
      await node(baseState({ openPr: true }));

      expect(mockBuildEvidencePrompt).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Graceful degradation on failure
  // ────────────────────────────────────────────────────────────────────────────

  describe('graceful degradation on evidence failure', () => {
    it('should set evidenceStatus to Failed when agent executor throws', async () => {
      mockRetryExecute.mockImplementation(async (_executor: unknown, prompt: string) => {
        if (prompt === 'evidence prompt') {
          throw new Error('Agent execution failed');
        }
        return (_executor as { execute: (p: string) => Promise<unknown> }).execute(prompt);
      });

      const node = createMergeNode(deps);
      const result = await node(baseState({ openPr: true }));

      expect(result.evidenceStatus).toBe(EvidenceStatus.Failed);
    });

    it('should continue to CI watch after evidence failure', async () => {
      mockRetryExecute.mockImplementation(async (_executor: unknown, prompt: string) => {
        if (prompt === 'evidence prompt') {
          throw new Error('Agent execution failed');
        }
        return (_executor as { execute: (p: string) => Promise<unknown> }).execute(prompt);
      });

      const node = createMergeNode(deps);
      await node(baseState({ openPr: true }));

      // CI watch should still run despite evidence failure
      expect(deps.gitPrService.getCiStatus).toHaveBeenCalled();
    });

    it('should log warning message when evidence fails', async () => {
      mockRetryExecute.mockImplementation(async (_executor: unknown, prompt: string) => {
        if (prompt === 'evidence prompt') {
          throw new Error('Agent execution failed');
        }
        return (_executor as { execute: (p: string) => Promise<unknown> }).execute(prompt);
      });

      const node = createMergeNode(deps);
      const result = await node(baseState({ openPr: true }));

      // Should have a message about evidence failure
      expect(result.messages).toEqual(
        expect.arrayContaining([expect.stringMatching(/evidence.*fail/i)])
      );
    });

    it('should NOT throw when evidence fails', async () => {
      mockRetryExecute.mockImplementation(async (_executor: unknown, prompt: string) => {
        if (prompt === 'evidence prompt') {
          throw new Error('Agent execution failed');
        }
        return (_executor as { execute: (p: string) => Promise<unknown> }).execute(prompt);
      });

      const node = createMergeNode(deps);
      // Should not throw
      await expect(node(baseState({ openPr: true }))).resolves.toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Evidence success
  // ────────────────────────────────────────────────────────────────────────────

  describe('evidence success', () => {
    it('should set evidenceStatus to Success on successful evidence collection', async () => {
      const node = createMergeNode(deps);
      const result = await node(baseState({ openPr: true }));

      expect(result.evidenceStatus).toBe(EvidenceStatus.Success);
    });

    it('should include evidence success message in messages', async () => {
      const node = createMergeNode(deps);
      const result = await node(baseState({ openPr: true }));

      expect(result.messages).toEqual(expect.arrayContaining([expect.stringMatching(/evidence/i)]));
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Evidence in interrupt payload
  // ────────────────────────────────────────────────────────────────────────────

  describe('evidenceStatus in interrupt payload', () => {
    it('should include evidenceStatus in the interrupt payload', async () => {
      mockShouldInterrupt.mockReturnValue(true);

      const node = createMergeNode(deps);
      await node(baseState({ openPr: true }));

      expect(mockInterrupt).toHaveBeenCalledWith(
        expect.objectContaining({
          evidenceStatus: EvidenceStatus.Success,
        })
      );
    });

    it('should include evidenceArtifacts in the interrupt payload', async () => {
      mockShouldInterrupt.mockReturnValue(true);

      const node = createMergeNode(deps);
      await node(baseState({ openPr: true }));

      expect(mockInterrupt).toHaveBeenCalledWith(
        expect.objectContaining({
          evidenceArtifacts: expect.any(Array),
        })
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Evidence in return state
  // ────────────────────────────────────────────────────────────────────────────

  describe('evidenceStatus and evidenceArtifacts in return state', () => {
    it('should include evidenceStatus in the return state', async () => {
      const node = createMergeNode(deps);
      const result = await node(baseState({ openPr: true }));

      expect(result).toHaveProperty('evidenceStatus');
      expect(result.evidenceStatus).toBe(EvidenceStatus.Success);
    });

    it('should include evidenceArtifacts in the return state', async () => {
      const node = createMergeNode(deps);
      const result = await node(baseState({ openPr: true }));

      expect(result).toHaveProperty('evidenceArtifacts');
      expect(result.evidenceArtifacts).toEqual(expect.any(Array));
    });

    it('should include evidenceStatus=Skipped in return state when openPr=false', async () => {
      const node = createMergeNode(deps);
      const result = await node(baseState({ openPr: false }));

      expect(result.evidenceStatus).toBe(EvidenceStatus.Skipped);
    });

    it('should include evidenceStatus=Failed in return state on failure', async () => {
      mockRetryExecute.mockImplementation(async (_executor: unknown, prompt: string) => {
        if (prompt === 'evidence prompt') {
          throw new Error('Evidence failed');
        }
        return (_executor as { execute: (p: string) => Promise<unknown> }).execute(prompt);
      });

      const node = createMergeNode(deps);
      const result = await node(baseState({ openPr: true }));

      expect(result.evidenceStatus).toBe(EvidenceStatus.Failed);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Task 8: Feature record persistence and restore on resume
  // ────────────────────────────────────────────────────────────────────────────

  describe('evidenceStatus persistence in feature record (task-8)', () => {
    it('should persist evidenceStatus in feature record update before approval gate', async () => {
      mockShouldInterrupt.mockReturnValue(true);

      const node = createMergeNode(deps);
      await node(baseState({ openPr: true }));

      // featureRepository.update should have been called with evidenceStatus
      expect(deps.featureRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          evidenceStatus: EvidenceStatus.Success,
        })
      );
    });

    it('should persist evidenceStatus=Failed when evidence collection fails', async () => {
      mockShouldInterrupt.mockReturnValue(true);
      mockRetryExecute.mockImplementation(async (_executor: unknown, prompt: string) => {
        if (prompt === 'evidence prompt') {
          throw new Error('Evidence failed');
        }
        return (_executor as { execute: (p: string) => Promise<unknown> }).execute(prompt);
      });

      const node = createMergeNode(deps);
      await node(baseState({ openPr: true }));

      expect(deps.featureRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          evidenceStatus: EvidenceStatus.Failed,
        })
      );
    });

    it('should not fail when evidenceStatus is default Skipped', async () => {
      const node = createMergeNode(deps);
      // openPr=false means evidence is skipped, evidenceStatus stays Skipped
      const result = await node(baseState({ openPr: false }));

      // Should complete successfully without errors
      expect(result.currentNode).toBe('merge');
      expect(result.evidenceStatus).toBe(EvidenceStatus.Skipped);
    });

    it('should restore evidenceStatus from feature record on resume after interrupt', async () => {
      mockGetCompletedPhases.mockReturnValue(['merge']);
      mockShouldInterrupt.mockReturnValue(true);

      // Simulate feature record with evidenceStatus persisted
      (deps.featureRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'feat-001',
        lifecycle: 'Implementation',
        branch: 'feat/test',
        pr: {
          url: 'https://github.com/test/repo/pull/42',
          number: 42,
          commitHash: 'abc1234',
          ciStatus: 'Success',
        },
        evidenceStatus: EvidenceStatus.Success,
      });

      const node = createMergeNode(deps);
      const result = await node(baseState({ openPr: true }));

      expect(result.evidenceStatus).toBe(EvidenceStatus.Success);
    });
  });
});
